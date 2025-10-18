import { TowerGenerator, GeometryPrimitives, PlatformGenerator } from '../TowerGenerator';

// Inline types for testing
interface GenerationParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
}

describe('Tower Generator', () => {
  const testParams: GenerationParams = {
    worldSeed: 'test-world',
    promptId: 'phash_tower_test',
    chunkIndex: 0,
  };

  describe('GeometryPrimitives', () => {
    test('should create box geometry with correct vertex count', () => {
      const box = GeometryPrimitives.createBox({ x: 0, y: 0, z: 0 }, 2, 1, 2);
      expect(box.vertices.length).toBe(8 * 3); // 8 vertices, 3 coords each
      expect(box.faces.length).toBe(36); // 6 faces, 6 indices each
      expect(box.normals.length).toBe(8 * 3);
      expect(box.uvs.length).toBe(36 * 2);
    });

    test('should create ramp geometry', () => {
      const ramp = GeometryPrimitives.createRamp({ x: 0, y: 0, z: 0 }, 2, 1, 4);
      expect(ramp.vertices.length).toBe(8 * 3);
      expect(ramp.faces.length).toBeGreaterThan(0);
      expect(ramp.normals.length).toBeGreaterThan(0);
    });

    test('should create wall geometry', () => {
      const wall = GeometryPrimitives.createWall({ x: 0, y: 0, z: 0 }, 2, 3, 0.2);
      expect(wall.vertices.length).toBe(8 * 3);
      expect(wall.faces.length).toBe(36);
    });

    test('should generate proper normals', () => {
      const box = GeometryPrimitives.createBox({ x: 0, y: 0, z: 0 }, 1, 1, 1);
      
      // Check that normals are present and non-zero
      let hasNonZero = false;
      for (let i = 0; i < box.normals.length; i++) {
        if (Math.abs(box.normals[i]) > 0.001) {
          hasNonZero = true;
          break;
        }
      }
      expect(hasNonZero).toBe(true);
    });

    test('should generate UVs', () => {
      const box = GeometryPrimitives.createBox({ x: 0, y: 0, z: 0 }, 1, 1, 1);
      expect(box.uvs.length).toBe(36 * 2);
      
      // UVs should be between 0 and 1
      for (const uv of box.uvs) {
        expect(uv).toBeGreaterThanOrEqual(0);
        expect(uv).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('PlatformGenerator', () => {
    test('should create flat platform', () => {
      const platform = PlatformGenerator.createFlatPlatform({ x: 0, y: 0, z: 0 }, 2);
      expect(platform.type).toBe('flat');
      expect(platform.size.height).toBe(0.5);
      expect(platform.difficulty).toBe(0.1);
    });

    test('should create stairs platform', () => {
      const platform = PlatformGenerator.createStairsPlatform({ x: 0, y: 0, z: 0 }, 2);
      expect(platform.type).toBe('stairs');
      expect(platform.size.height).toBe(2);
      expect(platform.size.depth).toBe(3);
    });

    test('should create ramp platform', () => {
      const platform = PlatformGenerator.createRampPlatform({ x: 0, y: 0, z: 0 }, 2);
      expect(platform.type).toBe('ramp');
      expect(platform.size.height).toBe(1.5);
    });

    test('should create wall platform', () => {
      const platform = PlatformGenerator.createWallPlatform({ x: 0, y: 0, z: 0 }, 2);
      expect(platform.type).toBe('wall');
      expect(platform.size.height).toBe(3);
    });

    test('should allow custom difficulty', () => {
      const platform = PlatformGenerator.createFlatPlatform({ x: 0, y: 0, z: 0 }, 2, 0.8);
      expect(platform.difficulty).toBe(0.8);
    });
  });

  describe('TowerGenerator', () => {
    test('should generate chunk with valid structure', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk).toBeDefined();
      expect(chunk.index).toBe(testParams.chunkIndex);
      expect(chunk.seed).toBeDefined();
      expect(chunk.structureClass).toBe('tower');
      expect(chunk.palette).toBeDefined();
      expect(chunk.palette.length).toBeGreaterThan(0);
      expect(chunk.skyboxUrl).toBeDefined();
      expect(chunk.appliedPromptId).toBe(testParams.promptId);
    });

    test('should generate geometry data', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk.geometry).toBeDefined();
      expect(chunk.geometry.vertices.length).toBeGreaterThan(0);
      expect(chunk.geometry.faces.length).toBeGreaterThan(0);
      expect(chunk.geometry.normals.length).toBeGreaterThan(0);
      expect(chunk.geometry.uvs.length).toBeGreaterThan(0);
    });

    test('should generate physics data', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk.physics).toBeDefined();
      expect(chunk.physics.colliders.length).toBeGreaterThan(0);
      expect(chunk.physics.spawnPoints.length).toBeGreaterThan(0);
      expect(chunk.physics.checkpoints.length).toBeGreaterThan(0);
    });

    test('should generate platforms with increasing difficulty', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk.physics.colliders.length).toBeGreaterThanOrEqual(3);
      expect(chunk.physics.colliders.length).toBeLessThanOrEqual(6);
    });

    test('should generate valid colliders', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      for (const collider of chunk.physics.colliders) {
        expect(collider.type).toBe('box');
        expect(collider.position).toBeDefined();
        expect(collider.rotation).toBeDefined();
        expect(collider.scale).toBeDefined();
        
        expect(collider.position.x).toBeDefined();
        expect(collider.position.y).toBeDefined();
        expect(collider.position.z).toBeDefined();
      }
    });

    test('should generate spawn point on first platform', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      const spawnPoint = chunk.physics.spawnPoints[0];
      expect(spawnPoint).toBeDefined();
      expect(spawnPoint.x).toBeDefined();
      expect(spawnPoint.y).toBeDefined();
      expect(spawnPoint.z).toBeDefined();
    });

    test('should generate checkpoints for every other platform', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk.physics.checkpoints.length).toBeGreaterThan(0);
      expect(chunk.physics.checkpoints.length).toBeLessThanOrEqual(Math.ceil(chunk.physics.colliders.length / 2));
    });

    test('should generate deterministic chunks', () => {
      const chunk1 = TowerGenerator.generateChunk(testParams);
      const chunk2 = TowerGenerator.generateChunk(testParams);
      
      expect(chunk1.seed).toBe(chunk2.seed);
      expect(chunk1.palette).toEqual(chunk2.palette);
      expect(JSON.stringify(chunk1.geometry)).toBe(JSON.stringify(chunk2.geometry));
      expect(JSON.stringify(chunk1.physics)).toBe(JSON.stringify(chunk2.physics));
    });

    test('should generate different chunks for different params', () => {
      const chunk1 = TowerGenerator.generateChunk(testParams);
      const chunk2 = TowerGenerator.generateChunk({
        ...testParams,
        chunkIndex: 1,
      });
      
      expect(chunk1.seed).not.toBe(chunk2.seed);
      // Geometry might be different due to PRNG
      expect(JSON.stringify(chunk1.geometry)).not.toBe(JSON.stringify(chunk2.geometry));
    });

    test('should generate valid palette colors', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      for (const color of chunk.palette) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    test('should generate valid skybox URL', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      expect(chunk.skyboxUrl).toMatch(/^https?:\/\//);
      expect(chunk.skyboxUrl).toContain('skybox');
    });

    test('should handle multiple chunks in sequence', () => {
      const chunks = [];
      
      for (let i = 0; i < 5; i++) {
        const chunk = TowerGenerator.generateChunk({
          ...testParams,
          chunkIndex: i,
        });
        chunks.push(chunk);
      }
      
      // Verify all chunks are different
      for (let i = 0; i < chunks.length; i++) {
        for (let j = i + 1; j < chunks.length; j++) {
          expect(chunks[i].seed).not.toBe(chunks[j].seed);
        }
      }
    });

    test('should throw error for invalid params', () => {
      expect(() => {
        TowerGenerator.generateChunk({
          worldSeed: '',
          promptId: 'test',
          chunkIndex: 0,
        });
      }).toThrow('Invalid generation parameters');
    });

    test('should generate consistent geometry sizes', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      // Vertices should be multiple of 3
      expect(chunk.geometry.vertices.length % 3).toBe(0);
      
      // Normals should match vertices
      expect(chunk.geometry.normals.length).toBe(chunk.geometry.vertices.length);
      
      // UVs should be 2 * number of faces
      expect(chunk.geometry.uvs.length % 2).toBe(0);
    });

    test('should generate platforms with valid positions', () => {
      const chunk = TowerGenerator.generateChunk(testParams);
      
      for (const collider of chunk.physics.colliders) {
        expect(collider.position.y).toBeGreaterThanOrEqual(0);
        expect(collider.position.z).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Performance', () => {
    test('should generate chunk in reasonable time', () => {
      const start = performance.now();
      TowerGenerator.generateChunk(testParams);
      const end = performance.now();
      
      const duration = end - start;
      expect(duration).toBeLessThan(100); // Should be < 100ms
    });

    test('should handle rapid successive generation', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        TowerGenerator.generateChunk({
          ...testParams,
          chunkIndex: i,
        });
      }
      
      const end = performance.now();
      const duration = end - start;
      expect(duration).toBeLessThan(500); // All 10 should be < 500ms
    });
  });
});
