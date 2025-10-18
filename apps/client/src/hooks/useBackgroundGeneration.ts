import { useState, useCallback, useRef } from 'react';
import {
  requestBackgroundGeneration,
  pollForCompletion,
  subscribeToGenerationUpdates,
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
 * @param onImageReady - Callback function called when new image is ready
 * @returns Generation state and control functions
 */
export function useBackgroundGeneration(
  onImageReady?: (imageUrl: string) => void
): UseBackgroundGenerationReturn {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setCurrentImage(null);
    setError(null);
    setProgress('');
    
    // Clean up any active subscriptions
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
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

      // Request generation from backend
      const response = await requestBackgroundGeneration(prompt);
      
      setStatus('processing');
      setProgress('Generating your background image...');

      // Option 1: Use real-time subscription (preferred for instant updates)
      const unsubscribe = subscribeToGenerationUpdates(response.id, (updatedImage) => {
        console.log('Real-time update:', updatedImage);
        
        if (updatedImage.status === 'completed' && updatedImage.image_url) {
          setCurrentImage(updatedImage);
          setStatus('completed');
          setProgress('Background ready!');
          
          // Notify parent component
          if (onImageReady) {
            onImageReady(updatedImage.image_url);
          }
          
          // Clean up subscription
          unsubscribe();
        } else if (updatedImage.status === 'failed') {
          setError(updatedImage.error_message || 'Generation failed');
          setStatus('failed');
          setProgress('');
          unsubscribe();
        }
      });
      
      unsubscribeRef.current = unsubscribe;

      // Option 2: Fallback to polling if real-time doesn't work
      // (Can be removed if real-time works reliably)
      setTimeout(async () => {
        // Only poll if still processing after 5 seconds
        if (status === 'processing') {
          setProgress('Still generating... (this may take a minute)');
          
          const result = await pollForCompletion(response.id);
          
          if (result?.status === 'completed' && result.image_url) {
            setCurrentImage(result);
            setStatus('completed');
            setProgress('Background ready!');
            
            if (onImageReady) {
              onImageReady(result.image_url);
            }
          } else if (!result) {
            setError('Generation timeout or failed');
            setStatus('failed');
            setProgress('');
          }
          
          // Clean up subscription after polling completes
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
        }
      }, 5000);

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

