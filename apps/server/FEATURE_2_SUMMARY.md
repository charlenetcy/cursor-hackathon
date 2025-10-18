## Feature: Prompt-Driven Parkour Chunk Generator

### Goal
Users type a prompt (e.g. "school setting, medium difficulty, more rails") to generate the next deterministic, solvable parkour chunk. The prompt affects theme and primitive mix, but the executor preserves playability.

### Contracts
- IntentSpec → theme + difficulty knobs
- BuildPlan DSL → textual description of placed primitives
- ConnectorSpec → entry/exit seam for chaining
- ChunkBundle → { intent, buildPlan, layout, solution, entry, exit, style, textureJobs }

### API
POST /generate-next-chunk
Body: { prompt, worldSeed, chunkIndex, entry }
Resp: { promptId, bundle }

Deterministic by (worldSeed, promptId, chunkIndex).

### Implementation Notes
- Parsing via `PromptService` with rule-based extraction and deterministic `promptId` (sha256 of normalized prompt).
- Geometry via existing `TowerGenerator`; validation via `ChunkValidator`.
- `ChunkCompiler` stitches the Bundle, sets connectors, and assembles ready texture jobs (preset/hashed). It can optionally call Gemini to generate a richer BuildPlan when enabled.
- Physics are unchanged by styling; only visuals and primitive weights shift.

### Acceptance
- Chunks connect cleanly with provided entry/exit.
- ≥99% solvable; auto repair flagged as `repaired` when validator suggests.
- Prompt shifts style and primitive distribution.
- Returns fast using preset/cached textures.

### Optional Gemini BuildPlan
- Enable with env: `USE_GEMINI_BUILDPLAN=1` and `GEMINI_API_KEY=...` (and optional `GEMINI_MODEL`).
- Falls back to local deterministic plan when disabled or missing key.

### Defaults
- Default prompt: configured via `shared/src/constants` → `GENERATION_CONFIG.DEFAULT_PROMPT`.
- If request `prompt` is empty, the default is used for both local and Gemini flows.
- You may override the Gemini system prompt with `GEMINI_SYSTEM_PROMPT` in `.env`.

# 🏗️ Feature 2: Basic Tower Generator - COMPLETED ✅

## Overview

Implemented a **deterministic tower chunk generator** that creates playable 3D parkour levels using the seed system from Feature 1. Each chunk is procedurally generated with platforms, physics colliders, spawn points, and visual styling.

## 🎯 Key Components

### 1. **Geometry Primitives** (`GeometryPrimitives`)
Fundamental 3D shapes used to build chunks:
- **Box Geometry**: Standard platforms and obstacles
- **Ramp Geometry**: Inclined platforms for skill-based movement
- **Wall Geometry**: Obstacles and decorative elements
- **Normal Generation**: Per-face lighting calculations
- **UV Generation**: Texture coordinate mapping

### 2. **Platform Generator** (`PlatformGenerator`)
Factory for creating various platform types:
- **Flat Platforms** (difficulty: 0.1) - Easy, straightforward
- **Stairs Platforms** (difficulty: 0.3) - Increased challenge
- **Ramp Platforms** (difficulty: 0.5) - Skill-based navigation
- **Wall Platforms** (difficulty: 0.7) - Obstacles to overcome

Each platform includes:
- Position (x, y, z coordinates)
- Size (width, height, depth)
- Type classification
- Difficulty rating

### 3. **Tower Generator** (`TowerGenerator`)
Core chunk generation engine that:
- Takes `GenerationParams` (worldSeed, promptId, chunkIndex)
- Creates deterministic platform layouts
- Generates 3D mesh geometry
- Produces physics colliders
- Creates spawn and checkpoint positions
- Assigns color palettes
- Sets skybox URLs

## 📊 What Gets Generated

### Per Chunk:
- **3-6 platforms** (deterministically selected)
- **Full mesh geometry** with vertices, faces, normals, UVs
- **Physics colliders** for all platforms
- **Spawn points** at first platform
- **Checkpoints** every other platform
- **Color palette** (5 different themes)
- **Skybox URL** (4 rotation options)

