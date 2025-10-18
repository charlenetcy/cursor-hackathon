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
  originalPrompt?: string; // Keep original user prompt for better context
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
 * Intelligently analyze scene context from ORIGINAL PROMPT and motifs
 * This keeps critical details like "at night" that might be lost in extracted motifs
 */
function analyzeScene(motifs: string[], originalPrompt?: string) {
  const motifsText = motifs.join(' ').toLowerCase();
  // Combine original prompt with motifs for better context
  const fullText = originalPrompt ? `${originalPrompt} ${motifsText}`.toLowerCase() : motifsText;
  
  console.log('🔍 Analyzing scene from:', fullText);
  
  // Detect scene type
  const indoorKeywords = ['classroom', 'kitchen', 'room', 'interior', 'house', 'office', 'hallway', 'museum', 'library', 'restaurant', 'store', 'shop', 'garage', 'basement', 'attic'];
  const specialKeywords = ['ant', 'giant', 'tiny', 'massive', 'huge', 'miniature', 'microscopic', 'macro'];
  
  const isIndoor = indoorKeywords.some(k => fullText.includes(k));
  const isSpecial = specialKeywords.some(k => fullText.includes(k));
  
  // Detect time/lighting context - CHECK ORIGINAL TEXT FIRST!
  const timeKeywords = {
    night: ['night', 'midnight', 'nighttime', 'at night', 'evening', 'dusk'],
    sunset: ['sunset', 'golden hour', 'dusk'],
    sunrise: ['sunrise', 'dawn', 'morning'],
    day: ['day', 'daytime', 'noon', 'bright', 'afternoon'],
  };
  
  let timeOfDay = 'neutral';
  // Priority order: night, sunset, sunrise, day
  for (const [time, keywords] of Object.entries(timeKeywords)) {
    if (keywords.some(k => fullText.includes(k))) {
      timeOfDay = time;
      console.log(`⏰ Detected time: ${time}`);
      break;
    }
  }
  
  // Detect if architectural/building elements present
  const architecturalKeywords = ['temple', 'castle', 'building', 'pyramid', 'tower', 'palace', 'monument', 'structure', 'city', 'tokyo', 'skyline'];
  const hasArchitecture = architecturalKeywords.some(k => fullText.includes(k));
  
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
  const { palette, motifs, assetType, originalPrompt } = params;

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

  // Analyze the scene context (with original prompt for better accuracy!)
  const scene = analyzeScene(motifs, originalPrompt);
  const colorDesc = palette.slice(0, 3).join(', ');
  
  // Build prompt parts dynamically
  let prompt = '';
  let negativePrompt = 'repeated objects, tiled pattern, multiple identical copies, duplicated elements, copy-paste, mirrored, kaleidoscope effect, grid layout, multiple views, collage';
  
  if (scene.type === 'indoor') {
    // Indoor - SHORT!
    prompt = ` panorama inside ${motifs.slice(0, 2).join(' ')}, interior view. `;
    prompt += `First-person center, walls ceiling floor visible. Seamless  wrap.`;
    negativePrompt += ', exterior, outdoor, multiple rooms, repeated, outside';
    
  } else if (scene.type === 'special') {
    // Special perspective - SHORT!
    prompt = ` panorama ${motifs.slice(0, 2).join(' ')}, dramatic scale. `;
    prompt += `Unique perspective, immersive, seamless  wrap.`;
    negativePrompt += ', repeated, tiling, multiple copies';
    
  } else {
    // Outdoor - KEEP IT SHORT! CLIP has 77 token limit
    prompt = `equirectangular panorama skybox. `;
    
    // Time-specific atmosphere - CONCISE!
    if (scene.timeOfDay === 'night') {
      prompt += `DARK NIGHT, city lights glowing, stars. `;
      negativePrompt += ', daytime, daylight, sun, blue sky';
    } else if (scene.timeOfDay === 'sunset') {
      prompt += `Sunset, golden hour, warm orange sky. `;
      negativePrompt += ', daytime, nighttime, dark, midnight';
    } else if (scene.timeOfDay === 'sunrise') {
      prompt += `Dawn, sunrise, morning light. `;
      negativePrompt += ', nighttime, sunset, dark sky';
    } else if (scene.timeOfDay === 'day') {
      prompt += `blue sky, sunny. `;
      negativePrompt += ', nighttime, dark, stars';
    } else {
      // prompt += `Natural lighting. `;
    }
    
    // Scene description - SHORT!
    if (scene.hasArchitecture) {
      prompt += `${motifs.slice(0, 2).join(' ')} cityscape panorama. `;
    } else {
      prompt += `${motifs.slice(0, 2).join(' ')} environment. `;
    }
    
    prompt += `Seamless  wrap, single continuous view.`;
    
    negativePrompt += ', multiple views, grid, tiling, repeated, collage, split screen';
  }
  
  // Don't add more - keep under 77 tokens!
  console.log('🎨 Generated SHORT prompt:', prompt);
  console.log(`📏 Estimated tokens: ~${prompt.split(/\s+/).length}`);
  console.log('🚫 Negative prompt:', negativePrompt);
  
  return { prompt, negativePrompt };
}


