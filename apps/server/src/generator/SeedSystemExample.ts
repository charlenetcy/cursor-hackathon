import { SeedHasher, DeterministicPRNG, GeneratorFactory } from './SeedSystem';
import { GenerationParams } from '../../shared/src/types';

/**
 * Example usage of the deterministic seed system
 * This demonstrates how to use the system for chunk generation
 */
export class SeedSystemExample {
  /**
   * Example: Generate a deterministic chunk seed
   */
  static generateChunkSeed(worldSeed: string, promptId: string, chunkIndex: number): string {
    return SeedHasher.hashSeeds(worldSeed, promptId, chunkIndex);
  }

  /**
   * Example: Create a PRNG for chunk generation
   */
  static createChunkPRNG(params: GenerationParams): DeterministicPRNG {
    return GeneratorFactory.createPRNG(params);
  }

  /**
   * Example: Generate deterministic platform positions
   */
  static generatePlatformPositions(params: GenerationParams, platformCount: number = 5) {
    const prng = GeneratorFactory.createPRNG(params);
    const platforms = [];

    for (let i = 0; i < platformCount; i++) {
      platforms.push({
        id: i,
        position: prng.randomVector3(0, 10, 0, 20, 0, 10),
        size: prng.randomFloat(1, 3),
        type: prng.randomChoice(['flat', 'stairs', 'ramp']),
      });
    }

    return platforms;
  }

  /**
   * Example: Generate deterministic obstacle layout
   */
  static generateObstacleLayout(params: GenerationParams) {
    const prng = GeneratorFactory.createPRNG(params);
    
    return {
      obstacles: Array.from({ length: prng.randomInt(3, 8) }, (_, i) => ({
        id: i,
        position: prng.randomVector3(0, 10, 0, 5, 0, 10),
        type: prng.randomChoice(['wall', 'gap', 'moving']),
        difficulty: prng.randomFloat(0.1, 1.0),
      })),
      powerUps: Array.from({ length: prng.randomInt(1, 4) }, (_, i) => ({
        id: i,
        position: prng.randomVector3(0, 10, 2, 8, 0, 10),
        type: prng.randomChoice(['speed', 'jump', 'health']),
      })),
    };
  }

  /**
   * Example: Verify determinism across multiple generations
   */
  static verifyDeterminism() {
    const params: GenerationParams = {
      worldSeed: 'test-world',
      promptId: 'phash_test123',
      chunkIndex: 42,
    };

    // Generate the same content multiple times
    const results1 = this.generatePlatformPositions(params, 3);
    const results2 = this.generatePlatformPositions(params, 3);
    const results3 = this.generatePlatformPositions(params, 3);

    // All results should be identical
    console.log('Determinism check:');
    console.log('Results 1:', JSON.stringify(results1, null, 2));
    console.log('Results 2:', JSON.stringify(results2, null, 2));
    console.log('Results 3:', JSON.stringify(results3, null, 2));
    console.log('Are identical:', JSON.stringify(results1) === JSON.stringify(results2) && 
                                 JSON.stringify(results2) === JSON.stringify(results3));

    return {
      identical: JSON.stringify(results1) === JSON.stringify(results2) && 
                 JSON.stringify(results2) === JSON.stringify(results3),
      results: results1,
    };
  }
}

// Example usage
if (require.main === module) {
  console.log('=== Deterministic Seed System Example ===\n');
  
  // Test basic seed generation
  const seed = SeedSystemExample.generateChunkSeed('world123', 'phash_abc', 5);
  console.log('Generated seed:', seed);
  console.log('Seed is valid:', SeedHasher.isValidSeed(seed));
  
  // Test determinism
  const determinismTest = SeedSystemExample.verifyDeterminism();
  console.log('\nDeterminism test passed:', determinismTest.identical);
  
  // Test obstacle generation
  const params: GenerationParams = {
    worldSeed: 'test-world',
    promptId: 'phash_obstacles',
    chunkIndex: 10,
  };
  
  const obstacles = SeedSystemExample.generateObstacleLayout(params);
  console.log('\nGenerated obstacles:', JSON.stringify(obstacles, null, 2));
}
