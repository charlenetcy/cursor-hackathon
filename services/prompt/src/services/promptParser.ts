import { ParsePromptResponse } from '../types/contracts';
import { generatePromptId } from '../utils/promptId';

/**
 * Mock prompt parser for MVP.
 * Returns a fixed, valid JSON payload for any input text.
 * Uses the input text to generate a unique promptId.
 * 
 * Future: Integrate with Groq LLM for advanced parsing.
 * 
 * @param text - The prompt text from the user
 * @returns ParsePromptResponse with fixed mock data and unique promptId
 */
export function parsePrompt(text: string): ParsePromptResponse {
  // Generate unique promptId from input text
  const promptId = generatePromptId(text);

  // Return fixed mock response for MVP
  // In production, this would use rule-based parsing + LLM fallback
  return {
    promptId,
    palette: ['#f5f5f5', '#2e7d32', '#263238'],
    motifs: ['columns', 'flags'],
    mechanics: [],
    difficulty: 2,
  };
}

