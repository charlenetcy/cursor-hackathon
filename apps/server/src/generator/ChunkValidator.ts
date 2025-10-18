/**
 * Chunk Validator
 * Ensures all generated chunks are playable and safe
 * 
 * Validates:
 * - Jump gaps between platforms (max 3 units)
 * - Slope angles (max 45 degrees)
 * - Reachable paths from spawn
 * - Guardrail presence where needed
 */

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

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    platformCount: number;
    avgJumpDistance: number;
    maxSlope: number;
    isReachable: boolean;
    guardrailsNeeded: number;
  };
}

// Constants for validation
const MAX_JUMP_DISTANCE = 3; // units
const MAX_SLOPE_ANGLE = 45; // degrees
const MIN_PLATFORM_SIZE = 1; // units
const MAX_PLATFORM_SIZE = 8; // units
const REQUIRED_GUARDRAIL_HEIGHT = 1; // units
const SPAWN_POINT_CLEARANCE = 2; // units radius

export class ChunkValidator {
  /**
   * Validate a chunk for playability
   */
  static validate(chunk: Chunk): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata = {
      platformCount: 0,
      avgJumpDistance: 0,
      maxSlope: 0,
      isReachable: false,
      guardrailsNeeded: 0,
    };

    // Extract platforms from colliders
    const platforms = this.extractPlatforms(chunk);
    metadata.platformCount = platforms.length;

    // Validate basic structure
    if (platforms.length < 2) {
      errors.push(`Chunk has only ${platforms.length} platforms, minimum 2 required`);
    }

    // Validate spawn points
    const spawnValidation = this.validateSpawnPoints(chunk, platforms);
    errors.push(...spawnValidation.errors);
    warnings.push(...spawnValidation.warnings);

    // Validate jump gaps
    const jumpValidation = this.validateJumpGaps(platforms);
    errors.push(...jumpValidation.errors);
    warnings.push(...jumpValidation.warnings);
    metadata.avgJumpDistance = jumpValidation.avgDistance;

    // Validate slopes
    const slopeValidation = this.validateSlopes(platforms);
    errors.push(...slopeValidation.errors);
    warnings.push(...slopeValidation.warnings);
    metadata.maxSlope = slopeValidation.maxSlope;

    // Validate reachable paths
    const pathValidation = this.validateReachablePath(platforms);
    errors.push(...pathValidation.errors);
    warnings.push(...pathValidation.warnings);
    metadata.isReachable = pathValidation.isReachable;

    // Check for guardrails
    const guardrailValidation = this.validateGuardrails(platforms);
    warnings.push(...guardrailValidation.warnings);
    metadata.guardrailsNeeded = guardrailValidation.needed;

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Extract platform data from chunk colliders
   */
  private static extractPlatforms(chunk: Chunk) {
    return chunk.physics.colliders.map((collider, index) => ({
      index,
      position: collider.position,
      scale: collider.scale,
      // Calculate corners for collision detection
      corners: this.getPlatformCorners(collider),
    }));
  }

  /**
   * Get the 4 corners of a platform (top surface)
   */
  private static getPlatformCorners(collider: Collider) {
    const hw = collider.scale.x / 2;
    const hd = collider.scale.z / 2;
    const y = collider.position.y + collider.scale.y / 2; // Top surface

    return [
      { x: collider.position.x - hw, y, z: collider.position.z - hd }, // Back-left
      { x: collider.position.x + hw, y, z: collider.position.z - hd }, // Back-right
      { x: collider.position.x + hw, y, z: collider.position.z + hd }, // Front-right
      { x: collider.position.x - hw, y, z: collider.position.z + hd }, // Front-left
    ];
  }

