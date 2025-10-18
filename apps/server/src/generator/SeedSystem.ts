import { createHash } from 'crypto';
import seedrandom from 'seedrandom';

/**
 * Generation Parameters
 */
export interface GenerationParams {
  worldSeed: string;
  promptId: string;
  chunkIndex: number;
}

/**
 * Cryptographic-grade deterministic seed hashing
 * Ensures identical results for identical inputs across all runs
 */
export class SeedHasher {
  /**
   * Creates a deterministic seed from world seed, prompt ID, and chunk index
   * Uses SHA-256 to ensure cryptographic-grade determinism
   */
  static hashSeeds(worldSeed: string, promptId: string, chunkIndex: number): string {
    const combined = `${worldSeed}:${promptId}:${chunkIndex}`;
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Creates a deterministic seed from generation parameters
   */
  static hashFromParams(params: GenerationParams): string {
    return this.hashSeeds(params.worldSeed, params.promptId, params.chunkIndex);
  }

  /**
   * Validates that a seed is properly formatted
   */
  static isValidSeed(seed: string): boolean {
    return typeof seed === 'string' && seed.length === 64 && /^[a-f0-9]+$/.test(seed);
  }
}

/**
 * Deterministic Pseudo-Random Number Generator wrapper
 * Provides consistent random number generation across all environments
 */
export class DeterministicPRNG {
  private rng: seedrandom.PRNG;

  constructor(seed: string) {
    if (!SeedHasher.isValidSeed(seed)) {
      throw new Error(`Invalid seed format: ${seed}`);
    }
    this.rng = seedrandom(seed);
  }

  /**
   * Generate a random number between 0 and 1
   */
  random(): number {
    return this.rng();
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  /**
   * Generate a random float between min (inclusive) and max (exclusive)
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Choose a random element from an array
   */
  randomChoice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return array[this.randomInt(0, array.length)];
  }

  /**
   * Shuffle an array deterministically (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate a random boolean with given probability
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability;
  }

  /**
   * Generate a random 3D vector within given bounds
   */
  randomVector3(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    return {
      x: this.randomFloat(minX, maxX),
      y: this.randomFloat(minY, maxY),
      z: this.randomFloat(minZ, maxZ),
    };
  }
}

/**
 * Factory for creating deterministic generators
 * Provides a clean interface for chunk generation
 */
export class GeneratorFactory {
  /**
   * Create a deterministic PRNG for chunk generation
   */
  static createPRNG(params: GenerationParams): DeterministicPRNG {
    const seed = SeedHasher.hashFromParams(params);
    return new DeterministicPRNG(seed);
  }

  /**
   * Create a deterministic PRNG from raw seed
   */
  static createPRNGFromSeed(seed: string): DeterministicPRNG {
    return new DeterministicPRNG(seed);
  }

  /**
   * Validate generation parameters
   */
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
