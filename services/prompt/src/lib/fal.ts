import * as fal from '@fal-ai/serverless-client';
import { config } from '../config/env';

// Configure Fal.ai client
fal.config({
  credentials: config.falKey,
});

/**
 * Asset generation result from Fal.ai
 */
export interface GeneratedAsset {
  url: string;
  contentType: string;
  width: number;
  height: number;
}

/**
 * Generation request parameters
 */
export interface GenerationParams {
  palette: string[];
  motifs: string[];
  assetType: 'skybox' | 'texture';
}

/**
 * Determine the appropriate realistic material type based on motifs
 */
function determineMaterialType(motifs: string[]): string {
  const motifsText = motifs.join(' ').toLowerCase();
  
  // Asian/Eastern themes
  if (/temple|pagoda|torii|lantern|shrine|zen|japanese|chinese|asian/.test(motifsText)) {
    return 'dark wood planks'; // Traditional Eastern architecture
  }
  
  // Medieval/Castle themes
  if (/castle|medieval|knight|fortress|battlements|turret|moat/.test(motifsText)) {
    return 'weathered stone blocks'; // Medieval masonry
  }
  
  // Desert/Ancient themes
  if (/pyramid|egypt|desert|sand|ancient|pharaoh/.test(motifsText)) {
    return 'sandstone bricks'; // Ancient desert architecture
  }
  
  // Modern/Urban themes
  if (/city|urban|building|skyscraper|office|modern/.test(motifsText)) {
    return 'concrete panels'; // Modern construction
  }
  
  // Cyberpunk/Futuristic
  if (/cyberpunk|neon|futuristic|sci-fi|tech|hologram/.test(motifsText)) {
    return 'brushed metal panels'; // Industrial/tech aesthetic
  }
  
  // Nature/Garden themes
  if (/garden|forest|tree|plant|nature|grass/.test(motifsText)) {
    return 'rough bark texture'; // Natural materials
  }
  
  // Indoor/Classroom themes
  if (/classroom|school|office|interior|room/.test(motifsText)) {
    return 'painted plaster wall'; // Interior walls
  }
  
  // Default: versatile stone
  return 'stone wall';
}

/**
 * Intelligently analyze scene context from motifs
 */
function analyzeScene(motifs: string[]) {
  const motifsText = motifs.join(' ').toLowerCase();
  
  // Detect scene type
  const indoorKeywords = ['classroom', 'kitchen', 'room', 'interior', 'house', 'office', 'hallway', 'museum', 'library', 'restaurant', 'store', 'shop', 'garage', 'basement', 'attic'];
  const specialKeywords = ['ant', 'giant', 'tiny', 'massive', 'huge', 'miniature', 'microscopic', 'macro'];
  
  const isIndoor = indoorKeywords.some(k => motifsText.includes(k));
  const isSpecial = specialKeywords.some(k => motifsText.includes(k));
  
  // Detect time/lighting context
  const timeKeywords = {
    sunset: ['sunset', 'dusk', 'evening', 'golden-hour'],
    sunrise: ['sunrise', 'dawn', 'morning'],
    night: ['night', 'midnight', 'dark', 'stars', 'moon'],
    day: ['day', 'noon', 'bright'],
  };
  
  let timeOfDay = 'neutral';
  for (const [time, keywords] of Object.entries(timeKeywords)) {
    if (keywords.some(k => motifsText.includes(k))) {
      timeOfDay = time;
      break;
    }
  }
  
  // Detect if architectural/building elements present
  const architecturalKeywords = ['temple', 'castle', 'building', 'pyramid', 'tower', 'palace', 'monument', 'structure'];
  const hasArchitecture = architecturalKeywords.some(k => motifsText.includes(k));
  
  return {
    type: isSpecial ? 'special' : (isIndoor ? 'indoor' : 'outdoor'),
    timeOfDay,
    hasArchitecture,
    motifs,
  };
}

