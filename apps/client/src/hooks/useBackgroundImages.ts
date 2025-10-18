import { useState, useEffect } from 'react';
import { fetchImagesFromDatabase, BackgroundImage } from '../services/imageService';

interface UseBackgroundImagesReturn {
  images: Map<number, string>; // Map of level -> image URL
  isLoading: boolean;
  error: string | null;
  getImageForLevel: (level: number) => string | undefined;
}

/**
 * Custom hook to fetch and manage background images from Supabase
 * @param tableName - Optional table name (defaults to 'background_images')
 * @param fallbackImages - Optional fallback images if Supabase fetch fails
 * @returns Object containing images map, loading state, error, and helper function
 */
export function useBackgroundImages(
  tableName: string = 'background_images',
  fallbackImages?: Map<number, string>
): UseBackgroundImagesReturn {
  const [images, setImages] = useState<Map<number, string>>(
    fallbackImages || new Map()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const backgroundImages = await fetchImagesFromDatabase(tableName);

        if (backgroundImages.length === 0) {
          throw new Error('No images found in database');
        }

        // Convert array to Map for easy lookup by level
        const imageMap = new Map<number, string>();
        backgroundImages.forEach((img: BackgroundImage) => {
          imageMap.set(img.level, img.image_url);
        });

        setImages(imageMap);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load images';
        console.error('Error loading background images:', errorMessage);
        setError(errorMessage);

        // If fallback images are provided, use them
        if (fallbackImages) {
          setImages(fallbackImages);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [tableName]);

  const getImageForLevel = (level: number): string | undefined => {
    return images.get(level);
  };

  return {
    images,
    isLoading,
    error,
    getImageForLevel,
  };
}

