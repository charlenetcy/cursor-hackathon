import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { ChunkBundle, ConnectorSpec, GenerateNextChunkRequest, GenerateNextChunkResponse } from '../../../shared/src/types';
import { GENERATION_CONFIG } from '../../../shared/src/constants';
import { ChunkStreamer } from './generator/ChunkWindowManager';
import { TowerGenerator } from './generator/TowerGenerator';
import PromptService from './services/PromptService';
import ChunkCompiler from './generator/ChunkCompiler';
import { Server } from 'socket.io';

// Types
interface Vector3 { x: number; y: number; z: number; }
interface PlayerInput { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean; yaw?: number; }
interface PlayerState { id: string; name: string; position: Vector3; velocity: Vector3; rotation: Vector3; timestamp: number; }

// Config
const TICK_RATE = 20; // Hz
const DT = 1 / TICK_RATE; // seconds
const PORT = 3001;
const PLAYER_SPEED = 6; // u/s
const PLAYER_JUMP = 8; // u/s
const GRAVITY = -20; // u/s^2

// Server setup
const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://localhost:3000' } });

// World state
const playerIdToState = new Map<string, PlayerState>();
const playerIdToInput = new Map<string, PlayerInput>();

// Chunk streaming state
const WORLD_SEED = process.env.WORLD_SEED || 'local-dev-world';
const CHUNK_SIZE = 10;
const streamer = new ChunkStreamer(CHUNK_SIZE);

function spawnPosition(): Vector3 {
  return { x: (Math.random() - 0.5) * 4, y: 1.2, z: 0 };
}

function createPlayer(id: string, name: string): PlayerState {
  return {
    id,
    name,
    position: spawnPosition(),
    velocity: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    timestamp: Date.now(),
  };
}

io.on('connection', (socket) => {
  const playerName = `P${(Math.random() * 1000) | 0}`;
  const player = createPlayer(socket.id, playerName);
  playerIdToState.set(socket.id, player);
  playerIdToInput.set(socket.id, { forward: false, backward: false, left: false, right: false, jump: false, sprint: false });

  // Send initial
  socket.emit('world_init', {
    apiVersion: 'v1',
    playerId: socket.id,
    players: Array.from(playerIdToState.values()),
    worldSeed: WORLD_SEED,
    chunks: streamer.getChunksForRendering(),
  });

  socket.on('join', () => {
    // no-op for now; already created on connect
  });

  socket.on('input', (input: PlayerInput) => {
    playerIdToInput.set(socket.id, input);
  });

  socket.on('disconnect', () => {
    playerIdToState.delete(socket.id);
    playerIdToInput.delete(socket.id);
  });

  socket.on('prompt', async (text: string) => {
    const safe = (text && text.trim().length > 0) ? text : GENERATION_CONFIG.DEFAULT_PROMPT;
    const pid = PromptService.derivePromptId(safe);
    const state = playerIdToState.get(socket.id);
    const playerZ = state?.position.z ?? 0;
    const playerChunkIndex = Math.max(0, Math.floor(playerZ / CHUNK_SIZE));
    const targets = [playerChunkIndex + 3, playerChunkIndex + 4, playerChunkIndex + 5];

    const newChunks: any[] = [];
    for (const idx of targets) {
      const params = { worldSeed: WORLD_SEED, promptId: pid, chunkIndex: idx };
      const chunk = TowerGenerator.generateChunk(params);
      streamer.receiveChunk(chunk);
      newChunks.push(chunk);
    }

    io.emit('chunk_add', { apiVersion: 'v1', chunks: newChunks, promptId: pid });
    socket.emit('prompt_ack', { apiVersion: 'v1', promptId: pid, accepted: true, estimatedChunks: newChunks.length });
  });
});

// REST: generate next chunk deterministically
app.post('/generate-next-chunk', async (req, res) => {
  try {
    const { prompt, worldSeed, chunkIndex, entry, chunkSize } = req.body as GenerateNextChunkRequest;
    const safePrompt = (prompt && prompt.trim().length > 0) ? prompt : GENERATION_CONFIG.DEFAULT_PROMPT;
    if (!prompt || !worldSeed || typeof chunkIndex !== 'number' || !entry) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { bundle, promptId } = await ChunkCompiler.compile({ prompt: safePrompt, worldSeed, chunkIndex, entry, chunkSize });
    const response: GenerateNextChunkResponse = { bundle, promptId };
    return res.json(response);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? 'Internal error' });
  }
});

function integrate() {
  const now = Date.now();
  for (const [id, state] of playerIdToState.entries()) {
    const input = playerIdToInput.get(id);
    if (!input) continue;

    // Horizontal movement (XZ)
    let moveX = 0;
    let moveZ = 0;
    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    const len = Math.hypot(moveX, moveZ) || 1;
    moveX /= len; moveZ /= len;

    const speed = input.sprint ? PLAYER_SPEED * 1.4 : PLAYER_SPEED;
    // Move relative to view yaw
    const yaw = input.yaw ?? 0;
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const dirX = moveZ * sin + moveX * cos;
    const dirZ = moveZ * cos - moveX * sin;
    state.position.x += dirX * speed * DT;
    state.position.z += dirZ * speed * DT;

    // Gravity + jump
    state.velocity.y += GRAVITY * DT;
    state.position.y += state.velocity.y * DT;

    // Ground collision at y=0
    const onGround = state.position.y <= 0.9 + 1e-3;
    if (onGround) {
      state.position.y = 0.9;
      state.velocity.y = 0;
      if (input.jump) {
        state.velocity.y = PLAYER_JUMP;
      }
    }

    state.timestamp = now;
  }
}

function broadcastState() {
  const payload = {
    apiVersion: 'v1',
    players: Array.from(playerIdToState.values()),
    timestamp: Date.now(),
  };
  io.emit('state', payload);
}

// Game loop 20 Hz
setInterval(() => {
  integrate();
  broadcastState();
}, 1000 / TICK_RATE);

server.listen(PORT, () => {
  console.log(`[server] Socket.io listening on http://localhost:${PORT}`);
});
