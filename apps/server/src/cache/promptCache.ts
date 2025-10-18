import { ParsePromptResponse } from '../types/contracts';

/**
 * Cached prompt data includes both the parsed response and original text
 */
export interface CachedPromptData extends ParsePromptResponse {
  originalPrompt?: string; // Keep original user input for better context
}

/**
 * In-memory cache for promptId -> ParsePromptResponse mappings
 * This allows the /style endpoint to retrieve parsed prompt data
 * 
 * In production, this would be replaced with Redis or a database
 */
class PromptCache {
  private cache: Map<string, CachedPromptData>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Store a parsed prompt result with original text
   */
  set(promptId: string, data: ParsePromptResponse, originalPrompt?: string): void {
    const cachedData: CachedPromptData = {
      ...data,
      originalPrompt,
    };
    this.cache.set(promptId, cachedData);
    console.log(`📝 Cached prompt data for: ${promptId} (original: "${originalPrompt}")`);
  }

  /**
   * Retrieve a parsed prompt result
   */
  get(promptId: string): CachedPromptData | undefined {
    return this.cache.get(promptId);
  }

  /**
   * Check if a promptId exists in cache
   */
  has(promptId: string): boolean {
    return this.cache.has(promptId);
  }

  /**
   * Remove a promptId from cache
   */
  delete(promptId: string): boolean {
    return this.cache.delete(promptId);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const promptCache = new PromptCache();

