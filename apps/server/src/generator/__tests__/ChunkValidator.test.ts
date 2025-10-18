import { ChunkValidator, ValidationResult } from '../ChunkValidator';

// Mock types
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Collider {
  type: 'box';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

interface Chunk {
  index: number;
  seed: string;
  structureClass: string;
  palette: string[];
  skyboxUrl?: string;
  appliedPromptId?: string;
  geometry: { vertices: number[]; faces: number[]; normals: number[]; uvs: number[] };
  physics: { colliders: Collider[]; spawnPoints: Vector3[]; checkpoints: Vector3[] };
}

function createChunk(platformCount: number): Chunk {
  const colliders: Collider[] = [];
  for (let i = 0; i < platformCount; i++) {
    colliders.push({
      type: 'box',
      position: { x: 0, y: i * 2, z: i * 2.5 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 2, y: 0.5, z: 2 },
    });
  }

  return {
    index: 0,
    seed: 'test',
    structureClass: 'tower',
    palette: ['#fff', '#000', '#888'],
    skyboxUrl: 'https://test.com/sky.eq',
    appliedPromptId: 'test_prompt',
    geometry: { vertices: [], faces: [], normals: [], uvs: [] },
    physics: {
      colliders,
      spawnPoints: platformCount > 0 ? [{ x: 0, y: 1.5, z: 0 }] : [],
      checkpoints: [],
    },
  };
}

describe('ChunkValidator', () => {
  test('should validate chunk structure', () => {
    const chunk = createChunk(3);
    const result = ChunkValidator.validate(chunk);
    
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('metadata');
  });

  test('should reject chunk with too few platforms', () => {
    const chunk = createChunk(1);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should accept chunk with enough platforms', () => {
    const chunk = createChunk(4);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.platformCount).toBe(4);
    expect(result.metadata.platformCount).toBeGreaterThanOrEqual(2);
  });

  test('should validate jump gaps', () => {
    const chunk = createChunk(3);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.avgJumpDistance).toBeGreaterThanOrEqual(0);
    expect(result.metadata.avgJumpDistance).toBeLessThanOrEqual(3);
  });

  test('should reject chunk with impossible jumps', () => {
    const chunk = createChunk(3);
    chunk.physics.colliders[1].position.z = 10; // Move platform far away
    const result = ChunkValidator.validate(chunk);
    
    expect(result.errors.some(e => e.includes('Jump gap'))).toBe(true);
  });

  test('should validate reachability', () => {
    const chunk = createChunk(3);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.isReachable).toBe(true);
  });

  test('should detect unreachable paths', () => {
    const chunk = createChunk(1);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.isReachable).toBe(false);
  });

  test('should provide playability check function', () => {
    const chunk = createChunk(3);
    const result = ChunkValidator.isPlayable(chunk);
    
    expect(typeof result).toBe('boolean');
  });

  test('should generate validation report', () => {
    const chunk = createChunk(3);
    const report = ChunkValidator.getReport(chunk);
    
    expect(report).toContain('CHUNK VALIDATION REPORT');
    expect(report).toContain('Platforms');
    expect(report).toContain('Metadata');
  });

  test('should detect spawn point issues', () => {
    const chunk = createChunk(2);
    chunk.physics.spawnPoints = [];
    const result = ChunkValidator.validate(chunk);
    
    expect(result.errors.some(e => e.includes('spawn'))).toBe(true);
  });

  test('should warn about guardrails for high platforms', () => {
    const chunk = createChunk(3);
    chunk.physics.colliders[0].position.y = 10;
    chunk.physics.colliders[0].scale.x = 3;
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.guardrailsNeeded).toBeGreaterThan(0);
  });

  test('should calculate max slope', () => {
    const chunk = createChunk(3);
    const result = ChunkValidator.validate(chunk);
    
    expect(result.metadata.maxSlope).toBeGreaterThanOrEqual(0);
  });
});
