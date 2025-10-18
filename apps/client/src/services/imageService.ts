import { supabase } from '../config/supabase';

export interface BackgroundImage {
  id: string;
  level: number;
  image_url: string;
  bucket_path?: string;
  created_at?: string;
}

export async function uploadPngToBucket(
  file: File,
  bucketName: string = 'game-assets',
  folderPath: string = 'skins'
): Promise<string | null> {
  try {
    if (!supabase) {
      console.warn('Supabase not configured; uploadPngToBucket returning null');
      return null;
    }
    if (!file || file.type !== 'image/png') {
      console.error('Only PNG files are supported');
      return null;
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const path = folderPath ? `${folderPath}/${fileName}` : fileName;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, file, { cacheControl: 'public, max-age=31536000', upsert: false, contentType: 'image/png' });

    if (error) {
      console.error('Error uploading PNG:', error);
      return null;
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('uploadPngToBucket error:', e);
    return null;
  }
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
    const sb = supabase!;
    const { data, error } = await sb.storage
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
        const { data: urlData } = sb.storage
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
    const sb = supabase!;
    const { data, error } = await sb
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
    const sb = supabase!;
    const { data, error } = await sb
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
  const sb = supabase!;
  const { data } = sb.storage.from(bucketName).getPublicUrl(filePath);
  return data.publicUrl;
}

