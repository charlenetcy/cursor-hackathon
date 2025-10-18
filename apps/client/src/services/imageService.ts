import { supabase } from '../config/supabase';

export interface BackgroundImage {
  id: string;
  level: number;
  image_url: string;
  bucket_path?: string;
  created_at?: string;
}

/**
 * Fetches background images from Supabase storage
 * @param bucketName - The name of the Supabase storage bucket
 * @param folderPath - Optional folder path within the bucket
 * @returns Array of public URLs for the images
 */
export async function fetchImagesFromStorage(
  bucketName: string,
  folderPath: string = ''
): Promise<string[]> {
  try {
    if (!supabase) {
      console.warn('Supabase not configured; fetchImagesFromStorage returning empty list');
      return [];
    }
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);

    if (error) {
      console.error('Error fetching images from Supabase storage:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('No images found in Supabase storage');
      return [];
    }

    // Get public URLs for each image
    const imageUrls = data
      .filter(file => {
        // Filter for image files only
        const ext = file.name.toLowerCase();
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
               ext.endsWith('.png') || ext.endsWith('.webp');
      })
      .map(file => {
        const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        return urlData.publicUrl;
      });

    return imageUrls;
  } catch (error) {
    console.error('Error in fetchImagesFromStorage:', error);
    return [];
  }
}

/**
 * Fetches background images from a Supabase database table
 * Assumes table structure: { id, level, image_url, ... }
 * @param tableName - The name of the database table
 * @returns Array of BackgroundImage objects
 */
export async function fetchImagesFromDatabase(
  tableName: string = 'background_images'
): Promise<BackgroundImage[]> {
  try {
    if (!supabase) {
      console.warn('Supabase not configured; fetchImagesFromDatabase returning empty list');
      return [];
    }
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.error('Error fetching images from Supabase database:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchImagesFromDatabase:', error);
    return [];
  }
}

/**
 * Fetches a specific background image for a given level
 * @param level - The game level number
 * @param tableName - The name of the database table
 * @returns BackgroundImage object or null
 */
export async function fetchImageForLevel(
  level: number,
  tableName: string = 'background_images'
): Promise<BackgroundImage | null> {
  try {
    if (!supabase) {
      console.warn('Supabase not configured; fetchImageForLevel returning null');
      return null;
    }
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('level', level)
      .single();

    if (error) {
      console.error(`Error fetching image for level ${level}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchImageForLevel:', error);
    return null;
  }
}

/**
 * Helper to convert a storage bucket path to a public URL
 * @param bucketName - The name of the Supabase storage bucket
 * @param filePath - The file path within the bucket
 * @returns Public URL string
 */
export function getPublicUrl(bucketName: string, filePath: string): string {
  if (!supabase) {
    console.warn('Supabase not configured; getPublicUrl returning empty string');
    return '';
  }
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

