import { createHash } from 'crypto';
import seedrandom from 'seedrandom';

// Inline types
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Chunk {
  index: number;
  seed: string;
  structureClass: string;
  palette: string[];
  skyboxUrl?: string;
  appliedPromptId?: string;
  geometry: ChunkGeometry;
  physics: ChunkPhysics;
}

interface ChunkGeometry {
  vertices: number[];
  faces: number[];
  normals: number[];
  uvs: number[];
}

interface ChunkPhysics {
  colliders: Collider[];
  spawnPoints: Vector3[];
  checkpoints: Vector3[];
}

interface Collider {
  type: 'box' | 'sphere' | 'mesh';
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  vertices?: number[];
  faces?: number[];
}

interface GenerationParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
}

// Import from SeedSystem
import { DeterministicPRNG, GeneratorFactory, SeedHasher } from './SeedSystem';

/**
 * Geometry Primitives - Basic building blocks for tower generation
 */
export class GeometryPrimitives {
  /**
   * Create a box/platform geometry
   */
  static createBox(position: Vector3, width: number, height: number, depth: number) {
    const hw = width / 2;
    const hh = height / 2;
    const hd = depth / 2;

    const vertices = [
      // Front face
      position.x - hw, position.y - hh, position.z + hd,
      position.x + hw, position.y - hh, position.z + hd,
      position.x + hw, position.y + hh, position.z + hd,
      position.x - hw, position.y + hh, position.z + hd,
      // Back face
      position.x - hw, position.y - hh, position.z - hd,
      position.x + hw, position.y - hh, position.z - hd,
      position.x + hw, position.y + hh, position.z - hd,
      position.x - hw, position.y + hh, position.z - hd,
    ];

    const faces = [
      0, 1, 2, 0, 2, 3, // Front
      4, 6, 5, 4, 7, 6, // Back
      4, 5, 1, 4, 1, 0, // Bottom
      3, 2, 6, 3, 6, 7, // Top
      4, 0, 3, 4, 3, 7, // Left
      1, 5, 6, 1, 6, 2, // Right
    ];

    const normals = this.generateNormals(vertices, faces);
    const uvs = this.generateUVs(faces);

    return { vertices, faces, normals, uvs };
  }

  /**
   * Create a ramp geometry
   */
  static createRamp(position: Vector3, width: number, height: number, depth: number) {
    const hw = width / 2;
    const hd = depth / 2;

    const vertices = [
      // Base
      position.x - hw, position.y, position.z + hd,
      position.x + hw, position.y, position.z + hd,
      position.x + hw, position.y, position.z - hd,
      position.x - hw, position.y, position.z - hd,
      // Top edge
      position.x - hw, position.y + height, position.z + hd,
      position.x + hw, position.y + height, position.z + hd,
      position.x + hw, position.y + height, position.z - hd,
      position.x - hw, position.y + height, position.z - hd,
    ];

    const faces = [
      0, 2, 1, 0, 3, 2, // Bottom
      4, 5, 6, 4, 6, 7, // Top
      0, 1, 5, 0, 5, 4, // Front slope
      2, 3, 7, 2, 7, 6, // Back slope
      0, 4, 7, 0, 7, 3, // Left
      1, 2, 6, 1, 6, 5, // Right
    ];

    const normals = this.generateNormals(vertices, faces);
    const uvs = this.generateUVs(faces);

    return { vertices, faces, normals, uvs };
  }

  /**
   * Create a wall geometry
   */
  static createWall(position: Vector3, width: number, height: number, thickness: number) {
    const hw = width / 2;
    const hh = height / 2;
    const ht = thickness / 2;

    const vertices = [
      // Front face
      position.x - hw, position.y - hh, position.z + ht,
      position.x + hw, position.y - hh, position.z + ht,
      position.x + hw, position.y + hh, position.z + ht,
      position.x - hw, position.y + hh, position.z + ht,
      // Back face
      position.x - hw, position.y - hh, position.z - ht,
      position.x + hw, position.y - hh, position.z - ht,
      position.x + hw, position.y + hh, position.z - ht,
      position.x - hw, position.y + hh, position.z - ht,
    ];

    const faces = [
      0, 1, 2, 0, 2, 3, // Front
      4, 6, 5, 4, 7, 6, // Back
      4, 5, 1, 4, 1, 0, // Bottom
      3, 2, 6, 3, 6, 7, // Top
      4, 0, 3, 4, 3, 7, // Left
      1, 5, 6, 1, 6, 2, // Right
    ];

    const normals = this.generateNormals(vertices, faces);
    const uvs = this.generateUVs(faces);

    return { vertices, faces, normals, uvs };
  }