/**
 * Build a smart, context-aware prompt for Fal.ai
 * Returns both the main prompt and negative prompt
 */
function buildGenerationPrompt(params: GenerationParams): { prompt: string; negativePrompt: string } {
  const { palette, motifs, assetType } = params;

  if (assetType !== 'skybox') {
    // Texture generation - realistic surface material
    const colorDesc = palette.slice(0, 3).join(', ');
    const material = determineMaterialType(motifs);
    
    const prompt = `Seamless tileable texture, photorealistic ${material} surface. ` +
      `Close-up material shot, high detail. Colors: ${colorDesc}. ` +
      `Perfectly repeating pattern, no visible seams, PBR-ready texture. ` +
      `Professional game texture quality.`;
    
    const negativePrompt = 'visible seams, borders, edges, non-tileable, low quality, blurry, text, watermark, patterns, symbols, objects, abstract art, decorative elements';
    
    return { prompt, negativePrompt };
  }

  // Analyze the scene context
  const scene = analyzeScene(motifs);
  const colorDesc = palette.slice(0, 3).join(', ');
  
  // Build prompt parts dynamically
  let prompt = '';
  let negativePrompt = 'repeated objects, tiled pattern, multiple identical copies, duplicated elements, copy-paste, mirrored, kaleidoscope effect';
  
  if (scene.type === 'indoor') {
    // Indoor: You're inside looking around
    prompt = `360-degree equirectangular panorama from inside a ${motifs.join(' ')}. `;
    prompt += `First-person perspective, center of room looking in all directions. `;
    prompt += `Interior walls, ceiling above, floor below all visible. `;
    prompt += `Color scheme: ${colorDesc}. `;
    prompt += `Interior lighting appropriate to the space type. `;
    prompt += `Seamless 360° horizontal wrap, equirectangular projection, spherical mapping. `;
    prompt += `Single unified interior space.`;
    negativePrompt += ', exterior view, outside, multiple rooms, repeated spaces, sunset, dusk, outdoor lighting';
    
  } else if (scene.type === 'special') {
    // Special perspective (e.g., "giant kitchen, we are ants")
    prompt = `360-degree equirectangular panorama with dramatic scale perspective. `;
    prompt += `Scene: ${motifs.join(', ')}. Color palette: ${colorDesc}. `;
    prompt += `Unique perspective emphasizing scale, immersive environment. `;
    prompt += `Seamless 360° horizontal wrap, equirectangular projection, spherical mapping. `;
    prompt += `Single cohesive environment wrapping around viewer.`;
    negativePrompt += ', repeated objects, tiling, multiple copies';
    
  } else {
    // Outdoor: Emphasize atmosphere and environment
    prompt = `360-degree equirectangular panorama for spherical skybox. `;
    
    // ONLY add time-specific atmosphere if explicitly mentioned
    if (scene.timeOfDay === 'sunset') {
      prompt += `Sunset atmosphere, warm golden lighting, sun low on horizon. `;
    } else if (scene.timeOfDay === 'sunrise') {
      prompt += `Dawn atmosphere, morning light, sun rising. `;
    } else if (scene.timeOfDay === 'night') {
      prompt += `Night sky, stars visible, moonlight. `;
    } else if (scene.timeOfDay === 'day') {
      prompt += `Bright daylight, clear sky. `;
    } else {
      // Neutral - no time specified, use balanced natural lighting
      prompt += `Natural lighting, clear atmosphere. `;
    }
    
    // Add color palette reference
    prompt += `Color palette: ${colorDesc}. `;
    
    // Handle architectural elements - keep them distant and non-repetitive
    if (scene.hasArchitecture) {
      prompt += `Single ${motifs.filter(m => !['sunset', 'sunrise', 'night', 'day'].some(t => m.toLowerCase().includes(t))).join(', ')} structure in the distant horizon. `;
      prompt += `Wide open sky dominates the view, distant ground/horizon line at bottom. `;
    } else {
      prompt += `Open environment with ${motifs.join(', ')} as background elements. `;
      prompt += `Sky and atmosphere take up most of the spherical view. `;
    }
    
    prompt += `Seamless 360° horizontal wrap, equirectangular projection, spherical mapping. `;
    prompt += `Wide environmental shot, atmospheric perspective, no foreground objects. `;
    
    negativePrompt += ', close-up, foreground objects, zoomed in, multiple buildings, repeated structures, tiling, grid pattern, sunset, sunrise, dusk, dawn'; // Prevent AI from adding its own time preferences
  }
  
  // Common quality tags for skybox
  prompt += ` Photorealistic, cinematic quality, suitable for spherical projection.`;
  
  console.log('🎨 Generated smart prompt:', prompt);
  console.log('🚫 Negative prompt:', negativePrompt);
  
  return { prompt, negativePrompt };
}


