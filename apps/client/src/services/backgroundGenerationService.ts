import { supabase, isSupabaseConfigured } from '../config/supabase';

export interface GeneratedImage {
  id: string;
  prompt: string;
  image_url: string;
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
 * Requests the backend to generate a new background image
 * @param prompt - Text description for the background image
 * @param userId - Optional user identifier
 * @returns Promise with generation request ID and status
 */
export async function requestBackgroundGeneration(
  prompt: string,
  userId?: string
): Promise<GenerateBackgroundResponse> {
  // TODO: Replace with actual backend API call
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/generate-background`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request generation: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error requesting background generation:', error);
    throw error;
  }
}

/**
 * Polls Supabase to check if a generated image is ready
 * @param generationId - The ID of the generation request
 * @returns Promise with the generated image data or null if not ready
 */
export async function checkGenerationStatus(
  generationId: string
): Promise<GeneratedImage | null> {
  try {
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }
    const { data, error } = await supabase
      .from('generated_backgrounds')
      .select('*')
      .eq('id', generationId)
      .single();

    if (error) {
      console.error('Error checking generation status:', error);
      return null;
    }

    return data as GeneratedImage;
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
  let delay = initialDelay;

  while (attempts < maxAttempts) {
    const result = await checkGenerationStatus(generationId);

    if (result?.status === 'completed' && result.image_url) {
      return result;
    }

    if (result?.status === 'failed') {
      console.error('Generation failed:', result.error_message);
      return null;
    }

    // Wait before next poll (exponential backoff with max 10s)
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 10000)));
    delay *= 1.5; // Increase delay for next attempt
    attempts++;
  }

  console.error('Polling timeout: Generation did not complete in time');
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

