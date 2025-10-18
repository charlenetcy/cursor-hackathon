import { StyleResponse } from '../types/contracts';

/**
 * Mock style service for MVP.
 * Returns a fixed, valid style payload for any promptId.
 * 
 * Future: Integrate with Fal.ai/Meshy for texture/skybox generation,
 * and cache results in CDN (R2/S3).
 * 
 * @param promptId - The unique prompt identifier
 * @returns StyleResponse with fixed mock data including apiVersion v1
 */
export function getStyleByPromptId(promptId: string): StyleResponse {
  // Return fixed mock response for MVP
  // In production, this would retrieve from cache or generate via 2D asset API
  return {
    promptId,
    palette: ['#f5f5f5', '#2e7d32', '#263238'],
    skyboxUrl: 'https://cdn.parkourworld.io/sky/sha2.eq',
    textureIds: ['tx_stone_002'],
    motifIds: ['columns', 'flags'],
    version: 'v1',
  };
}

/**
 * Check if a style exists for a given promptId.
 * 
 * @param promptId - The unique prompt identifier
 * @returns true if style exists, false otherwise
 */
export function styleExists(promptId: string): boolean {
  // For MVP, all promptIds have a style (mock data)
  // In production, this would check cache/database
  return promptId.startsWith('phash_');
}