/**
 * Generate a skybox image using Fal.ai
 * 
 * @param palette - Color palette for the skybox
 * @param motifs - Visual motifs to incorporate
 * @returns Generated asset with public URL
 */
export async function generateSkybox(
  palette: string[],
  motifs: string[]
): Promise<GeneratedAsset> {
  try {
    const { prompt, negativePrompt } = buildGenerationPrompt({ palette, motifs, assetType: 'skybox' });

    console.log('🎨 Generating skybox with Fal.ai...');
    console.log('📝 Prompt:', prompt);
    console.log('🚫 Negative:', negativePrompt);

    // Use Fal.ai's Fast SDXL model with improved settings for panoramic skyboxes
    const result = await fal.subscribe('fal-ai/fast-sdxl', {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        image_size: {
          width: 2048, // Higher resolution for better quality
          height: 1024, // Maintain 2:1 panoramic ratio
        },
        num_inference_steps: 35, // More steps for better quality
        guidance_scale: 8.5, // Higher guidance for better prompt adherence
        num_images: 1,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('⏳ Generation progress:', update.logs?.map(log => log.message).join('\n'));
        }
      },
    }) as { images: Array<{ url: string; width: number; height: number }> };

    // Extract the generated image URL
    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in Fal.ai response');
    }

    console.log('✅ Skybox generated:', imageUrl);

    return {
      url: imageUrl,
      contentType: 'image/jpeg',
      width: result.images[0].width || 2048,
      height: result.images[0].height || 1024,
    };
  } catch (error) {
    console.error('Fal.ai skybox generation error:', error);
    throw new Error(`Failed to generate skybox: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a tileable texture using Fal.ai
 * 
 * @param palette - Color palette for the texture
 * @param motifs - Visual motifs to incorporate
 * @returns Generated asset with public URL
 */
export async function generateTexture(
  palette: string[],
  motifs: string[]
): Promise<GeneratedAsset> {
  try {
    const { prompt, negativePrompt } = buildGenerationPrompt({ palette, motifs, assetType: 'texture' });

    console.log('🎨 Generating tileable texture with Fal.ai...');
    console.log('📝 Prompt:', prompt);
    console.log('🚫 Negative:', negativePrompt);

    const result = await fal.subscribe('fal-ai/fast-sdxl', {
      input: {
        prompt,
        negative_prompt: negativePrompt,
        image_size: {
          width: 256,
          height: 256,
        },
        num_inference_steps: 30, // Increased for better quality
        guidance_scale: 9.0, // Higher guidance to follow prompt more strictly
        num_images: 1,
      },
    }) as { images: Array<{ url: string; width: number; height: number }> };

    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in Fal.ai response');
    }

    console.log('✅ Texture generated (256x256):', imageUrl);

    return {
      url: imageUrl,
      contentType: 'image/jpeg',
      width: 256,
      height: 256,
    };
  } catch (error) {
    console.error('Fal.ai texture generation error:', error);
    throw new Error(`Failed to generate texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

