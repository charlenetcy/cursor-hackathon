import { useState, useCallback } from 'react';
import {
  requestBackgroundGeneration,
  pollForCompletion,
  GeneratedImage,
} from '../services/backgroundGenerationService';

export type GenerationStatus = 'idle' | 'requesting' | 'processing' | 'completed' | 'failed';

interface UseBackgroundGenerationReturn {
  status: GenerationStatus;
  currentImage: GeneratedImage | null;
  error: string | null;
  progress: string;
  generateBackground: (prompt: string) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for managing background image generation
 * @param onImageReady - Callback function called when new images are ready (skybox and texture)
 * @returns Generation state and control functions
 */
export function useBackgroundGeneration(
  onImageReady?: (imageUrl: string, textureUrl?: string) => void
): UseBackgroundGenerationReturn {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentImage(null);
    setError(null);
    setProgress('');
  }, []);

  const generateBackground = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    try {
      setStatus('requesting');
      setError(null);
      setProgress('Sending request to server...');

      // Request generation from backend (parses and returns promptId)
      const response = await requestBackgroundGeneration(prompt);
      
      setStatus('processing');
      setProgress('Generating your background image (~15-20 seconds)...');

      console.log('🔄 Starting image generation for promptId:', response.id);

      // Poll for completion (no Supabase realtime needed)
      const result = await pollForCompletion(response.id, 20, 3000);
      
      if (result?.status === 'completed' && result.image_url) {
        console.log('✅ Generation complete!');
        console.log('🖼️ Skybox URL:', result.image_url);
        console.log('🎨 Texture URL:', result.texture_url);
        setCurrentImage(result);
        setStatus('completed');
        setProgress('Background ready!');
        
        if (onImageReady) {
          onImageReady(result.image_url, result.texture_url);
        }
      } else {
        console.log('❌ Generation failed or timeout');
        setError('Generation timeout or failed');
        setStatus('failed');
        setProgress('');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate background';
      console.error('Background generation error:', err);
      setError(errorMessage);
      setStatus('failed');
      setProgress('');
    }
  }, [onImageReady, status]);

  return {
    status,
    currentImage,
    error,
    progress,
    generateBackground,
    reset,
  };
}