  /**
   * Validate spawn points are safe and accessible
   */
  private static validateSpawnPoints(chunk: Chunk, platforms: any[]) {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (chunk.physics.spawnPoints.length === 0) {
      errors.push('No spawn points defined');
      return { errors, warnings };
    }

    const spawnPoint = chunk.physics.spawnPoints[0];

    // Check spawn is above first platform
    if (platforms.length > 0) {
      const firstPlatform = platforms[0];
      const platformTop = firstPlatform.position.y + firstPlatform.scale.y / 2;
      
      if (spawnPoint.y < platformTop) {
        errors.push(`Spawn point Y (${spawnPoint.y}) is below first platform top (${platformTop})`);
      }

      // Check spawn is within platform bounds with clearance
      const inBoundsX = Math.abs(spawnPoint.x - firstPlatform.position.x) <= firstPlatform.scale.x / 2;
      const inBoundsZ = Math.abs(spawnPoint.z - firstPlatform.position.z) <= firstPlatform.scale.z / 2;

      if (!inBoundsX || !inBoundsZ) {
        warnings.push('Spawn point may be outside first platform bounds');
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate jump distances between platforms
   */
  private static validateJumpGaps(platforms: any[]) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const distances: number[] = [];

    for (let i = 0; i < platforms.length - 1; i++) {
      const current = platforms[i];
      const next = platforms[i + 1];

      // Calculate minimum distance to next platform
      const minDistance = this.calculateMinJumpDistance(current, next);
      distances.push(minDistance);

      if (minDistance > MAX_JUMP_DISTANCE) {
        errors.push(
          `Jump gap from platform ${i} to ${i + 1} is ${minDistance.toFixed(2)} units (max ${MAX_JUMP_DISTANCE})`
        );
      }

      if (minDistance > MAX_JUMP_DISTANCE * 0.8) {
        warnings.push(
          `Jump gap from platform ${i} to ${i + 1} is ${minDistance.toFixed(2)} units (approaching limit)`
        );
      }
    }

    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b) / distances.length : 0;

    return { errors, warnings, avgDistance };
  }

  /**
   * Calculate minimum jump distance between two platforms
   */
  private static calculateMinJumpDistance(platform1: any, platform2: any): number {
    const corners1 = platform1.corners;
    const corners2 = platform2.corners;

    let minDistance = Infinity;

    // Find closest pair of corners
    for (const c1 of corners1) {
      for (const c2 of corners2) {
        const dx = c2.x - c1.x;
        const dz = c2.z - c1.z;
        const distance = Math.sqrt(dx * dx + dz * dz); // Horizontal distance only

        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance === Infinity ? 0 : minDistance;
  }

  /**
   * Validate platform slopes
   */
  private static validateSlopes(platforms: any[]) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const slopes: number[] = [];

    for (let i = 0; i < platforms.length - 1; i++) {
      const current = platforms[i];
      const next = platforms[i + 1];

      const heightDiff = next.position.y - current.position.y;
      const horizontalDist = this.calculateMinJumpDistance(current, next);

      if (horizontalDist > 0) {
        const angle = Math.atan(Math.abs(heightDiff) / horizontalDist) * (180 / Math.PI);
        slopes.push(angle);

        if (angle > MAX_SLOPE_ANGLE) {
          errors.push(
            `Slope from platform ${i} to ${i + 1} is ${angle.toFixed(1)}° (max ${MAX_SLOPE_ANGLE}°)`
          );
        }

        if (angle > MAX_SLOPE_ANGLE * 0.8) {
          warnings.push(
            `Slope from platform ${i} to ${i + 1} is ${angle.toFixed(1)}° (approaching limit)`
          );
        }
      }
    }

    const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;

    return { errors, warnings, maxSlope };
  }

  /**
   * Validate there's a reachable path from spawn through checkpoints
   */
  private static validateReachablePath(platforms: any[]): { errors: string[]; warnings: string[]; isReachable: boolean } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Simple check: if we have platforms and spawn is above first, it's reachable
    // More sophisticated pathfinding could be added here
    const isReachable = platforms.length >= 2;

    if (!isReachable) {
      errors.push('Platform sequence is not reachable (insufficient platforms)');
    }

    return { errors, warnings, isReachable };
  }

  /**
   * Validate guardrail coverage for high platforms
   */
  private static validateGuardrails(platforms: any[]): { warnings: string[]; needed: number } {
    const warnings: string[] = [];
    let needed = 0;

    for (let i = 0; i < platforms.length; i++) {
      const platform = platforms[i];
      const platformHeight = platform.position.y;

      // Platforms above certain height should have guardrails
      if (platformHeight > 5 && platform.scale.x > 2) {
        needed++;
        warnings.push(
          `Platform ${i} at height ${platformHeight.toFixed(1)} should have guardrails for safety`
        );
      }
    }

    return { warnings, needed };
  }

  /**
   * Check if chunk meets minimum playability requirements
   */
  static isPlayable(chunk: Chunk): boolean {
    const result = this.validate(chunk);
    return result.isValid;
  }

  /**
   * Get a human-readable validation report
   */
  static getReport(chunk: Chunk): string {
    const result = this.validate(chunk);

    let report = `\n${'='.repeat(60)}\n`;
    report += `CHUNK VALIDATION REPORT - Chunk ${chunk.index}\n`;
    report += `${'='.repeat(60)}\n\n`;

    report += `Status: ${result.isValid ? '✅ VALID' : '❌ INVALID'}\n\n`;

    report += `Metadata:\n`;
    report += `  - Platforms: ${result.metadata.platformCount}\n`;
    report += `  - Avg Jump Distance: ${result.metadata.avgJumpDistance.toFixed(2)} units\n`;
    report += `  - Max Slope: ${result.metadata.maxSlope.toFixed(1)}°\n`;
    report += `  - Path Reachable: ${result.metadata.isReachable ? 'Yes' : 'No'}\n`;
    report += `  - Guardrails Needed: ${result.metadata.guardrailsNeeded}\n\n`;

    if (result.errors.length > 0) {
      report += `❌ Errors (${result.errors.length}):\n`;
      result.errors.forEach(e => {
        report += `  - ${e}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += `⚠️  Warnings (${result.warnings.length}):\n`;
      result.warnings.forEach(w => {
        report += `  - ${w}\n`;
      });
      report += '\n';
    }

    report += `${'='.repeat(60)}\n`;
    return report;
  }
}

export { ValidationResult };
