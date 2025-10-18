// Shared Types - WebSocket Events
export interface WebSocketEvent {
  apiVersion: 'v1';
}

export interface JoinEvent extends WebSocketEvent {
  type: 'join';
  playerId: string;
  playerName: string;
}

export interface WorldInitEvent extends WebSocketEvent {
  type: 'world_init';
  worldSeed: string;
  chunks: Chunk[];
  players: PlayerState[];
}

export interface InputEvent extends WebSocketEvent {
  type: 'input';
  playerId: string;
  input: PlayerInput;
  timestamp: number;
}

export interface StateEvent extends WebSocketEvent {
  type: 'state';
  players: PlayerState[];
  timestamp: number;
}

export interface PromptEvent extends WebSocketEvent {
  type: 'prompt';
  playerId: string;
  text: string;
  timestamp: number;
}

export interface PromptAckEvent extends WebSocketEvent {
  type: 'prompt_ack';
  promptId: string;
  accepted: boolean;
  message?: string;
  estimatedChunks: number;
}

export interface ChunkAddEvent extends WebSocketEvent {
  type: 'chunk_add';
  chunks: Chunk[];
  promptId: string;
}

export interface CorrectionEvent extends WebSocketEvent {
  type: 'corr';
  playerId: string;
  position: Vector3;
  velocity: Vector3;
}

export interface ErrorEvent extends WebSocketEvent {
  type: 'error';
  code: string;
  message: string;
  playerId?: string;
}

// Game Types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  name: string;
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  timestamp: number;
}

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

export interface Chunk {
  index: number;
  seed: string;
  structureClass: string;
  palette: string[];
  skyboxUrl?: string;
  appliedPromptId?: string;
  geometry: ChunkGeometry;
  physics: ChunkPhysics;
}

export interface ChunkGeometry {
  vertices: number[];
  faces: number[];
  normals: number[];
  uvs: number[];
}

export interface ChunkPhysics {
  colliders: Collider[];
  spawnPoints: Vector3[];
  checkpoints: Vector3[];
}

export interface Collider {
  type: 'box' | 'sphere' | 'mesh';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  vertices?: number[];
  faces?: number[];
}

// Style Service Types
export interface PromptParseRequest {
  text: string;
}

export interface PromptParseResponse {
  promptId: string;
  palette: string[];
  motifs: string[];
  mechanics: string[];
  difficulty: number;
}

export interface StyleRequest {
  promptId: string;
}

export interface StyleResponse {
  promptId: string;
  palette: string[];
  skyboxUrl: string;
  textureIds: string[];
  motifIds: string[];
  version: string;
}

// Generator Types
export interface GenerationParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
