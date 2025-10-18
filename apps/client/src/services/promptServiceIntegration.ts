/**
 * Integration layer between frontend and Dev C's Prompt Service
 * This connects the UI to your prompt/style generation service
 */

// Unified server now handles both game and prompt service
const PROMPT_SERVICE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface PromptServiceResponse {
  promptId: string;
  skyboxUrl: string;
  textureUrl: string;
  palette: string[];
  motifs: string[];
}

/**
 * Generates skybox and texture from a text prompt
 * This is a single call that waits for generation to complete (~15-20s)
 * 
 * @param prompt - Text description (e.g., "Japanese temple at sunset")
 * @returns Promise with skybox URL, texture URL, and theme data
 */
export async function generateFromPrompt(prompt: string): Promise<PromptServiceResponse> {
  console.log('🎨 Starting generation for:', prompt);
  
  try {
    // Step 1: Parse the prompt with Groq AI (~1 second)
    console.log('📝 Step 1/2: Parsing prompt with AI...');
    const parseResponse = await fetch(`${PROMPT_SERVICE_URL}/prompt/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt }),
    });

    if (!parseResponse.ok) {
      const errorText = await parseResponse.text();
      throw new Error(`Parse failed: ${errorText}`);
    }

    const parseData = await parseResponse.json();
    console.log('✅ Prompt parsed:', parseData);

    // Step 2: Generate and retrieve style assets (~15 seconds)
    console.log('🎨 Step 2/2: Generating skybox and texture (this may take 15-20 seconds)...');
    const styleResponse = await fetch(
      `${PROMPT_SERVICE_URL}/style/byPromptId/${parseData.promptId}`
    );
    
    if (!styleResponse.ok) {
      const errorText = await styleResponse.text();
      throw new Error(`Generation failed: ${errorText}`);
    }

    const styleData = await styleResponse.json();
    console.log('✅ Images generated and stored in Supabase:', styleData);

    return {
      promptId: parseData.promptId,
      skyboxUrl: styleData.skyboxUrl,
      textureUrl: styleData.textureIds[0],
      palette: styleData.palette,
      motifs: styleData.motifIds,
    };
  } catch (error) {
    console.error('❌ Generation error:', error);
    throw error;
  }
}

/**
 * Checks if assets already exist for a prompt (cached in Supabase)
 * Useful for showing previously generated backgrounds instantly
 * 
 * @param prompt - Text description to check
 * @returns Promise<boolean> - true if already generated
 */
export async function checkIfCached(prompt: string): Promise<boolean> {
  try {
    // Parse to get promptId (deterministic, same prompt = same ID)
    const parseResponse = await fetch(`${PROMPT_SERVICE_URL}/prompt/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: prompt }),
    });

    const parseData = await parseResponse.json();
    
    // Try to fetch style (will use cached if exists)
    const styleResponse = await fetch(
      `${PROMPT_SERVICE_URL}/style/byPromptId/${parseData.promptId}`
    );
    
    return styleResponse.ok;
  } catch {
    return false;
  }
}

/**
 * Health check to verify the prompt service is running
 * @returns Promise<boolean> - true if service is healthy
 */
export async function checkServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${PROMPT_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

