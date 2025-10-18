# Background System - Complete Guide

## Overview

The parkour game now supports **AI-generated custom backgrounds** via user text prompts. Users can describe their dream background, and it will be generated and applied in real-time.

## 📁 File Structure

```
apps/client/
├── App.jsx                              # Main game component (updated)
├── src/
│   ├── config/
│   │   └── supabase.ts                 # Supabase client configuration
│   ├── services/
│   │   ├── imageService.ts             # (Legacy) Static image fetching
│   │   └── backgroundGenerationService.ts  # NEW: AI generation service
│   ├── hooks/
│   │   ├── useBackgroundImages.ts      # (Legacy) Static image loading
│   │   └── useBackgroundGeneration.ts  # NEW: Generation state management
│   ├── components/
│   │   └── BackgroundPromptInput.jsx   # NEW: UI for prompt input
│   └── vite-env.d.ts                   # TypeScript environment types
├── BACKGROUND_GENERATION.md            # NEW: Detailed system documentation
├── BACKEND_INTEGRATION.md              # NEW: Backend developer guide
└── SUPABASE_SETUP.md                   # Database setup guide
```

## 🎨 How It Works (User Perspective)

1. **Click the purple 🎨 button** in the bottom-right corner
2. **Enter a description** of your desired background:
   - "A futuristic neon city at night"
   - "Peaceful mountain sunset with clouds"
   - "Underwater coral reef with tropical fish"
3. **Click "Generate"**
4. **Wait ~30-60 seconds** while AI creates your background
5. **Background automatically updates** when ready!

The custom background persists even after falling/restarting.

## 🔧 Setup (Developer)

### 1. Install Dependencies

```bash
cd apps/client
npm install  # @supabase/supabase-js already installed
```

### 2. Environment Variables

Create `.env` in `apps/client/`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_BACKEND_URL=http://localhost:3000
```

### 3. Supabase Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Create the table
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

-- Create indexes
CREATE INDEX idx_generated_backgrounds_status ON generated_backgrounds(status);
CREATE INDEX idx_generated_backgrounds_created ON generated_backgrounds(created_at DESC);

-- Enable RLS
ALTER TABLE generated_backgrounds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read of completed images" ON generated_backgrounds
  FOR SELECT USING (status = 'completed');

CREATE POLICY "Allow insert for generation requests" ON generated_backgrounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update of generation records" ON generated_backgrounds
  FOR UPDATE USING (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE generated_backgrounds;
```

Create a storage bucket:
- Name: `generated-backgrounds`
- Public: Yes
- CORS: Allow GET from all origins

### 4. Backend Integration

See `BACKEND_INTEGRATION.md` for complete backend setup guide.

**Quick summary:**
```javascript
// POST /api/generate-background
{
  "prompt": "user's description",
  "userId": "optional"
}
// → Generate image with AI
// → Upload to Supabase Storage
// → Update database with image URL
```

### 5. Test the System

```bash
# Start dev server
npm run dev

# Click 🎨 button in game
# Enter a prompt
# Without backend: Shows error gracefully
# With backend: Generates and applies background
```

## 🏗️ Architecture

### Client-Side Flow

```
User Input
    ↓
BackgroundPromptInput (UI Component)
    ↓
useBackgroundGeneration (State Hook)
    ↓
backgroundGenerationService (API Service)
    ↓
[Network Request to Backend]
    ↓
[Backend generates & uploads image]
    ↓
Real-time Subscription / Polling
    ↓
handleBackgroundReady (Callback)
    ↓
Three.js Texture Update
    ↓
Background Visible in Game!
```

### Key Features

✅ **Real-time Updates**: Uses Supabase real-time subscriptions  
✅ **Fallback Polling**: If real-time fails, polls every 2-10s  
✅ **Error Handling**: Graceful failures with user feedback  
✅ **Loading States**: Progress messages and spinner  
✅ **Texture Caching**: Efficient Three.js texture loading  
✅ **Persistent Backgrounds**: Custom background survives game restarts  

## 📝 Key Components Explained

### BackgroundPromptInput

The purple floating button that expands into a form.

**State Flow:**
- Collapsed → User clicks button → Expanded
- User types prompt → Clicks Generate
- Shows progress messages → Success/Error feedback
- Can collapse back to button at any time

### useBackgroundGeneration

React hook that manages the generation lifecycle.

**Responsibilities:**
- Send request to backend
- Subscribe to real-time updates
- Fallback to polling if needed
- Call callback when image ready
- Handle errors and timeouts

### backgroundGenerationService

Service layer for all backend communication.

**Functions:**
- `requestBackgroundGeneration()` - POST to backend
- `subscribeToGenerationUpdates()` - Real-time listener
- `pollForCompletion()` - Backup polling mechanism
- `checkGenerationStatus()` - Single status check

## 🐛 Troubleshooting

### Button doesn't appear
**Check:** Component is rendered in App.jsx
```jsx
<BackgroundPromptInput
  onSubmit={generateBackground}
  status={status}
  progress={progress}
  error={genError}
/>
```

### "Failed to request generation" error
**Cause:** Backend is not running or wrong URL
**Fix:** Check VITE_BACKEND_URL in .env

### Generation never completes
**Check:**
1. Backend logs for errors
2. Supabase table for status updates
3. Real-time is enabled on table
4. Image upload succeeded

### Background doesn't change
**Check:**
1. image_url is publicly accessible
2. CORS allows GET requests
3. Browser console for Three.js errors
4. Network tab shows successful image load

## 📚 Documentation

- **BACKGROUND_GENERATION.md** - Complete system documentation
- **BACKEND_INTEGRATION.md** - Backend developer guide
- **SUPABASE_SETUP.md** - Database setup instructions

## 🚀 Production Checklist

- [ ] Set production Supabase URL
- [ ] Set production backend URL
- [ ] Enable content moderation on backend
- [ ] Set up rate limiting (5 per user per 15min)
- [ ] Monitor AI generation costs
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Test with various prompts
- [ ] Test failure scenarios
- [ ] Optimize image sizes/formats
- [ ] Add analytics for generations

## 💰 Cost Estimation

Per 1000 generations:
- OpenAI DALL-E 3: ~$40
- Stable Diffusion (Replicate): ~$20
- Supabase Storage: ~$0.02/GB
- Supabase Real-time: Free (up to 200k msgs)

Recommended: Implement daily/weekly limits per user.

## 🔮 Future Enhancements

Potential features to add:

1. **History Gallery** - Show user's past generations
2. **Favorites** - Save and reuse favorite backgrounds
3. **Quick Presets** - Template prompts (Cyberpunk, Nature, Space, etc.)
4. **Image Effects** - Filters, blur, saturation adjustments
5. **Community Sharing** - Share backgrounds with other players
6. **Prompt Suggestions** - AI-powered prompt improvements
7. **Style Transfer** - Apply art styles to existing images
8. **Animation** - Animated/parallax backgrounds

## 🤝 Contributing

When adding features:

1. Update type definitions in `vite-env.d.ts`
2. Add error handling for all network requests
3. Update documentation in this folder
4. Test with and without backend
5. Consider mobile/tablet UI
6. Check performance impact

## 📞 Support

For questions or issues:
- Check documentation in this folder
- Review Supabase docs: https://supabase.com/docs
- Check AI service docs (OpenAI, Replicate, etc.)
- Review Three.js texture loading: https://threejs.org/docs

---

**Status**: ✅ Client-side complete, ready for backend integration

**Last Updated**: October 2025