  /**
   * Generate normals for vertices (for lighting)
   */
  private static generateNormals(vertices: number[], faces: number[]): number[] {
    const normals: number[] = new Array(vertices.length).fill(0);

    for (let i = 0; i < faces.length; i += 3) {
      const i0 = faces[i] * 3;
      const i1 = faces[i + 1] * 3;
      const i2 = faces[i + 2] * 3;

      const v0 = { x: vertices[i0], y: vertices[i0 + 1], z: vertices[i0 + 2] };
      const v1 = { x: vertices[i1], y: vertices[i1 + 1], z: vertices[i1 + 2] };
      const v2 = { x: vertices[i2], y: vertices[i2 + 1], z: vertices[i2 + 2] };

      const edge1 = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const edge2 = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      // Cross product
      const normal = {
        x: edge1.y * edge2.z - edge1.z * edge2.y,
        y: edge1.z * edge2.x - edge1.x * edge2.z,
        z: edge1.x * edge2.y - edge1.y * edge2.x,
      };

      // Normalize
      const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (length > 0) {
        normal.x /= length;
        normal.y /= length;
        normal.z /= length;
      }

      normals[i0] += normal.x;
      normals[i0 + 1] += normal.y;
      normals[i0 + 2] += normal.z;
      normals[i1] += normal.x;
      normals[i1 + 1] += normal.y;
      normals[i1 + 2] += normal.z;
      normals[i2] += normal.x;
      normals[i2 + 1] += normal.y;
      normals[i2 + 2] += normal.z;
    }

    return normals;
  }

  /**
   * Generate UVs for texturing
   */
  private static generateUVs(faces: number[]): number[] {
    return new Array(faces.length * 2).fill(0).map((_, i) => (i % 2 === 0 ? (i % 3) / 3 : Math.floor(i / 6) % 2));
  }
}

/**
 * Platform Types - Different platform configurations for variety
 */
export interface Platform {
  position: Vector3;
  size: { width: number; height: number; depth: number };
  type: 'flat' | 'stairs' | 'ramp' | 'wall';
  difficulty: number;
}

export class PlatformGenerator {
  /**
   * Generate a flat platform
   */
  static createFlatPlatform(position: Vector3, width: number, difficulty?: number): Platform {
    return {
      position,
      size: { width, height: 0.5, depth: width },
      type: 'flat',
      difficulty: difficulty ?? 0.1,
    };
  }

  /**
   * Generate stairs platform
   */
  static createStairsPlatform(position: Vector3, width: number, difficulty?: number): Platform {
    return {
      position,
      size: { width, height: 2, depth: width * 1.5 },
      type: 'stairs',
      difficulty: difficulty ?? 0.3,
    };
  }

  /**
   * Generate ramp platform
   */
  static createRampPlatform(position: Vector3, width: number, difficulty?: number): Platform {
    return {
      position,
      size: { width, height: 1.5, depth: width * 2 },
      type: 'ramp',
      difficulty: difficulty ?? 0.5,
    };
  }

  /**
   * Generate wall platform (obstacle)
   */
  static createWallPlatform(position: Vector3, width: number, difficulty?: number): Platform {
    return {
      position,
      size: { width, height: 3, depth: 0.3 },
      type: 'wall',
      difficulty: difficulty ?? 0.7,
    };
  }
}

/**
 * Core Tower Generator
 * Generates deterministic tower chunks using the seed system
 */
export class TowerGenerator {
  /**
   * Generate a complete chunk with geometry and physics
   */
  static generateChunk(params: GenerationParams): Chunk {
    if (!GeneratorFactory.validateParams(params)) {
      throw new Error('Invalid generation parameters');
    }

    const prng = GeneratorFactory.createPRNG(params);

    const platforms = this.generatePlatforms(prng);

    let vertices: number[] = [];
    let faces: number[] = [];
    let normals: number[] = [];
    let uvs: number[] = [];

    const colliders: Collider[] = [];
    const spawnPoints: Vector3[] = [];

    for (const platform of platforms) {
      const geometry = this.platformToGeometry(platform);

      const faceOffset = vertices.length / 3;
      vertices.push(...geometry.vertices);
      faces.push(...geometry.faces.map(f => f + faceOffset));
      normals.push(...geometry.normals);
      uvs.push(...geometry.uvs);

      colliders.push(this.platformToCollider(platform));

      if (spawnPoints.length === 0) {
        spawnPoints.push({
          x: platform.position.x,
          y: platform.position.y + platform.size.height + 1,
          z: platform.position.z,
        });
      }
    }

    return {
      index: params.chunkIndex,
      seed: SeedHasher.hashFromParams(params),
      structureClass: 'tower',
      palette: this.generatePalette(prng),
      skyboxUrl: this.generateSkyboxUrl(params),
      appliedPromptId: params.promptId,
      geometry: {
        vertices,
        faces,
        normals,
        uvs,
      },
      physics: {
        colliders,
        spawnPoints,
        checkpoints: this.generateCheckpoints(platforms),
      },
    };
  }

