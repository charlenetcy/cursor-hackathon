# CURSOR PROJECT CONTEXT

## PROJECT IDENTITY
**Name**: Prompt-Driven Multiplayer Parkour World  
**Type**: Real-time multiplayer 3D parkour game  
**Core Innovation**: Players type prompts to restyle upcoming chunks while maintaining deterministic gameplay  

## PROJECT SCOPE & GOALS

### Primary Objective
Build a multiplayer 3D parkour game where:
- Players type text prompts ("Japan," "White House," "ducks") to restyle upcoming chunks
- Core geometry remains deterministic and validated for playability
- Prompts affect only style (palette, motifs, textures, skybox) and optional mechanics/difficulty
- All changes apply to future chunks only, never existing ones

### MVP Success Criteria
- 3-player lobby with smooth physics and interpolation
- Prompt-to-restyle visible in < 2 seconds for upcoming chunks
- Deterministic tower always validated and playable
- Textures/skyboxes cached; no runtime 3D asset generation

## TECHNICAL ARCHITECTURE

### Client Stack (Frontend)
```typescript
// Required Dependencies
- Three.js: 3D rendering with instanced meshes
- Rapier WASM: Local physics simulation
- Socket.io: Client networking, interpolation, reconciliation
- Vite: Build tooling and dev server
```

### Server Stack (Backend)
```typescript
// Required Dependencies
- Node.js + TypeScript: Authoritative game loop @ 20 Hz
- Socket.io: Server networking
- Zod: Runtime validation
- Pino: Structured logging
- seedrandom: Deterministic PRNG
```

### External Services
- **Groq LLM**: Prompt parsing to JSON tags
- **Fal.ai/Meshy**: Async 2D texture/skybox generation
- **Cloudflare R2/S3**: CDN for asset caching
- **Postgres/SQLite**: Prompt logs and metrics

## CRITICAL SAFETY CONSTRAINTS

### 🚨 NON-NEGOTIABLE RULES
1. **Determinism**: All generation MUST be keyed by `(worldSeed, promptId, chunkIndex)`
2. **Future-Only**: Prompts ONLY affect future chunks (+3 to +5 ahead)
3. **No Physics Changes**: Decor NEVER introduces colliders or alters physics
4. **Identical Rebuilds**: Always derive seeds from `(worldSeed, promptId, chunkIndex)`

### Fallback Requirements
- Last-good palette fallback
- Generic skybox fallback  
- Bridge/safe chunk insertion for playability
- Active window: 7 chunks (last 2 + next 5)
- Floating origin: rebase every 10 chunks

### Error Handling Protocol
```typescript
if (generation_fails || validation_fails) {
  use_last_good_palette();
  use_generic_skybox();
  insert_safe_chunk();
  emit_metrics();
  send_correction_if_needed();
}
```

## IMPLEMENTATION FLOW

### 1. Join Phase
```typescript
// Client receives on connection
interface JoinData {
  worldSeed: string;
  currentChunkWindow: Chunk[];
  playerStates: PlayerState[];
}
```

### 2. Play Phase  
```typescript
// Client sends input at 10-20 Hz
// Server authoritative simulation
// Client predictive physics for feel
```

### 3. Prompt Phase
```typescript
// Player sends text prompt
// Server processes:
interface PromptProcessing {
  parse: (prompt: string) => PromptTags;
  derivePromptId: () => string;
  generateChunks: (seed: string) => Chunk[];
  validatePlayability: (chunks: Chunk[]) => boolean;
  triggerAssetGeneration: () => Promise<void>;
  broadcastChunkAdd: (chunks: Chunk[]) => void;
}
```

### 4. Client Processing
```typescript
// Client rebuilds chunks deterministically
// Applies new textures/skybox when ready
// Physics remain identical (no collider changes)
```

## NETWORKING PROTOCOL

### Required Events
```typescript
// Server → Client
'state': Authoritative world + players snapshot
'chunk_add': New deterministic chunks
'prompt_ack': Confirmation + promptId + timing
'corr': Corrections/reconciliation

// Client → Server  
'join': Player connection request
'input': Player input at 10-20 Hz
'prompt': Text prompt for styling
```

## DEVELOPMENT ROADMAP

### Phase 1: Foundation (Start Here)
1. **Project Structure**: Set up client/server/shared directories
2. **Deterministic Generator**: Core tower generation with `(worldSeed, promptId, chunkIndex)`
3. **Validator**: Analytic checks for jump gaps, slopes, reachable paths
4. **Basic Networking**: Socket.io client/server setup

### Phase 2: Core Systems
5. **Physics Loop**: Server authoritative @ 20Hz, client predictive
6. **Prompt Parser**: Rule-based → LLM fallback to JSON tags
7. **Style System**: Palette + texture + skybox application
8. **Chunk Pipeline**: Future-only chunk generation and broadcasting

### Phase 3: Polish & Scale
9. **Fallback System**: Comprehensive error handling
10. **Metrics**: Performance monitoring and logging
11. **Asset Pipeline**: Async texture/skybox generation
12. **Optimization**: Performance tuning and caching

## CODE PATTERNS & CONVENTIONS

### Deterministic Generation Pattern
```typescript
class TowerGenerator {
  generateChunk(worldSeed: string, promptId: string, chunkIndex: number): Chunk {
    const seed = this.hashSeeds(worldSeed, promptId, chunkIndex);
    const prng = new PRNG(seed);
    // Generate deterministic geometry
    return this.buildChunk(prng);
  }
}
```

### Validation Pattern
```typescript
class ChunkValidator {
  validatePlayability(chunk: Chunk): boolean {
    return this.checkJumpGaps(chunk) && 
           this.checkSlopes(chunk) && 
           this.checkReachablePath(chunk) &&
           this.checkGuardrails(chunk);
  }
}
```

### Prompt Processing Pattern
```typescript
interface PromptTags {
  palette: string[];
  motifs: string[];
  mechanics?: string[];
  difficulty?: number;
}

class PromptService {
  async processPrompt(prompt: string): Promise<PromptTags> {
    // Rule-based parsing first
    // Fallback to Groq LLM
    // Return normalized JSON tags
  }
}
```

## FILE STRUCTURE RECOMMENDATION
```
cursor-hackathon/
├── client/                 # Frontend (Three.js + Vite)
│   ├── src/
│   │   ├── game/          # Game logic
│   │   ├── networking/    # Socket.io client
│   │   ├── physics/       # Rapier integration
│   │   └── rendering/     # Three.js setup
├── server/                # Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── game/          # Game loop & simulation
│   │   ├── generator/     # Tower generation
│   │   ├── validator/     # Playability checks
│   │   ├── networking/    # Socket.io server
│   │   └── services/      # Prompt, assets, metrics
├── shared/                # Shared types & utilities
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # Common utilities
│   └── constants/          # Game constants
└── assets/                # Default textures, skyboxes
```

## DEBUGGING & MONITORING

### Required Metrics
- Chunk generation time
- Validator execution time  
- Prompt parsing success/failure rate
- Network latency and packet loss
- Physics simulation performance

### Logging Strategy
```typescript
// Use Pino for structured logging
logger.info('chunk_generated', { 
  chunkId, 
  generationTime, 
  promptId, 
  seed 
});
```

## PERFORMANCE TARGETS
- **Latency**: < 50ms server processing
- **Throughput**: 20 Hz authoritative updates
- **Memory**: Efficient chunk streaming (7 chunk window)
- **Network**: Minimal bandwidth for state sync
- **Rendering**: 60 FPS client-side with interpolation

---

**Remember**: Determinism and playability are non-negotiable. Every feature must preserve these core requirements.