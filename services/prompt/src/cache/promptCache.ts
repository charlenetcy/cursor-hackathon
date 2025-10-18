import { ParsePromptResponse } from '../types/contracts';

/**
 * In-memory cache for promptId -> ParsePromptResponse mappings
 * This allows the /style endpoint to retrieve parsed prompt data
 * 
 * In production, this would be replaced with Redis or a database
 */
class PromptCache {
  private cache: Map<string, ParsePromptResponse>;

  constructor() {
    this.cache = new Map();
  }

  /**
   * Store a parsed prompt result
   */
  set(promptId: string, data: ParsePromptResponse): void {
    this.cache.set(promptId, data);
    console.log(`📝 Cached prompt data for: ${promptId}`);
  }

  /**
   * Retrieve a parsed prompt result
   */
  get(promptId: string): ParsePromptResponse | undefined {
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