### Example Chunk Output:
```typescript
{
  index: 0,
  seed: "a95d7a807e5fd8...", // SHA-256 hash
  structureClass: "tower",
  palette: ["#f5f5f5", "#2e7d32", "#263238"],
  skyboxUrl: "https://cdn.example.com/skybox-blue.eq",
  appliedPromptId: "phash_japan",
  geometry: {
    vertices: [x1, y1, z1, x2, y2, z2, ...],
    faces: [0, 1, 2, 0, 2, 3, ...],
    normals: [nx1, ny1, nz1, ...],
    uvs: [u1, v1, u2, v2, ...]
  },
  physics: {
    colliders: [{type: 'box', position, rotation, scale}, ...],
    spawnPoints: [{x, y, z}, ...],
    checkpoints: [{x, y, z}, ...]
  }
}
```

## ✅ Testing Results

### Test Suite: **45 tests total**
- **18 tests** - Seed System (Feature 1)
- **27 tests** - Tower Generator (Feature 2)

### Coverage:
- ✅ GeometryPrimitives (5 tests)
  - Box, Ramp, Wall geometry creation
  - Normal and UV generation
  - Vertex count validation

- ✅ PlatformGenerator (5 tests)
  - All platform types
  - Custom difficulty levels
  - Proper sizing

- ✅ TowerGenerator (17 tests)
  - Chunk structure validation
  - Geometry data generation
  - Physics data generation
  - Deterministic generation
  - Variety across chunks
  - Validity checks (colors, URLs, colliders)
  - Performance (< 100ms per chunk)
  - Rapid generation (10 chunks < 500ms)

### All Tests: **PASSING** ✅
```
PASS src/generator/__tests__/SeedSystem.test.ts
PASS src/generator/__tests__/TowerGenerator.test.ts

Test Suites: 2 passed, 2 total
Tests:       45 passed, 45 total
Time:        0.62 s
```

## 🔑 Key Features

### 🎲 Deterministic Generation
- Same `(worldSeed, promptId, chunkIndex)` always produces identical chunk
- Uses SHA-256 seed hashing for cryptographic determinism
- PRNG-based platform selection ensures reproducibility

### 🎨 Visual Variety
- 5 color palette themes
- 4 skybox options (rotated by chunk index)
- Platform type diversity (flat, stairs, ramp)
- Progressive difficulty scaling

### ⚡ Performance
- Single chunk generation: **< 100ms**
- 10 consecutive chunks: **< 500ms**
- Efficient geometry merging
- Optimized collider generation

### 🏗️ Structure Variety
- Variable platform count (3-6 per chunk)
- Random positioning (-2 to 2 units X-axis)
- Progressive height increase (Y-axis)
- Progressive Z-depth spacing

### 🔒 Physics-Ready
- Valid collider generation
- Spawn points above platforms
- Checkpoint system for progress tracking
- Proper coordinate space for physics engine

## 🔄 Integration Points

### Inputs:
- `worldSeed`: Global world identifier
- `promptId`: Style/theme identifier
- `chunkIndex`: Sequence number in tower

### Outputs (per chunk):
- Complete mesh geometry (vertices/faces/normals/UVs)
- Physics colliders (positioned, sized)
- Spawn/checkpoint data
- Visual styling (palette, skybox)

### Dependencies:
- **SeedSystem** (Feature 1) - Deterministic PRNG
- **GenerationParams** - Shared interface
- **Standard Math** - Vector operations

## 🚀 Ready for Next Features

This foundation enables:
- **Feature 3**: Chunk Validator - Playability verification
- **Feature 4**: Chunk Window Manager - Streaming system
- **Feature 5**: WebSocket Server - Real-time multiplayer
- **Feature 6**: Game Loop - Physics simulation

## 📁 File Structure

```
apps/server/src/generator/
├── SeedSystem.ts                           # Feature 1
├── TowerGenerator.ts                       # Feature 2 (NEW)
├── __tests__/
│   ├── SeedSystem.test.ts
│   └── TowerGenerator.test.ts              # NEW
└── [Future components]
```

## 💡 Code Quality

- **Type Safety**: Full TypeScript interfaces
- **Documentation**: Comprehensive JSDoc comments
- **Testing**: 100% feature coverage
- **Performance**: Benchmarked and optimized
- **Maintainability**: Clear separation of concerns

## 🎯 Next Steps

Ready to move to **Feature 3: Chunk Validator** which will:
- Verify all platforms are jumpable
- Check slope angles
- Validate reachable paths
- Add guardrails where needed
- Ensure playability across all difficulty levels

---

**Status**: ✅ COMPLETE - Ready for integration and next features
