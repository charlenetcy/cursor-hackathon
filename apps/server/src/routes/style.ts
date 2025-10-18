import { Router, Request, Response } from 'express';
import { StyleResponse, ErrorResponse } from '../types/contracts';
import { promptCache } from '../cache/promptCache';
import { generateSkybox } from '../lib/fal';
import { uploadSkybox, uploadSolidTexture, getPublicUrl } from '../lib/storage';
import { createSolidColorTexture } from '../lib/textureGenerator';

const router = Router();

/**
 * GET /style/byPromptId/:id
 * 
 * Retrieves the complete style pack for a given promptId.
 * Orchestrates: Fal.ai generation → Supabase upload → URL provisioning
 * 
 * Response: { "promptId", "palette", "skyboxUrl", "textureIds", "motifIds", "version": "v1" }
 */
router.get('/byPromptId/:id', async (req: Request<{ id: string }>, res: Response<StyleResponse | ErrorResponse>) => {
  try {
    const { id } = req.params;

    // Validate promptId format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'promptId parameter is required',
      });
      return;
    }

    console.log(`🎨 Fetching style for promptId: ${id}`);

    // Retrieve cached prompt data
    const promptData = promptCache.get(id);
    if (!promptData) {
      res.status(404).json({
        error: 'Not Found',
        message: `No parsed prompt found for promptId: ${id}. Call POST /prompt/parse first.`,
      });
      return;
    }

    console.log('📦 Found cached prompt data:', promptData);

    // Check if assets already exist in Supabase
    const skyboxPath = `skyboxes/${id}.jpg`;
    const texturePath = `textures/${id}_0.png`; // Solid color textures are PNG
    
    let skyboxUrl: string;
    let textureUrl: string;

    // Check if files actually exist in Supabase
    const { assetExists } = await import('../lib/storage');
    const skyboxExists = await assetExists(skyboxPath);
    const textureExists = await assetExists(texturePath);

    // Generate skybox if needed
    if (skyboxExists) {
      skyboxUrl = getPublicUrl(skyboxPath);
      console.log('✅ Using existing skybox:', skyboxUrl);
    } else {
      console.log(`🔍 Style endpoint called for promptId: ${id}`);
      console.log('🎨 About to generate skybox with Fal.ai');
      console.log('  - Palette:', promptData.palette);
      console.log('  - Motifs:', promptData.motifs);
      console.log('  - Original prompt:', promptData.originalPrompt);
      try {  // Add this try/catch block
        console.log('🎨 Generating new skybox...');
        const generatedSkybox = await generateSkybox(
          promptData.palette,
          promptData.motifs,
          promptData.originalPrompt  // Pass original text for better context!
        );
        console.log('✅ Skybox generated successfully:', generatedSkybox);
        
        console.log('📤 Starting skybox upload to Supabase...');
        const uploadResult = await uploadSkybox(id, generatedSkybox.url);
        console.log('✅ Skybox uploaded successfully, result:', uploadResult);
        
        skyboxUrl = uploadResult.publicUrl;
        console.log('✅ Skybox URL set:', skyboxUrl);
      } catch (error) {
        console.error('❌ ERROR in skybox generation/upload:', error);
        throw error; // Re-throw so the outer catch handler gets it
      }
    }

    // Generate texture if needed
    if (textureExists) {
      textureUrl = getPublicUrl(texturePath);
      console.log('✅ Using existing texture:', textureUrl);
    } else {
      console.log('🎨 Creating solid color texture from palette...');
      // Pick a random color from the palette (or the primary color)
      const textureColor = promptData.palette[Math.floor(Math.random() * promptData.palette.length)];
      console.log(`🎨 Selected color: ${textureColor}`);
      
      // Create solid color texture and upload
      const textureBuffer = createSolidColorTexture(textureColor, 64, 64);
      const textureUploadResult = await uploadSolidTexture(id, 0, textureBuffer);
      textureUrl = textureUploadResult.publicUrl;
      console.log('✅ Solid color texture uploaded:', textureUrl);
    }

    // Build the complete style response with actual texture URLs
    const styleResponse: StyleResponse = {
      promptId: id,
      palette: promptData.palette,
      skyboxUrl,
      textureIds: [textureUrl], // Now contains actual texture URL
      motifIds: promptData.motifs,
      version: 'v1',
    };

    console.log('✅ Style response ready:', styleResponse);

    // Return successful response with apiVersion v1
    res.status(200).json(styleResponse);
  } catch (error) {
    console.error('Error fetching style:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Failed to retrieve style: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

export default router;

