import Groq from 'groq-sdk';
import { config } from '../config/env';
import { ParsePromptResponse } from '../types/contracts';
import { generatePromptId } from '../utils/promptId';

// Initialize Groq client
const groq = new Groq({
  apiKey: config.groqApiKey,
});

/**
 * JSON Schema for ParsePromptResponse
 * This schema enforces the structure returned by Groq
 */
const PARSE_PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    palette: {
      type: 'array',
      items: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
      minItems: 3,
      maxItems: 5,
      description: 'Array of hex color codes for the theme palette',
    },
    motifs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Visual motifs and decorative elements (e.g., columns, flags, lanterns)',
    },
    difficulty: {
      type: 'number',
      minimum: 1,
      maximum: 5,
      description: 'Difficulty level from 1 (easy) to 5 (extreme)',
    },
  },
  required: ['palette', 'motifs', 'difficulty'],
};

/**
 * System prompt for Groq to act as a Game Style Interpreter
 */
const SYSTEM_PROMPT = `You are a Game Style Interpreter for a multiplayer parkour game. 
Your job is to analyze text prompts and convert them into structured JSON data for styling game chunks.

Rules:
1. Extract a color palette (3-5 hex colors) that matches the theme
2. Identify visual motifs (architectural elements, decorations, cultural references)
3. Assign a difficulty level (1-5) based on the theme's visual complexity

Examples:
- "White House gardens" → palette: ["#ffffff","#2e7d32","#757575"], motifs: ["columns","flags","fountain"], difficulty: 2
- "Japanese temple at sunset" → palette: ["#d32f2f","#ffd700","#1a1a1a"], motifs: ["pagoda","lanterns","torii"], difficulty: 3
- "Cyberpunk neon city" → palette: ["#00ffff","#ff00ff","#0a0a0a"], motifs: ["holograms","neon-signs","wires"], difficulty: 4

Return ONLY valid JSON matching the schema. No explanations or markdown.`;

/**
 * Parse a text prompt using Groq's structured JSON output
 * 
 * @param text - The user's prompt text
 * @returns ParsePromptResponse with AI-generated style data
 */
export async function parsePromptWithGroq(text: string): Promise<ParsePromptResponse> {
  try {
    // Generate unique promptId
    const promptId = generatePromptId(text);

    // Call Groq with structured JSON output
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Updated model (3.1 was deprecated)
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Analyze this prompt and return JSON: "${text}"`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });

    // Extract and parse the JSON response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from Groq');
    }

    const parsed = JSON.parse(responseContent);

    // Validate and return with promptId
    return {
      promptId,
      palette: parsed.palette || ['#f5f5f5', '#2e7d32', '#263238'],
      motifs: parsed.motifs || [],
      mechanics: [], // Always empty - mechanics not used
      difficulty: parsed.difficulty || 2,
    };
  } catch (error) {
    console.error('Groq parsing error:', error);
    
    // Fallback to safe defaults if Groq fails
    return {
      promptId: generatePromptId(text),
      palette: ['#f5f5f5', '#2e7d32', '#263238'],
      motifs: ['generic'],
      mechanics: [], // Always empty - mechanics not used
      difficulty: 2,
    };
  }
}

/**
 * Get the JSON schema for prompt parsing
 */
export function getPromptSchema() {
  return PARSE_PROMPT_SCHEMA;
}

