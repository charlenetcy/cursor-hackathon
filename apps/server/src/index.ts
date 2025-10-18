import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'socket.io';

// Import prompt service routes
import promptRoutes from './routes/prompt';
import styleRoutes from './routes/style';

// Types
interface Vector3 { x: number; y: number; z: number; }
interface PlayerInput { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean; yaw?: number; }
interface PlayerState { id: string; name: string; position: Vector3; velocity: Vector3; rotation: Vector3; timestamp: number; }
interface Platform { id: string; position: Vector3; isSpecial?: boolean; }
interface ClientState { position: Vector3; yaw: number; }

// Config
const TICK_RATE = 10; // Hz (broadcast cadence)
const DT = 0; // no server-side physics for client-driven mode
const PORT = Number(process.env.PORT || 3001);
// Platform generation config (mirrors client logic in App.jsx)
const PLATFORM_CHUNK_SIZE = 4;
const PLATFORM_SPACING = -7; // grow towards -X
const GENERATION_DISTANCE = 50;

// Server setup
const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// Add prompt service routes
app.use('/prompt', promptRoutes);
app.use('/style', styleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    services: {
      game: 'running',
      promptService: 'integrated'
    }
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// World state
const playerIdToState = new Map<string, PlayerState>();
const playerIdToInput = new Map<string, PlayerInput>();

// Platform streaming state
const WORLD_SEED = process.env.WORLD_SEED || 'local-dev-world';
let lastGeneratedX = 0;
const platforms: Platform[] = [];

function createPlatform(x: number, y: number, z: number, isSpecial = false): Platform {
  const id = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
  const p: Platform = { id, position: { x, y, z }, isSpecial };
  platforms.push(p);
  return p;
}

function generateChunk(startX: number, isFirstChunk = false): Platform[] {
  const created: Platform[] = [];
  for (let i = 0; i < PLATFORM_CHUNK_SIZE; i++) {
    const x = startX + (i * PLATFORM_SPACING);
    let y: number;
    let z: number;
    if (isFirstChunk && i === 0) {
      y = 0; // spawn platform
      z = 0;
    } else {
      const heightWave = Math.sin(x * 0.1) * 2.5;
      const randomHeight = (Math.random() - 0.5) * 1.2;
      y = heightWave + randomHeight;

      const zWave = Math.sin(x * 0.15) * 3.5;
      const randomZ = (Math.random() - 0.5) * 2.5;
      z = zWave + randomZ;
    }
    const isSpecial = Math.floor(x / PLATFORM_SPACING) % 20 === 0 && x > 0;
    created.push(createPlatform(x, y, z, isSpecial));
  }
  lastGeneratedX = startX + (PLATFORM_CHUNK_SIZE * PLATFORM_SPACING);
  return created;
}

function initializeWorld() {
  // three initial chunks similar to client
  generateChunk(0, true);
  const secondStart = lastGeneratedX;
  generateChunk(secondStart);
  const thirdStart = lastGeneratedX;
  generateChunk(thirdStart);
}

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
    platforms,
  });

  socket.on('join', () => {
    // no-op for now; already created on connect
  });

  socket.on('input', (input: PlayerInput) => {
    // optional legacy input channel
    playerIdToInput.set(socket.id, input);
  });

  // Client sends authoritative transform (position + yaw)
  socket.on('client_state', (state: ClientState) => {
    const player = playerIdToState.get(socket.id);
    if (player) {
      player.position = { ...state.position };
      player.rotation = { x: 0, y: state.yaw, z: 0 };
      player.timestamp = Date.now();
    }

    // Generate more platforms ahead when needed
    if (state.position.x < lastGeneratedX + GENERATION_DISTANCE) {
      const newPlatforms = generateChunk(lastGeneratedX);
      if (newPlatforms.length) {
        io.emit('platforms_add', { apiVersion: 'v1', platforms: newPlatforms });
      }
    }
  });

  socket.on('disconnect', () => {
    playerIdToState.delete(socket.id);
    playerIdToInput.delete(socket.id);
  });

  // Prompt handler unused in platform mode
});

// No REST endpoints needed for platform mode

function integrate() {
  // No-op in client-authoritative position mode; timestamps are updated in client_state handler
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

initializeWorld();

server.listen(PORT, () => {
  console.log(`╔══════════════════════════════════════════════════════════════╗`);
  console.log(`║  🚀 Unified Game Server + Prompt Service                     ║`);
  console.log(`╚══════════════════════════════════════════════════════════════╝`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🎮 Socket.IO: Game server active`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(``);
  console.log(`📋 Prompt Service Endpoints:`);
  console.log(`   POST   /prompt/parse          - Parse text prompts with Groq AI`);
  console.log(`   GET    /style/byPromptId/:id  - Generate & retrieve style assets`);
  console.log(``);
  console.log(`🔌 Integrations:`);
  console.log(`   ✅ Groq AI (LLM parsing)`);
  console.log(`   ✅ Fal.ai (Image generation)`);
  console.log(`   ✅ Supabase (Asset storage)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
});
