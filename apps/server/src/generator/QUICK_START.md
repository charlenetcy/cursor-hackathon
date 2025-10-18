# 🚀 Quick Start - Tower Generator

## Basic Usage

```typescript
import { TowerGenerator } from './TowerGenerator';

// Generate a single chunk
const chunk = TowerGenerator.generateChunk({
  worldSeed: 'my-world-2024',
  promptId: 'phash_japan_temple',
  chunkIndex: 0,
});

console.log(chunk);
// {
//   index: 0,
//   seed: "a95d7a807e5fd8...",
//   structureClass: "tower",
//   palette: ["#f5f5f5", "#2e7d32", "#263238"],
//   geometry: { vertices: [...], faces: [...], ... },
//   physics: { colliders: [...], spawnPoints: [...], ... }
// }
```

## Generate Multiple Chunks

```typescript
// Generate a sequence of chunks
const chunks = [];
for (let i = 0; i < 10; i++) {
  chunks.push(TowerGenerator.generateChunk({
    worldSeed: 'my-world-2024',
    promptId: 'phash_japan_temple',
    chunkIndex: i,
  }));
}

// Each chunk is deterministic and unique!
```

## Important: Always Deterministic

```typescript
// These two calls produce IDENTICAL chunks
const chunk1 = TowerGenerator.generateChunk({
  worldSeed: 'world1',
  promptId: 'phash_abc',
  chunkIndex: 5,
});

const chunk2 = TowerGenerator.generateChunk({
  worldSeed: 'world1',
  promptId: 'phash_abc',
  chunkIndex: 5,
});

console.log(chunk1.seed === chunk2.seed); // true
console.log(JSON.stringify(chunk1.geometry) === JSON.stringify(chunk2.geometry)); // true
```

## Chunk Properties

### Geometry Data
- `vertices`: Array of vertex coordinates [x1, y1, z1, x2, y2, z2, ...]
- `faces`: Triangle indices [i0, i1, i2, i0, i2, i3, ...]
- `normals`: Lighting normals (same length as vertices)
- `uvs`: Texture coordinates (2 per face vertex)

### Physics Data
- `colliders`: Array of collision boxes (type, position, rotation, scale)
- `spawnPoints`: Where players spawn (typically first platform)
- `checkpoints`: Progress markers (every other platform)

### Visual Data
- `palette`: Array of 3 hex color codes (base, accent1, accent2)
- `skyboxUrl`: URL to equirectangular skybox image

## Platform Types Generated

- **Flat** (10% difficulty) - Easy platforms
- **Stairs** (30% difficulty) - Step-by-step navigation  
- **Ramp** (50% difficulty) - Inclined surfaces
- Randomly mixed in each chunk for variety

## Performance

- ⚡ Single chunk: < 100ms
- ⚡ 10 chunks: < 500ms
- ⚡ 100 chunks: < 5 seconds

## Error Handling

```typescript
try {
  TowerGenerator.generateChunk({
    worldSeed: '',  // INVALID - empty string
    promptId: 'test',
    chunkIndex: 0,
  });
} catch (error) {
  console.error('Invalid parameters:', error);
  // Output: Invalid parameters: Error: Invalid generation parameters
}
```

## Integration with Physics Engine

```typescript
import * as RAPIER from '@react-three/rapier';

const chunk = TowerGenerator.generateChunk(params);

// Create physics world colliders
for (const collider of chunk.physics.colliders) {
  const shape = RAPIER.ColliderDesc.cuboid(
    collider.scale.x / 2,
    collider.scale.y / 2,
    collider.scale.z / 2
  );
  
  const rigidBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(
      collider.position.x,
      collider.position.y,
      collider.position.z
    )
  );
  
  world.createCollider(shape, rigidBody);
}

// Spawn players at spawn points
const spawnPoint = chunk.physics.spawnPoints[0];
player.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
```

## Integration with Three.js

```typescript
import * as THREE from 'three';

const chunk = TowerGenerator.generateChunk(params);

// Create mesh
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(
  new Float32Array(chunk.geometry.vertices),
  3
));
geometry.setAttribute('normal', new THREE.BufferAttribute(
  new Float32Array(chunk.geometry.normals),
  3
));
geometry.setIndex(new THREE.BufferAttribute(
  new Uint32Array(chunk.geometry.faces),
  1
));

// Apply palette colors
const material = new THREE.MeshPhongMaterial({
  color: new THREE.Color(chunk.palette[0]),
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Load skybox
const skyboxUrl = chunk.skyboxUrl;
// ... load texture and apply to scene
```

## Testing

```bash
# Run all tests
npm test

# Run only TowerGenerator tests  
npm test -- --testPathPattern="TowerGenerator"

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

---

**Next**: After generating chunks, they need to be **validated** (Feature 3) to ensure they're playable before being sent to clients!
