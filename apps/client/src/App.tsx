import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';

// Types mirrored from server
interface Vector3 { x: number; y: number; z: number; }
interface PlayerInput { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean; yaw?: number; }
interface PlayerState { id: string; name: string; position: Vector3; velocity: Vector3; rotation: Vector3; timestamp: number; }
interface Collider { type: 'box'|'sphere'|'mesh'; position: Vector3; rotation: Vector3; scale: Vector3; }
interface Chunk { index: number; seed: string; palette: string[]; skyboxUrl?: string; appliedPromptId?: string; physics: { colliders: Collider[]; spawnPoints: Vector3[]; checkpoints: Vector3[] } }

const SERVER_URL = 'http://localhost:3001';

function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [chunks, setChunks] = useState<Chunk[]>([]);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // optional
    });

    socket.on('world_init', (payload: { apiVersion: 'v1'; playerId: string; players: PlayerState[]; worldSeed?: string; chunks?: Chunk[] }) => {
      setPlayerId(payload.playerId);
      setPlayers(payload.players);
      if (payload.chunks) setChunks(payload.chunks);
    });
    socket.on('chunk_add', (payload: { apiVersion: 'v1'; chunks: Chunk[]; promptId: string }) => {
      setChunks(prev => {
        const byIndex = new Map(prev.map(c => [c.index, c] as const));
        for (const c of payload.chunks) byIndex.set(c.index, c);
        return Array.from(byIndex.values()).sort((a,b) => a.index - b.index);
      });
    });

    socket.on('prompt_ack', (payload: { apiVersion: 'v1'; promptId: string; accepted: boolean; estimatedChunks: number }) => {
      // no-op UI here; we show a small banner below
    });

    socket.on('state', (payload: { apiVersion: 'v1'; players: PlayerState[]; timestamp: number }) => {
      setPlayers(payload.players);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef, playerId, players, chunks };
}

function useInputSender(socketRef: React.MutableRefObject<Socket | null>, yawRef: React.MutableRefObject<number>) {
  const inputRef = useRef<PlayerInput>({ forward: false, backward: false, left: false, right: false, jump: false, sprint: false });

  useEffect(() => {
    function onKey(e: KeyboardEvent, isDown: boolean) {
      if (e.code === 'Space') e.preventDefault();
      switch (e.code) {
        case 'KeyW': inputRef.current.forward = isDown; break;
        case 'KeyS': inputRef.current.backward = isDown; break;
        case 'KeyA': inputRef.current.left = isDown; break;
        case 'KeyD': inputRef.current.right = isDown; break;
        case 'Space': inputRef.current.jump = isDown; break;
        case 'ShiftLeft': inputRef.current.sprint = isDown; break;
      }
    }
    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down as any);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        const payload = { ...inputRef.current, yaw: yawRef.current };
        socket.emit('input', payload);
      }
    }, 66); // ~15 Hz
    return () => clearInterval(id);
  }, [socketRef]);
}

function Player({ state, color = 'orange' }: { state: PlayerState; color?: string }) {
  const ref = useRef<any>();
  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.set(state.position.x, state.position.y, state.position.z);
  });
  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.6, 1.8, 0.6]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function Ground() {
  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#555" />
    </mesh>
  );
}

function ChunkMeshes({ chunks }: { chunks: Chunk[] }) {
  return (
    <group>
      {chunks.flatMap(chunk =>
        chunk.physics.colliders.map((col, i) => (
          <mesh key={`${chunk.index}:${i}`} position={[col.position.x, col.position.y + col.scale.y/2, col.position.z]} castShadow receiveShadow>
            <boxGeometry args={[col.scale.x, col.scale.y, col.scale.z]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        ))
      )}
    </group>
  );
}

function FirstPersonRig({ me, yawRef }: { me?: PlayerState; yawRef: React.MutableRefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!me) return;
    camera.position.set(me.position.x, me.position.y + 0.9, me.position.z);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    // Flatten to XZ plane and compute yaw
    yawRef.current = Math.atan2(dir.x, dir.z);
  });
  return null;
}

export default function App() {
  const { socket, playerId, players, chunks } = useSocket();
  const yawRef = useRef(0);
  useInputSender(socket, yawRef);

  const me = players.find(p => p.id === playerId);

  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [lastResp, setLastResp] = useState<any>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !promptOpen) {
        e.preventDefault();
        setPromptOpen(true);
        setPromptText('');
      } else if (e.key === 'Escape' && promptOpen) {
        setPromptOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promptOpen]);

  async function submitPrompt() {
    // Minimal entry connector at origin forward
    const entry = { face: 'south', position: { x: 0, y: 1, z: 0 }, clearance: 1.5, type: 'flat' };
    const worldSeed = 'local-dev-seed-001';
    const chunkIndex = 0;
    const body = { prompt: promptText, worldSeed, chunkIndex, entry };
    try {
      const res = await fetch('http://localhost:3001/generate-next-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setLastResp(json);
      // Also tell the socket server to schedule future chunks
      const s = socket.current;
      if (s && s.connected) s.emit('prompt', promptText);
      setPromptOpen(false);
    } catch (e) {
      setLastResp({ error: String(e) });
      setPromptOpen(false);
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
  <Canvas shadows camera={{ position: [0, 1.6, 0.01], fov: 75 }}>
        <ambientLight intensity={0.4} />
        <directionalLight castShadow position={[10, 15, 10]} intensity={0.9} />
        <Ground />
        <ChunkMeshes chunks={chunks} />
        {players.filter(p => p.id !== playerId).map(p => (
          <Player key={p.id} state={p} color={'orange'} />
        ))}
        <FirstPersonRig me={me} yawRef={yawRef} />
        <PointerLockControls />
      </Canvas>
      <div style={{ position: 'absolute', top: 12, left: 12, color: '#fff', fontFamily: 'monospace' }}>
        <div>Connected: {playerId ? 'yes' : 'no'}</div>
        <div>Players: {players.length}</div>
        <div>Controls: WASD to move, Space to jump, Shift to sprint, '/' to prompt</div>
        {/* Build plan panel removed for cleaner HUD */}
      </div>
      {promptOpen && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 560, background: '#111', border: '1px solid #555', borderRadius: 8, padding: 16, color: '#fff', fontFamily: 'monospace' }}>
            <div style={{ marginBottom: 8, fontWeight: 700 }}>Enter Prompt</div>
            <input
              autoFocus
              value={promptText}
              onChange={e => setPromptText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitPrompt(); }}
              placeholder="e.g. school setting, medium difficulty, more rails"
              style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #666', background: '#1a1a1a', color: '#fff' }}
            />
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button onClick={submitPrompt} style={{ padding: '8px 12px' }}>Submit</button>
              <button onClick={() => setPromptOpen(false)} style={{ padding: '8px 12px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
