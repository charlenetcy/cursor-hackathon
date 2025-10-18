import { BuildPlan, Chunk, ChunkGeometry, ChunkPhysics, Collider, Vector3 } from '../../../../shared/src/types';
import { DeterministicPRNG, GeneratorFactory, SeedHasher } from './SeedSystem';
import { GeometryPrimitives, PlatformGenerator, Platform, TowerGenerator } from './TowerGenerator';

interface ExecuteParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
  plan: BuildPlan;
}

export class PlanExecutor {
  static execute(params: ExecuteParams): Chunk {
    const prng = GeneratorFactory.createPRNG({ worldSeed: params.worldSeed, promptId: params.promptId, chunkIndex: params.chunkIndex });

    // Seeded interpretation: map plan steps to deterministic sequence of platform primitives
    const platforms: Platform[] = [];

    let currentZ = 0;
    const addPlatform = (type: Platform['type']) => {
      const width = prng.randomFloat(1.6, 3.0);
      const x = prng.randomFloat(-1, 1);
      const y = 0; // keep mostly flat course
      const difficulty = Math.min(0.9, 0.1 + platforms.length * 0.1);
      switch (type) {
        case 'stairs': platforms.push(PlatformGenerator.createStairsPlatform({ x, y, z: currentZ }, width, difficulty)); currentZ += 5; break;
        case 'ramp': platforms.push(PlatformGenerator.createRampPlatform({ x, y, z: currentZ }, width, difficulty)); currentZ += 6; break;
        case 'wall': platforms.push(PlatformGenerator.createWallPlatform({ x, y, z: currentZ }, width, difficulty)); currentZ += 4; break;
        default: platforms.push(PlatformGenerator.createFlatPlatform({ x, y, z: currentZ }, width, difficulty)); currentZ += 4; break;
      }
    };

    for (const step of params.plan.steps) {
      if (step.type === 'entry' || step.type === 'exit') continue;
      if (step.type === 'platforms') {
        const count = Number(step.params?.count ?? 4);
        for (let i = 0; i < count; i++) addPlatform(prng.randomChoice(['flat', 'stairs', 'ramp']));
      } else if (step.type === 'rails' || step.type === 'corridors') {
        const count = Number(step.params?.count ?? 3);
        for (let i = 0; i < count; i++) addPlatform('flat');
      } else if (step.type === 'wallruns') {
        const count = Number(step.params?.count ?? 2);
        for (let i = 0; i < count; i++) addPlatform('wall');
      } else if (step.type === 'stairs') {
        const count = Number(step.params?.count ?? 3);
        for (let i = 0; i < count; i++) addPlatform('stairs');
      } else if (step.type === 'ramps' || step.type === 'ramp') {
        const count = Number(step.params?.count ?? 3);
        for (let i = 0; i < count; i++) addPlatform('ramp');
      }
    }

    // Convert platforms into mesh + physics (same as TowerGenerator)
    let vertices: number[] = [];
    let faces: number[] = [];
    let normals: number[] = [];
    let uvs: number[] = [];
    const colliders: Collider[] = [];
    const spawnPoints: Vector3[] = [];

    for (const platform of platforms) {
      const geometry = ((): { vertices: number[]; faces: number[]; normals: number[]; uvs: number[] } => {
        switch (platform.type) {
          case 'flat': return GeometryPrimitives.createBox(platform.position, platform.size.width, platform.size.height, platform.size.depth);
          case 'stairs': return GeometryPrimitives.createBox(platform.position, platform.size.width, platform.size.height, platform.size.depth);
          case 'ramp': return GeometryPrimitives.createRamp(platform.position, platform.size.width, platform.size.height, platform.size.depth);
          case 'wall': return GeometryPrimitives.createWall(platform.position, platform.size.width, platform.size.height, platform.size.depth);
          default: return GeometryPrimitives.createBox(platform.position, platform.size.width, platform.size.height, platform.size.depth);
        }
      })();

      const faceOffset = vertices.length / 3;
      vertices.push(...geometry.vertices);
      faces.push(...geometry.faces.map(f => f + faceOffset));
      normals.push(...geometry.normals);
      uvs.push(...geometry.uvs);

      colliders.push({
        type: 'box',
        position: platform.position,
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: platform.size.width, y: platform.size.height, z: platform.size.depth },
      });

      if (spawnPoints.length === 0) {
        spawnPoints.push({ x: platform.position.x, y: platform.position.y + platform.size.height + 1, z: platform.position.z });
      }
    }

    const seed = SeedHasher.hashSeeds(params.worldSeed, params.promptId, params.chunkIndex);

    const chunk: Chunk = {
      index: params.chunkIndex,
      seed,
      structureClass: 'tower',
      palette: ['#f1faee', '#e63946', '#a8dadc'],
      skyboxUrl: undefined,
      appliedPromptId: params.promptId,
      geometry: { vertices, faces, normals, uvs },
      physics: { colliders, spawnPoints, checkpoints: platforms.filter((_, i) => i % 2 === 0).map(p => ({ x: p.position.x, y: p.position.y + p.size.height + 1, z: p.position.z })) },
    };

    return chunk;
  }
}

export default PlanExecutor;


