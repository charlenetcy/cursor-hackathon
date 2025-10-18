# AI Background Generation System

This document explains the AI-powered background generation system that allows users to create custom backgrounds via text prompts.

## Overview

Users can input a text description (e.g., "A futuristic neon city at night"), which is sent to a backend server for AI image generation. Once generated and uploaded to Supabase, the client fetches and displays the new background in real-time.

## Architecture

```
User Input (Prompt)
    ↓
BackgroundPromptInput Component
    ↓
useBackgroundGeneration Hook
    ↓
backgroundGenerationService
    ↓
Backend API (image generation)
    ↓
Supabase Storage (image upload)
    ↓
Real-time Updates / Polling
    ↓
Three.js Background Update
```

## Components

### 1. **BackgroundPromptInput** (`src/components/BackgroundPromptInput.jsx`)

A collapsible UI component that provides:
- Floating button (🎨) that expands into a form
- Text area for prompt input
- Submit button with loading states
- Progress messages
- Error handling
- Success feedback

**Props:**
- `onSubmit(prompt)` - Callback when user submits a prompt
- `status` - Current generation status ('idle', 'requesting', 'processing', 'completed', 'failed')
- `progress` - Progress message string
- `error` - Error message if generation fails
- `isDisabled` - Optional flag to disable the input

### 2. **useBackgroundGeneration Hook** (`src/hooks/useBackgroundGeneration.ts`)

Manages the entire background generation lifecycle:
- Sends generation requests to backend
- Subscribes to real-time Supabase updates
- Falls back to polling if real-time fails
- Calls callback when image is ready
- Provides status, error, and progress state

**Usage:**
```javascript
const { status, error, progress, generateBackground, reset } = useBackgroundGeneration(
  (imageUrl) => {
    // Called when new background is ready
    console.log('New background:', imageUrl);
  }
);
```

### 3. **backgroundGenerationService** (`src/services/backgroundGenerationService.ts`)

Core service for backend communication and data fetching:

**Functions:**
- `requestBackgroundGeneration(prompt, userId)` - Sends generation request to backend
- `checkGenerationStatus(generationId)` - Checks if image is ready
- `pollForCompletion(generationId, maxAttempts, initialDelay)` - Polls until complete
- `subscribeToGenerationUpdates(generationId, onUpdate)` - Real-time subscription
- `fetchRecentGeneratedBackgrounds(limit)` - Gets recent generated images

## Database Schema

### `generated_backgrounds` Table

```sql
CREATE TABLE generated_backgrounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  image_url TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  user_id TEXT
);

-- Indexes
CREATE INDEX idx_generated_backgrounds_status ON generated_backgrounds(status);
CREATE INDEX idx_generated_backgrounds_created ON generated_backgrounds(created_at DESC);

-- Enable Row Level Security
ALTER TABLE generated_backgrounds ENABLE ROW LEVEL SECURITY;

-- Allow public read access to completed images
CREATE POLICY "Allow public read of completed images"
  ON generated_backgrounds
  FOR SELECT
  USING (status = 'completed');

-- Allow insert for new generation requests
CREATE POLICY "Allow insert for generation requests"
  ON generated_backgrounds
  FOR INSERT
  WITH CHECK (true);

-- Allow update of own records (backend will update status)
CREATE POLICY "Allow update of generation records"
  ON generated_backgrounds
  FOR UPDATE
  USING (true);
```

### Enable Real-time

```sql
-- Enable real-time for the table
ALTER PUBLICATION supabase_realtime ADD TABLE generated_backgrounds;
```

## Backend API Contract

### POST `/api/generate-background`

Request a new background generation.

**Request Body:**
```json
{
  "prompt": "A futuristic neon city at night",
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "id": "uuid-of-generation-request",
  "status": "pending",
  "message": "Background generation started"
}
```

**Status Codes:**
- `200` - Request accepted
- `400` - Invalid prompt
- `500` - Server error

### Backend Workflow

The backend should:
1. Receive the prompt
2. Create a record in `generated_backgrounds` table with status='pending'
3. Queue the image generation task
4. Return the generation ID immediately
5. Process image generation asynchronously:
   - Update status to 'processing'
   - Generate image using AI (e.g., DALL-E, Stable Diffusion)
   - Upload to Supabase Storage
   - Update record with image_url and status='completed'
   - Or set status='failed' with error_message if generation fails

## Environment Variables

Add to `.env` in `apps/client/`:

