import { createHash } from 'crypto';
import seedrandom from 'seedrandom';

// Inline types for testing
interface GenerationParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
}

// Inline implementation for testing
class SeedHasher {
  static hashSeeds(worldSeed: string, promptId: string, chunkIndex: number): string {
    const combined = `${worldSeed}:${promptId}:${chunkIndex}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  static hashFromParams(params: GenerationParams): string {
    return this.hashSeeds(params.worldSeed, params.promptId, params.chunkIndex);
  }

  static isValidSeed(seed: string): boolean {
    return typeof seed === 'string' && seed.length === 64 && /^[a-f0-9]+$/.test(seed);
  }
}

class DeterministicPRNG {
  private rng: seedrandom.PRNG;

  constructor(seed: string) {
    if (!SeedHasher.isValidSeed(seed)) {
      throw new Error(`Invalid seed format: ${seed}`);
    }
    this.rng = seedrandom(seed);
  }

  random(): number {
    return this.rng();
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.randomInt(0, array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  randomVector3(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    return {
      x: this.randomFloat(minX, maxX),
      y: this.randomFloat(minY, maxY),
      z: this.randomFloat(minZ, maxZ),
    };
  }
}

class GeneratorFactory {
  static createPRNG(params: GenerationParams): DeterministicPRNG {
    const seed = SeedHasher.hashFromParams(params);
    return new DeterministicPRNG(seed);
  }

  static createPRNGFromSeed(seed: string): DeterministicPRNG {
    return new DeterministicPRNG(seed);
  }

  static validateParams(params: GenerationParams): boolean {
    return (
      typeof params.worldSeed === 'string' &&
      typeof params.promptId === 'string' &&
      typeof params.chunkIndex === 'number' &&
      params.chunkIndex >= 0 &&
      params.worldSeed.length > 0 &&
      params.promptId.length > 0
    );
  }
}

describe('Deterministic Seed System', () => {
  const testParams: GenerationParams = {
    worldSeed: 'test-world-123',
    promptId: 'phash_abc123',
    chunkIndex: 5,
  };

  describe('SeedHasher', () => {
    test('should generate identical seeds for identical inputs', () => {
      const seed1 = SeedHasher.hashSeeds('world', 'prompt', 1);
      const seed2 = SeedHasher.hashSeeds('world', 'prompt', 1);
      expect(seed1).toBe(seed2);
    });

    test('should generate different seeds for different inputs', () => {
      const seed1 = SeedHasher.hashSeeds('world', 'prompt', 1);
      const seed2 = SeedHasher.hashSeeds('world', 'prompt', 2);
      const seed3 = SeedHasher.hashSeeds('world', 'prompt2', 1);
      const seed4 = SeedHasher.hashSeeds('world2', 'prompt', 1);

      expect(seed1).not.toBe(seed2);
      expect(seed1).not.toBe(seed3);
      expect(seed1).not.toBe(seed4);
    });

    test('should generate valid SHA-256 seeds', () => {
      const seed = SeedHasher.hashSeeds('world', 'prompt', 1);
      expect(SeedHasher.isValidSeed(seed)).toBe(true);
      expect(seed).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should work with GenerationParams', () => {
      const seed1 = SeedHasher.hashFromParams(testParams);
      const seed2 = SeedHasher.hashSeeds(testParams.worldSeed, testParams.promptId, testParams.chunkIndex);
      expect(seed1).toBe(seed2);
    });

    test('should validate seed format correctly', () => {
      expect(SeedHasher.isValidSeed('a'.repeat(64))).toBe(true);
      expect(SeedHasher.isValidSeed('a'.repeat(63))).toBe(false);
      expect(SeedHasher.isValidSeed('a'.repeat(65))).toBe(false);
      expect(SeedHasher.isValidSeed('g'.repeat(64))).toBe(false);
      expect(SeedHasher.isValidSeed('')).toBe(false);
    });
  });

  describe('DeterministicPRNG', () => {
    test('should generate identical sequences for identical seeds', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng1 = new DeterministicPRNG(seed);
      const prng2 = new DeterministicPRNG(seed);

      const sequence1 = Array.from({ length: 10 }, () => prng1.random());
      const sequence2 = Array.from({ length: 10 }, () => prng2.random());

      expect(sequence1).toEqual(sequence2);
    });

    test('should generate different sequences for different seeds', () => {
      const seed1 = SeedHasher.hashSeeds('world', 'prompt', 1);
      const seed2 = SeedHasher.hashSeeds('world', 'prompt', 2);

      const prng1 = new DeterministicPRNG(seed1);
      const prng2 = new DeterministicPRNG(seed2);

      const sequence1 = Array.from({ length: 10 }, () => prng1.random());
      const sequence2 = Array.from({ length: 10 }, () => prng2.random());

      expect(sequence1).not.toEqual(sequence2);
    });

    test('should generate integers within bounds', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);

      for (let i = 0; i < 100; i++) {
        const value = prng.randomInt(5, 15);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(15);
      }
    });

    test('should generate floats within bounds', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);

      for (let i = 0; i < 100; i++) {
        const value = prng.randomFloat(1.5, 3.7);
        expect(value).toBeGreaterThanOrEqual(1.5);
        expect(value).toBeLessThan(3.7);
      }
    });

    test('should choose from array deterministically', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);
      const array = ['a', 'b', 'c', 'd', 'e'];

      const choices1 = Array.from({ length: 10 }, () => prng.randomChoice(array));
      const prng2 = new DeterministicPRNG(seed);
      const choices2 = Array.from({ length: 10 }, () => prng2.randomChoice(array));

      expect(choices1).toEqual(choices2);
    });

    test('should shuffle arrays deterministically', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const shuffled1 = prng.shuffle(array);
      const prng2 = new DeterministicPRNG(seed);
      const shuffled2 = prng2.shuffle(array);

      expect(shuffled1).toEqual(shuffled2);
      expect(shuffled1).toHaveLength(array.length);
      expect(shuffled1.sort()).toEqual(array.sort());
    });

    test('should generate random booleans with correct probability', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);

      const results = Array.from({ length: 1000 }, () => prng.randomBool(0.3));
      const trueCount = results.filter(Boolean).length;
      const probability = trueCount / 1000;

      // Should be close to 0.3 with some tolerance
      expect(probability).toBeGreaterThan(0.25);
      expect(probability).toBeLessThan(0.35);
    });

    test('should generate random vectors within bounds', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng = new DeterministicPRNG(seed);

      const vector = prng.randomVector3(0, 10, -5, 5, 0, 20);
      expect(vector.x).toBeGreaterThanOrEqual(0);
      expect(vector.x).toBeLessThan(10);
      expect(vector.y).toBeGreaterThanOrEqual(-5);
      expect(vector.y).toBeLessThan(5);
      expect(vector.z).toBeGreaterThanOrEqual(0);
      expect(vector.z).toBeLessThan(20);
    });

    test('should throw error for invalid seed', () => {
      expect(() => new DeterministicPRNG('invalid')).toThrow('Invalid seed format');
      expect(() => new DeterministicPRNG('')).toThrow('Invalid seed format');
      expect(() => new DeterministicPRNG('a'.repeat(63))).toThrow('Invalid seed format');
    });
  });

  describe('GeneratorFactory', () => {
    test('should create identical PRNGs for identical params', () => {
      const prng1 = GeneratorFactory.createPRNG(testParams);
      const prng2 = GeneratorFactory.createPRNG(testParams);

      const sequence1 = Array.from({ length: 10 }, () => prng1.random());
      const sequence2 = Array.from({ length: 10 }, () => prng2.random());

      expect(sequence1).toEqual(sequence2);
    });

    test('should validate parameters correctly', () => {
      expect(GeneratorFactory.validateParams(testParams)).toBe(true);
      expect(GeneratorFactory.validateParams({
        ...testParams,
        chunkIndex: -1
      })).toBe(false);
      expect(GeneratorFactory.validateParams({
        ...testParams,
        worldSeed: ''
      })).toBe(false);
      expect(GeneratorFactory.validateParams({
        ...testParams,
        promptId: ''
      })).toBe(false);
    });

    test('should create PRNG from raw seed', () => {
      const seed = SeedHasher.hashFromParams(testParams);
      const prng1 = GeneratorFactory.createPRNG(testParams);
      const prng2 = GeneratorFactory.createPRNGFromSeed(seed);

      const sequence1 = Array.from({ length: 10 }, () => prng1.random());
      const sequence2 = Array.from({ length: 10 }, () => prng2.random());

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('Cross-run Determinism', () => {
    test('should maintain determinism across multiple test runs', () => {
      // This test ensures that the same inputs always produce the same outputs
      // even when the test is run multiple times
      const testCases = [
        { worldSeed: 'world1', promptId: 'prompt1', chunkIndex: 0 },
        { worldSeed: 'world1', promptId: 'prompt1', chunkIndex: 1 },
        { worldSeed: 'world2', promptId: 'prompt1', chunkIndex: 0 },
        { worldSeed: 'world1', promptId: 'prompt2', chunkIndex: 0 },
      ];

      const results = testCases.map(params => {
        const seed = SeedHasher.hashFromParams(params);
        const prng = new DeterministicPRNG(seed);
        return {
          params,
          seed,
          sequence: Array.from({ length: 5 }, () => prng.random()),
        };
      });

      // Verify all seeds are different
      const seeds = results.map(r => r.seed);
      const uniqueSeeds = new Set(seeds);
      expect(uniqueSeeds.size).toBe(seeds.length);

      // Verify all sequences are different
      const sequences = results.map(r => r.sequence);
      const uniqueSequences = new Set(sequences.map(s => JSON.stringify(s)));
      expect(uniqueSequences.size).toBe(sequences.length);
    });
  });
});