import { createHash } from 'crypto';

// Utility Functions
export function hashSeeds(worldSeed: string, promptId: string, chunkIndex: number): string {
  const combined = `${worldSeed}:${promptId}:${chunkIndex}`;
  // Use SHA-256 for cryptographic-grade deterministic hashing
  return createHash('sha256').update(combined).digest('hex');
}

export function generatePromptId(text: string): string {
  // Simple hash-based prompt ID generation
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `phash_${Math.abs(hash).toString(16)}`;
}

export function distance3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVector3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, t: number) {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

export function createVector3(x: number = 0, y: number = 0, z: number = 0) {
  return { x, y, z };
}

export function addVector3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function multiplyVector3(v: { x: number; y: number; z: number }, scalar: number) {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  };
}