```env
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Client-Side Flow

### 1. User Initiates Generation

```javascript
// User clicks the 🎨 button and enters a prompt
generateBackground("A peaceful forest with cherry blossoms");
```

### 2. Request Sent to Backend

```javascript
// backgroundGenerationService.ts
const response = await requestBackgroundGeneration(prompt);
// Returns: { id: 'uuid', status: 'pending' }
```

### 3. Real-time Updates

```javascript
// Subscribe to status changes
subscribeToGenerationUpdates(response.id, (updatedImage) => {
  if (updatedImage.status === 'completed') {
    // Image ready!
    onImageReady(updatedImage.image_url);
  }
});
```

### 4. Fallback Polling

If real-time doesn't trigger within 5 seconds, polling starts:

```javascript
const result = await pollForCompletion(response.id);
// Polls every 2s initially, increasing to max 10s intervals
```

### 5. Background Updated

```javascript
// App.jsx - handleBackgroundReady
const handleBackgroundReady = (imageUrl) => {
  const newTexture = textureLoaderRef.current.load(imageUrl);
  skyMaterialRef.current.map = newTexture;
  skyMaterialRef.current.needsUpdate = true;
};
```

## Testing Without Backend

The system is designed to fail gracefully. Without a backend:

1. The generate button will still work
2. Request will fail with a network error
3. Error message will display to user
4. Default background remains unchanged

To test the UI:
```javascript
// Mock the backend response
// In backgroundGenerationService.ts, temporarily return:
return {
  id: 'test-id',
  status: 'pending',
  message: 'Test generation'
};
```

## Integration Checklist

### Backend Setup
- [ ] Create `generated_backgrounds` table
- [ ] Enable RLS policies
- [ ] Enable real-time publication
- [ ] Implement `/api/generate-background` endpoint
- [ ] Set up AI image generation service
- [ ] Configure Supabase Storage bucket for generated images
- [ ] Implement webhook/task queue for async processing

### Client Setup
- [x] Install `@supabase/supabase-js`
- [x] Create Supabase client config
- [x] Implement generation service
- [x] Create UI component
- [x] Add hook for state management
- [x] Integrate into game component
- [ ] Set environment variables
- [ ] Test with real backend

## Customization

### Change Generation UI Position

Edit `BackgroundPromptInput.jsx`:
```javascript
style={{
  position: 'absolute',
  bottom: 20,  // Change this
  right: 20,   // Change this
  // ...
}}
```

### Change Polling Behavior

Edit `useBackgroundGeneration.ts`:
```javascript
pollForCompletion(
  response.id,
  30,    // maxAttempts (default: 30)
  2000   // initialDelay in ms (default: 2000)
)
```

### Add Loading Animation

The UI already includes a spinning loader. Customize in `BackgroundPromptInput.jsx`:
```css
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## Error Handling

The system handles multiple error scenarios:

1. **Network Error**: Backend unreachable
   - Shows user-friendly error message
   - Background remains unchanged

2. **Generation Timeout**: Image takes too long
   - Polling stops after ~60 seconds
   - User notified of timeout

3. **Generation Failed**: AI generation errors
   - Backend sets status='failed' with error_message
   - Error displayed to user

4. **Invalid Image URL**: URL doesn't load
   - Three.js fails silently
   - Console error logged

## Performance Considerations

### Texture Loading

- New textures are loaded asynchronously
- No freezing during load
- Old texture remains until new one loads

### Memory Management

- Only one background texture active at a time
- Previous textures are garbage collected
- No memory leaks from repeated generations

### Network Optimization

- Real-time subscriptions are more efficient than polling
- Polling uses exponential backoff
- Unsubscribes automatically on completion

## Future Enhancements

Potential improvements:

1. **Generation History**: Show previously generated backgrounds
2. **Favorites**: Save favorite backgrounds
3. **Generation Queue**: Generate multiple backgrounds
4. **Preview Mode**: Preview before applying
5. **Style Presets**: Quick prompt templates
6. **Image Filters**: Post-processing effects
7. **Community Gallery**: Share backgrounds with other players
8. **Prompt Suggestions**: AI-powered prompt improvements

## Troubleshooting

### Button doesn't appear
- Check that BackgroundPromptInput is rendered
- Check z-index conflicts

### Generation never completes
- Check backend logs
- Verify Supabase real-time is enabled
- Check network tab for errors

### Image doesn't update
- Check that image_url is publicly accessible
- Verify CORS settings on Supabase Storage
- Check browser console for Three.js errors

### Real-time not working
- Verify real-time is enabled on the table
- Check Supabase real-time quota
- Fallback to polling should still work

## Security Notes

- Never expose Supabase service key on client
- Use RLS policies to control access
- Validate prompts on backend (content moderation)
- Rate limit generation requests
- Sanitize user input
- Consider cost limits for AI generation

## Cost Estimation

Typical costs per generation:
- AI Image Generation: $0.02 - $0.10 (varies by provider)
- Supabase Storage: ~$0.021/GB/month
- Supabase Realtime: Included in free tier up to 200,000 messages

Recommend implementing:
- Rate limiting (e.g., 5 generations per user per day)
- Prompt validation (length, content)
- Cost monitoring and alerts

