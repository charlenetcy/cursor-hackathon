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
 * Generate a dynamic brainrot script using Groq AI
 * 
 * @param userPrompt - Optional user prompt to influence the script
 * @returns Generated brainrot script string
 */
export async function generateBrainrotScript(userPrompt?: string): Promise<string> {
  try {
    const systemPrompt = `You are a TikTok brainrot content creator who makes energetic, over-the-top commentary for parkour gameplay videos. 

Your job is to generate a 1-minute script (approximately 150-200 words) that includes:
- High energy, repetitive phrases
- TikTok-style language ("BOOM!", "That's crazy!", "Built different!")
- Parkour/gaming references
- Call-to-action phrases ("smash that like button", "subscribe")
- Exaggerated reactions and excitement
- Some randomness and chaos

Style guidelines:
- Use lots of exclamation points and caps
- Include sound effects like "BOOM!", "WOO!", "YEAH!"
- Be overly enthusiastic about everything
- Include some self-referential humor
- End with typical TikTok outro

${userPrompt ? `Incorporate this theme or idea: "${userPrompt}"` : 'Make it about parkour and gaming in general.'}

Return ONLY the script text, no explanations or markdown formatting.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt ? `Generate a brainrot script incorporating: "${userPrompt}"` : 'Generate a random brainrot script about parkour gaming!',
        },
      ],
      temperature: 0.9, // High creativity for variety
      max_tokens: 400,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Empty response from Groq for brainrot script');
    }

    // Clean up the response (remove any markdown formatting)
    const cleanScript = responseContent
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .trim();

    console.log(`🎤 Generated brainrot script (${cleanScript.length} chars):`, cleanScript.substring(0, 100) + '...');
    
    return cleanScript;
  } catch (error) {
    console.error('Groq brainrot script generation error:', error);
    
    // Fallback to the original fixed script if Groq fails
    return generateFallbackBrainrotScript();
  }
}

/**
 * Fallback brainrot script if Groq fails
 */
function generateFallbackBrainrotScript(): string {
  const segments = [
    "Yo yo yo! What's good gamers!",
    "Today we're doing PARKOUR!",
    "But first, smash that like button!",
    "And don't forget to subscribe!",
    "Okay okay, let's get into it!",
    "So basically, I'm jumping on blocks.",
    "And it's like, totally insane!",
    "Look at this move! BOOM!",
    "Did you see that? That was crazy!",
    "Oh my gosh, I almost fell!",
    "That was so close!",
    "But I'm built different!",
    "You know what I mean?",
    "I'm just built different!",
    "This is what peak performance looks like!",
    "Look at this jump!",
    "BOOM! Another one!",
    "And another one!",
    "We're just getting started!",
    "This is only the beginning!",
    "Wait, what's that sound?",
    "Oh, it's just my notifications!",
    "But I'm focused!",
    "I'm in the zone!",
    "Nothing can stop me now!",
    "Except maybe this gap...",
    "Oh wait, I got this!",
    "Easy peasy lemon squeezy!",
    "That's how we do it!",
    "Another victory for the books!",
    "But wait, there's more!",
    "We're not done yet!",
    "This is just getting good!",
    "Look at this next section!",
    "It's about to get wild!",
    "Are you ready for this?",
    "Because I'm ready!",
    "Let's go! Let's go! Let's go!",
    "This is the moment!",
    "The moment we've all been waiting for!",
    "And here we go!",
    "BOOM! BOOM! BOOM!",
    "Three in a row!",
    "That's how you do it!",
    "That's how you parkour!",
    "But we're not stopping here!",
    "We're going all the way!",
    "To the top!",
    "To the very top!",
    "And when we get there...",
    "We'll celebrate!",
    "With a victory dance!",
    "But first, let's finish this!",
    "One more jump!",
    "Two more jumps!",
    "Three more jumps!",
    "We're almost there!",
    "Just a little bit more!",
    "And... BOOM!",
    "We did it!",
    "We actually did it!",
    "That was incredible!",
    "That was amazing!",
    "That was... that was everything!",
    "And that's a wrap!",
    "Don't forget to like and subscribe!",
    "And I'll see you in the next video!",
    "Peace out!",
  ];

  return segments.join(" ");
}

/**
 * Get the JSON schema for prompt parsing
 */
export function getPromptSchema() {
  return PARSE_PROMPT_SCHEMA;
}