/**
 * Generate a skybox image using Fal.ai
 * 
 * @param palette - Color palette for the skybox
 * @param motifs - Visual motifs to incorporate
 * @param originalPrompt - Original user prompt text for better context
 * @returns Generated asset with public URL
 */
export async function generateSkybox(
  palette: string[],
  motifs: string[],
  originalPrompt?: string
): Promise<GeneratedAsset> {
  console.log('🎨 generateSkybox called with:', { palette, motifs, originalPrompt });

  try {
    const { prompt, negativePrompt } = buildGenerationPrompt({ 
      palette, 
      motifs, 
      assetType: 'skybox',
      originalPrompt  // Pass through for context analysis!
    });

    console.log('🎨 Generating skybox with Fal.ai Flux Pro 1.1...');
    console.log('📝 Prompt:', prompt);
    console.log('🚫 Negative:', negativePrompt);

    // Use Fal.ai's Flux Pro 1.1 - MUCH better quality for panoramic skyboxes!
    // Cost: ~$0.04 per image (vs $0.005 for fast-sdxl)
    // Quality: ⭐⭐⭐⭐⭐ vs ⭐⭐ - WAY better prompt following and coherence
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt,
        // Flux Pro doesn't use negative_prompt, it's smart enough!
        image_size: {
          width: 2048, // Higher resolution for better quality
          height: 1024, // Maintain 2:1 panoramic ratio
        },
        num_images: 1,
        enable_safety_checker: false, // Disable for artistic freedom
        output_format: 'jpeg', // JPEG for smaller file sizes
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('⏳ Flux Pro generation progress:', update.logs?.map(log => log.message).join('\n'));
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

    console.log('🎨 Generating tileable texture with Fal.ai Flux Pro 1.1...');
    console.log('📝 Prompt:', prompt);
    console.log('🚫 Negative:', negativePrompt);

    // Use Flux Pro 1.1 for textures too - better material realism!
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt,
        image_size: {
          width: 512, // Increased from 256 for better quality (Flux handles it well)
          height: 512,
        },
        num_images: 1,
        enable_safety_checker: false,
        output_format: 'jpeg',
      },
    }) as { images: Array<{ url: string; width: number; height: number }> };

    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error('No image URL in Fal.ai response');
    }

    console.log('✅ Texture generated with Flux Pro (512x512):', imageUrl);

    return {
      url: imageUrl,
      contentType: 'image/jpeg',
      width: 512,
      height: 512,
    };
  } catch (error) {
    console.error('Fal.ai texture generation error:', error);
    throw new Error(`Failed to generate texture: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

