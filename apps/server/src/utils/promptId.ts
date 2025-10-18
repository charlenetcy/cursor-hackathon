import crypto from 'crypto';

/**
 * Generate a unique promptId from input text.
 * Uses SHA-256 hash and returns a shortened hash-like string.
 * 
 * @param text - The prompt text to hash
 * @returns A unique promptId string (e.g., "phash_9c0f")
 */
export function generatePromptId(text: string): string {
  const hash = crypto.createHash('sha256')
    .update(text.trim().toLowerCase())
    .digest('hex');
  
  // Take first 8 characters of the hash and prefix with "phash_"
  const shortHash = hash.substring(0, 8);
  return `phash_${shortHash}`;
}

