# Backend Integration Guide

Quick guide for backend developers to integrate with the background generation system.

## What the Backend Needs to Do

1. Accept POST requests with a text prompt
2. Generate an image using AI
3. Upload image to Supabase
4. Update database record with the image URL
5. Client will automatically fetch the image

## 1. API Endpoint

Create: `POST /api/generate-background`

### Request Format
```json
{
  "prompt": "A futuristic neon city at night",
  "userId": "optional-user-id"
}
```

### Response Format
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Background generation started"
}
```

### Error Response
```json
{
  "error": "Invalid prompt",
  "message": "Prompt must be between 10 and 500 characters"
}
```

## 2. Database Operations

### Initial Record Creation

When request is received:

```javascript
const { data, error } = await supabase
  .from('generated_backgrounds')
  .insert({
    prompt: requestBody.prompt,
    status: 'pending',
    user_id: requestBody.userId,
    created_at: new Date().toISOString()
  })
  .select()
  .single();

// Return data.id to client
```

### Update Status to Processing

```javascript
await supabase
  .from('generated_backgrounds')
  .update({ status: 'processing' })
  .eq('id', generationId);
```

### Update with Completed Image

```javascript
await supabase
  .from('generated_backgrounds')
  .update({
    status: 'completed',
    image_url: publicImageUrl,
    completed_at: new Date().toISOString()
  })
  .eq('id', generationId);
```

### Update with Failure

```javascript
await supabase
  .from('generated_backgrounds')
  .update({
    status: 'failed',
    error_message: errorMessage
  })
  .eq('id', generationId);
```

## 3. Image Generation

Recommended services:
- OpenAI DALL-E 3
- Stability AI (Stable Diffusion)
- Midjourney API
- Replicate

### Example with OpenAI DALL-E

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateImage(prompt) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1792x1024", // Good for panoramic backgrounds
    quality: "standard",
    style: "vivid"
  });

  return response.data[0].url; // Temporary URL, need to download and upload to Supabase
}
```

### Example with Replicate (Stable Diffusion)

```javascript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

async function generateImage(prompt) {
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        width: 1792,
        height: 1024,
        num_outputs: 1
      }
    }
  );

  return output[0]; // Image URL
}
```

## 4. Upload to Supabase Storage

### Download Generated Image

```javascript
async function downloadImage(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return buffer;
}
```

### Upload to Supabase

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key on backend
);

async function uploadToSupabase(imageBuffer, generationId) {
  const fileName = `backgrounds/${generationId}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('generated-backgrounds') // Your bucket name
    .upload(fileName, imageBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('generated-backgrounds')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
```

## 5. Complete Workflow

```javascript
// Express.js example
app.post('/api/generate-background', async (req, res) => {
  const { prompt, userId } = req.body;

  // Validate
  if (!prompt || prompt.length < 10 || prompt.length > 500) {
    return res.status(400).json({
      error: 'Invalid prompt',
      message: 'Prompt must be between 10 and 500 characters'
    });
  }

  try {
    // 1. Create database record
    const { data: record } = await supabase
      .from('generated_backgrounds')
      .insert({
        prompt,
        status: 'pending',
        user_id: userId
      })
      .select()
      .single();

    // 2. Return immediately to client
    res.json({
      id: record.id,
      status: 'pending',
      message: 'Background generation started'
    });

    // 3. Process asynchronously (don't await)
    processGeneration(record.id, prompt).catch(err => {
      console.error('Generation failed:', err);
    });

  } catch (error) {
    console.error('Error creating generation request:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Failed to start generation'
    });
  }
});

async function processGeneration(generationId, prompt) {
  try {
    // Update status to processing
    await supabase
      .from('generated_backgrounds')
      .update({ status: 'processing' })
      .eq('id', generationId);

    // Generate image
    const tempImageUrl = await generateImage(prompt);

    // Download image
    const imageBuffer = await downloadImage(tempImageUrl);

    // Upload to Supabase
    const publicUrl = await uploadToSupabase(imageBuffer, generationId);

    // Update record with success
    await supabase
      .from('generated_backgrounds')
      .update({
        status: 'completed',
        image_url: publicUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', generationId);

    console.log(`Generation ${generationId} completed successfully`);

  } catch (error) {
    // Update record with failure
    await supabase
      .from('generated_backgrounds')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', generationId);

    console.error(`Generation ${generationId} failed:`, error);
  }
}
```

## 6. Environment Variables

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key-here

# AI Service (choose one)
OPENAI_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...
STABILITY_API_KEY=sk-...

# Optional
NODE_ENV=production
PORT=3000
```

## 7. Supabase Storage Bucket Setup

1. Go to Supabase Dashboard → Storage
2. Create new bucket: `generated-backgrounds`
3. Make it public (or set up RLS for authenticated access)
4. Set CORS if needed:
   ```json
   {
     "allowedOrigins": ["*"],
     "allowedMethods": ["GET"],
     "allowedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

## 8. Error Handling

Handle these scenarios:
- Invalid/inappropriate prompts (content moderation)
- AI service rate limits
- AI service downtime
- Upload failures
- Database errors

## 9. Rate Limiting

Recommended rate limits:
```javascript
import rateLimit from 'express-rate-limit';

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many generation requests, please try again later'
});

app.post('/api/generate-background', generateLimiter, async (req, res) => {
  // ...
});
```

## 10. Content Moderation

Filter inappropriate prompts:
```javascript
import { Moderation } from 'openai';

async function moderatePrompt(prompt) {
  const moderation = await openai.moderations.create({
    input: prompt
  });

  if (moderation.results[0].flagged) {
    throw new Error('Inappropriate content detected');
  }
}
```

## 11. Cost Management

Track generation costs:
```javascript
// Log costs for monitoring
await supabase.from('generation_costs').insert({
  generation_id: generationId,
  service: 'openai-dalle3',
  cost: 0.04, // Cost per generation
  timestamp: new Date().toISOString()
});
```

## 12. Testing

Test the endpoint:
```bash
curl -X POST http://localhost:3000/api/generate-background \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A peaceful mountain landscape at sunset",
    "userId": "test-user"
  }'
```

## Quick Start Checklist

- [ ] Set up environment variables
- [ ] Create Supabase Storage bucket
- [ ] Implement POST endpoint
- [ ] Integrate AI image generation service
- [ ] Test with sample prompts
- [ ] Add error handling
- [ ] Implement rate limiting
- [ ] Add content moderation
- [ ] Deploy and test with client

## Need Help?

- Check `BACKGROUND_GENERATION.md` for client-side details
- Check `SUPABASE_SETUP.md` for database schema
- Review Supabase docs: https://supabase.com/docs
- OpenAI API docs: https://platform.openai.com/docs

