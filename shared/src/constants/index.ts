// Game Constants
export const GAME_CONFIG = {
  TICK_RATE: 20, // Hz
  CHUNK_SIZE: 10, // units
  MAX_JUMP_DISTANCE: 3, // units
  MAX_SLOPE_ANGLE: 45, // degrees
  CHUNK_WINDOW_SIZE: 7, // last 2 + next 5
  FLOATING_ORIGIN_REBASE: 10, // chunks
  PLAYER_SPEED: 5, // units/second
  PLAYER_JUMP_FORCE: 8, // units/second
} as const;

export const NETWORK_CONFIG = {
  SERVER_PORT: 3001,
  CLIENT_PORT: 3000,
  STYLE_SERVICE_PORT: 3002,
  MAX_PLAYERS: 10,
  INPUT_BUFFER_SIZE: 3,
  INTERPOLATION_DELAY: 100, // ms
} as const;

export const GENERATION_CONFIG = {
  DEFAULT_PALETTE: ['#f5f5f5', '#2e7d32', '#263238'],
  DEFAULT_SKYBOX_URL: 'https://cdn.example.com/default-skybox.eq',
  FALLBACK_TEXTURE_ID: 'tx_default_001',
  MAX_CHUNKS_PER_PROMPT: 5,
  MIN_CHUNKS_PER_PROMPT: 3,
  DEFAULT_PROMPT: 'balanced difficulty rooftop course, medium ramps, some stairs',
} as const;

export const VALIDATION_CONFIG = {
  MIN_PLATFORM_SIZE: 1, // units
  MAX_PLATFORM_SIZE: 8, // units
  MIN_GAP_SIZE: 0.5, // units
  MAX_GAP_SIZE: 3, // units
  REQUIRED_GUARDRAIL_HEIGHT: 1, // units
  SPAWN_POINT_CLEARANCE: 2, // units radius
} as const;
