import { supabase, isSupabaseConfigured } from '../config/supabase';

export interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
  texture_url?: string; // Add texture URL
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface GenerateBackgroundRequest {
  prompt: string;
  userId?: string;
}

export interface GenerateBackgroundResponse {
  id: string;
  status: 'pending' | 'processing';
  message: string;
}

/**
 * Requests the backend to generate a new background image using Dev C's Prompt Service
 * This calls the unified server's prompt parsing and image generation endpoints
 * 
 * @param prompt - Text description for the background image
 * @param userId - Optional user identifier (not used currently)
 * @returns Promise with generation request ID and status
 */
export async function requestBackgroundGeneration(
  prompt: string,
  userId?: string
): Promise<GenerateBackgroundResponse> {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
  try {
    console.log('🎨 Step 1: Parsing prompt with Groq...');
    
    // Step 1: Parse the prompt to get promptId
    const parseResponse = await fetch(`${BACKEND_URL}/prompt/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: prompt }),
    });

    if (!parseResponse.ok) {
      throw new Error(`Parse failed: ${parseResponse.statusText}`);
    }

    const parseData = await parseResponse.json();
    console.log('✅ Prompt parsed:', parseData.promptId);
    
    console.log('🎨 Step 2: Generating images (this may take ~15-20 seconds)...');
    
    // Step 2: Trigger generation (this is async on the backend)
    // For now, we return the promptId and the frontend will poll
    // In the future, this could trigger a background job
    
    // Return immediately with pending status
    // The frontend will poll for completion
    return {
      id: parseData.promptId,
      status: 'processing',
      message: 'Generation started',
    };
  } catch (error) {
    console.error('Error requesting background generation:', error);
    throw error;
  }
}

/**
 * Checks if images are generated for a promptId by calling the style endpoint
 * @param generationId - The promptId from the parse step
 * @returns Promise with the generated image data or null if not ready
 */
export async function checkGenerationStatus(
  generationId: string
): Promise<GeneratedImage | null> {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
  try {
    // Call the /style/byPromptId endpoint which generates and returns URLs
    const response = await fetch(`${BACKEND_URL}/style/byPromptId/${generationId}`);

    if (!response.ok) {
      // If 404 or error, generation not ready yet
      return null;
    }

    const styleData = await response.json();
    
    // Convert to GeneratedImage format expected by frontend
    // Extract both skybox and texture URLs
    const textureUrl = styleData.textureIds?.[0]; // Get first texture URL from array
    
    return {
      id: styleData.promptId,
      prompt: '', // We don't have the original prompt here
      image_url: styleData.skyboxUrl, // Skybox for background
      texture_url: textureUrl, // Texture for blocks
      status: 'completed',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error in checkGenerationStatus:', error);
    return null;
  }
}

/**
 * Polls for generation completion with exponential backoff
 * @param generationId - The ID of the generation request
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param initialDelay - Initial delay in milliseconds (default: 2000)
 * @returns Promise with the completed image or null if timeout/failed
 */
export async function pollForCompletion(
  generationId: string,
  maxAttempts: number = 30,
  initialDelay: number = 2000
): Promise<GeneratedImage | null> {
  let attempts = 0;

  console.log(`🔄 Starting polling for ${generationId}, max attempts: ${maxAttempts}`);

  while (attempts < maxAttempts) {
    console.log(`🔄 Polling attempt ${attempts+1}/${maxAttempts} for ${generationId}`);
    const result = await checkGenerationStatus(generationId);
    
    if (result?.status === 'completed' && result.image_url) {
      console.log(`✅ Generation completed for ${generationId}`, result);
      return result;
    }

    if (result?.status === 'failed') {
      console.error('❌ Generation failed:', result.error_message);
      return null;
    }

    // Wait before next poll (use initialDelay consistently)
    console.log(`⏳ Waiting ${initialDelay}ms before next poll`);  
    await new Promise(resolve => setTimeout(resolve, initialDelay));
    attempts++;
  }

  console.error('❌ Polling timeout: Generation did not complete in time');
  return null;
}

/**
 * Fetches the most recent generated background images
 * @param limit - Number of recent images to fetch (default: 10)
 * @returns Promise with array of generated images
 */
export async function fetchRecentGeneratedBackgrounds(
  limit: number = 10
): Promise<GeneratedImage[]> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return [];
    }
    const { data, error } = await supabase
      .from('generated_backgrounds')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent backgrounds:', error);
      return [];
    }

    return data as GeneratedImage[];
  } catch (error) {
    console.error('Error in fetchRecentGeneratedBackgrounds:', error);
    return [];
  }
}

/**
 * Subscribes to real-time updates for a specific generation request
 * @param generationId - The ID of the generation request
 * @param onUpdate - Callback function called when status changes
 * @returns Unsubscribe function
 */
export function subscribeToGenerationUpdates(
  generationId: string,
  onUpdate: (image: GeneratedImage) => void
): () => void {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }
  const subscription = supabase
    .channel(`generation-${generationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'generated_backgrounds',
        filter: `id=eq.${generationId}`,
      },
      (payload) => {
        console.log('Generation update received:', payload);
        onUpdate(payload.new as GeneratedImage);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}