  /**
   * Generate platforms for a chunk
   */
  private static generatePlatforms(prng: DeterministicPRNG): Platform[] {
    const platformCount = prng.randomInt(3, 6);
    const platforms: Platform[] = [];

    let currentZ = 0;

    for (let i = 0; i < platformCount; i++) {
      const platformTypes: Array<'flat' | 'stairs' | 'ramp'> = ['flat', 'stairs', 'ramp'];
      const type = prng.randomChoice(platformTypes);

      const width = prng.randomFloat(1.5, 3);
      const difficulty = (i / platformCount) * 0.7 + 0.1;

      const x = prng.randomFloat(-2, 2);
      const y = i * 3;

      let platform: Platform;

      switch (type) {
        case 'flat':
          platform = PlatformGenerator.createFlatPlatform({ x, y, z: currentZ }, width, difficulty);
          currentZ += 4;
          break;
        case 'stairs':
          platform = PlatformGenerator.createStairsPlatform({ x, y, z: currentZ }, width, difficulty);
          currentZ += 5;
          break;
        case 'ramp':
          platform = PlatformGenerator.createRampPlatform({ x, y, z: currentZ }, width, difficulty);
          currentZ += 6;
          break;
        default:
          platform = PlatformGenerator.createFlatPlatform({ x, y, z: currentZ }, width, difficulty);
          currentZ += 4;
      }

      platforms.push(platform);
    }

    return platforms;
  }

  /**
   * Convert platform to geometry
   */
  private static platformToGeometry(platform: Platform) {
    const { position, size, type } = platform;

    switch (type) {
      case 'flat':
        return GeometryPrimitives.createBox(position, size.width, size.height, size.depth);
      case 'stairs':
        return GeometryPrimitives.createBox(position, size.width, size.height, size.depth);
      case 'ramp':
        return GeometryPrimitives.createRamp(position, size.width, size.height, size.depth);
      case 'wall':
        return GeometryPrimitives.createWall(position, size.width, size.height, size.depth);
      default:
        return GeometryPrimitives.createBox(position, size.width, size.height, size.depth);
    }
  }

  /**
   * Convert platform to physics collider
   */
  private static platformToCollider(platform: Platform): Collider {
    return {
      type: 'box',
      position: platform.position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: {
        x: platform.size.width,
        y: platform.size.height,
        z: platform.size.depth,
      },
    };
  }

  /**
   * Generate checkpoint positions
   */
  private static generateCheckpoints(platforms: Platform[]): Vector3[] {
    return platforms
      .filter((_, i) => i % 2 === 0)
      .map(platform => ({
        x: platform.position.x,
        y: platform.position.y + platform.size.height + 1,
        z: platform.position.z,
      }));
  }

  /**
   * Generate color palette for this chunk
   */
  private static generatePalette(prng: DeterministicPRNG): string[] {
    const palettes = [
      ['#f5f5f5', '#2e7d32', '#263238'],
      ['#ff6b6b', '#4ecdc4', '#45b7d1'],
      ['#ffd93d', '#6bcf7f', '#4d4d4d'],
      ['#a8dadc', '#457b9d', '#1d3557'],
      ['#f1faee', '#e63946', '#a8dadc'],
    ];

    return prng.randomChoice(palettes);
  }

  /**
   * Generate skybox URL for this chunk
   */
  private static generateSkyboxUrl(params: GenerationParams): string {
    const skyboxOptions = [
      'https://cdn.example.com/skybox-blue.eq',
      'https://cdn.example.com/skybox-sunset.eq',
      'https://cdn.example.com/skybox-forest.eq',
      'https://cdn.example.com/skybox-urban.eq',
    ];

    const index = params.chunkIndex % skyboxOptions.length;
    return skyboxOptions[index];
  }
}
