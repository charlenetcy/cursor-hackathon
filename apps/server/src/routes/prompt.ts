import { Router, Request, Response } from 'express';
import { ParsePromptRequest, ParsePromptResponse, ErrorResponse } from '../types/contracts';
import { parsePromptWithGroq } from '../lib/groq';
import { promptCache } from '../cache/promptCache';

const router = Router();

/**
 * POST /prompt/parse
 * 
 * Parses a text prompt using Groq AI and returns normalized tags for styling future chunks.
 * 
 * Request Body: { "text": "string" }
 * Response: { "promptId", "palette", "motifs", "mechanics", "difficulty" }
 */
router.post('/parse', async (req: Request<{}, ParsePromptResponse | ErrorResponse, ParsePromptRequest>, res: Response<ParsePromptResponse | ErrorResponse>) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text field is required and must be a non-empty string',
      });
      return;
    }

    console.log(`🎯 Parsing prompt: "${text}"`);

    // Parse the prompt using Groq
    const result = await parsePromptWithGroq(text);

    // Cache the result for later retrieval by /style endpoint
    // IMPORTANT: Store original text so we don't lose context like "at night"
    promptCache.set(result.promptId, result, text);

    console.log(`✅ Prompt parsed successfully: ${result.promptId}`);

    // Return successful response
    res.status(201).json(result);
  } catch (error) {
    console.error('Error parsing prompt:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to parse prompt',
    });
  }
});

export default router;

