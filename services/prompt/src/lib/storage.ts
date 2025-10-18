import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import { config } from '../config/env';

// Initialize Supabase client
let supabase: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error('Supabase credentials not configured');
    }

    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  return supabase;
}

/**
 * Upload result with public URL
 */
export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Download image from URL and convert to Buffer
 * 
 * @param imageUrl - URL of the image to download
 * @returns Image data as Buffer
 */
async function downloadImage(imageUrl: string): Promise<Buffer> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Image download error:', error);
    throw new Error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a skybox image to Supabase Storage
 * 
 * @param promptId - Unique prompt identifier
 * @param imageUrl - URL of the generated image from Fal.ai
 * @returns Upload result with public URL
 */
export async function uploadSkybox(
  promptId: string,
  imageUrl: string
): Promise<UploadResult> {
  try {
    const client = getSupabaseClient();
    const bucket = config.supabaseBucket;

    // Download the image from Fal.ai
    console.log('📥 Downloading skybox from Fal.ai...');
    const imageBuffer = await downloadImage(imageUrl);

    // Generate deterministic path
    const path = `skyboxes/${promptId}.jpg`;

    console.log(`📤 Uploading skybox to Supabase: ${bucket}/${path}`);

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
        cacheControl: '3600', // Cache for 1 hour
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = client.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log('✅ Skybox uploaded successfully:', publicUrlData.publicUrl);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Skybox upload error:', error);
    throw new Error(`Failed to upload skybox: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a texture image to Supabase Storage
 * 
 * @param promptId - Unique prompt identifier
 * @param textureIndex - Index for multiple textures
 * @param imageUrl - URL of the generated image from Fal.ai
 * @returns Upload result with public URL
 */
export async function uploadTexture(
  promptId: string,
  textureIndex: number,
  imageUrl: string
): Promise<UploadResult> {
  try {
    const client = getSupabaseClient();
    const bucket = config.supabaseBucket;

    // Download the image from Fal.ai
    console.log('📥 Downloading texture from Fal.ai...');
    const imageBuffer = await downloadImage(imageUrl);

    // Generate deterministic path
    const path = `textures/${promptId}_${textureIndex}.jpg`;

    console.log(`📤 Uploading texture to Supabase: ${bucket}/${path}`);

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = client.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log('✅ Texture uploaded successfully:', publicUrlData.publicUrl);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Texture upload error:', error);
    throw new Error(`Failed to upload texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload a solid color texture (from Buffer) to Supabase Storage
 * 
 * @param promptId - Unique identifier for the prompt
 * @param textureIndex - Index of this texture (for multiple textures per prompt)
 * @param imageBuffer - Buffer containing the image data
 * @returns Upload result with public URL
 */
export async function uploadSolidTexture(
  promptId: string,
  textureIndex: number,
  imageBuffer: Buffer
): Promise<UploadResult> {
  try {
    const client = getSupabaseClient();
    const bucket = config.supabaseBucket;

    // Generate deterministic path
    const path = `textures/${promptId}_${textureIndex}.png`;

    console.log(`📤 Uploading solid color texture to Supabase: ${bucket}/${path}`);

    // Upload to Supabase Storage
    const { data, error } = await client.storage
      .from(bucket)
      .upload(path, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = client.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log('✅ Solid color texture uploaded successfully:', publicUrlData.publicUrl);

    return {
      path: data.path,
      publicUrl: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Solid texture upload error:', error);
    throw new Error(`Failed to upload solid texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if an asset exists in Supabase Storage
 * 
 * @param path - Path to the asset in storage (e.g., "skyboxes/phash_123.jpg")
 * @returns True if asset exists, false otherwise
 */
export async function assetExists(path: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const bucket = config.supabaseBucket;

    // Split path into folder and filename
    const pathParts = path.split('/');
    const fileName = pathParts.pop();
    const folderPath = pathParts.join('/');

    console.log(`🔍 Checking if asset exists: ${bucket}/${path}`);

    const { data, error } = await client.storage
      .from(bucket)
      .list(folderPath || undefined, {
        search: fileName,
      });

    if (error) {
      console.log(`❌ Error checking asset: ${error.message}`);
      return false;
    }

    const exists = data && data.length > 0;
    console.log(`${exists ? '✅' : '❌'} Asset ${exists ? 'exists' : 'does not exist'}: ${path}`);
    return exists;
  } catch (error) {
    console.error('Asset check error:', error);
    return false;
  }
}

/**
 * Get public URL for an existing asset
 * 
 * @param path - Path to the asset in storage
 * @returns Public URL
 */
export function getPublicUrl(path: string): string {
  const client = getSupabaseClient();
  const bucket = config.supabaseBucket;

  const { data } = client.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

