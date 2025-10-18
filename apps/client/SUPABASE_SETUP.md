# Supabase Background Images Setup

This document explains how to set up Supabase to fetch dynamic background images for the parkour game.

## Prerequisites

- A Supabase account (https://supabase.com)
- A Supabase project created

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the `apps/client` directory with the following variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

You can find these values in your Supabase project settings under "API".

### 2. Database Setup (Option 1: Using Database Table)

Create a table in your Supabase database:

```sql
CREATE TABLE background_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster lookups
CREATE INDEX idx_background_images_level ON background_images(level);

-- Insert sample data
INSERT INTO background_images (level, image_url) VALUES
  (0, 'https://your-storage-url.com/forest.jpg'),
  (5, 'https://your-storage-url.com/trees.jpg'),
  (10, 'https://your-storage-url.com/tokyo.jpg'),
  (15, 'https://your-storage-url.com/castle.jpg'),
  (20, 'https://your-storage-url.com/classroom.jpg');
```

### 3. Storage Setup (Option 2: Using Supabase Storage)

1. Create a storage bucket in your Supabase project:
   - Go to Storage → Create Bucket
   - Name it `background-images`
   - Make it public if you want direct access

2. Upload your background images to the bucket

3. Use the storage URLs in your database table or fetch directly from storage

### 4. Row Level Security (RLS)

Enable RLS on the table and create a policy to allow public read access:

```sql
-- Enable RLS
ALTER TABLE background_images ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access"
  ON background_images
  FOR SELECT
  USING (true);
```

## How It Works

### Background Image Levels

The game changes backgrounds at specific score milestones:

- **Level 0** (Start): Initial background (default: forest.jpg)
- **Level 5**: Changes when distance score reaches 5
- **Level 10**: Changes when distance score reaches 10
- **Level 15**: Changes when distance score reaches 15
- **Level 20**: Changes when distance score reaches 20

### Fallback System

If Supabase is not configured or fails to fetch images, the game automatically falls back to local assets in the `assets` folder:

```javascript
const fallbackImages = new Map([
  [0, './assets/forest.jpg'],
  [5, './assets/trees.jpg'],
  [10, './assets/tokyo.jpg'],
  [15, './assets/castle.jpg'],
  [20, './assets/classroom.jpg'],
]);
```

## API Reference

### `useBackgroundImages` Hook

```typescript
const { images, isLoading, error, getImageForLevel } = useBackgroundImages(
  'background_images',  // Table name
  fallbackImages        // Fallback images map
);
```

**Returns:**
- `images`: Map<number, string> - All loaded images keyed by level
- `isLoading`: boolean - Loading state
- `error`: string | null - Error message if fetch failed
- `getImageForLevel`: (level: number) => string | undefined - Helper to get image URL for specific level

### Image Service Functions

#### `fetchImagesFromDatabase(tableName)`
Fetches all background images from a Supabase database table.

#### `fetchImageForLevel(level, tableName)`
Fetches a specific background image for a given level.

#### `fetchImagesFromStorage(bucketName, folderPath)`
Fetches images directly from Supabase Storage bucket.

#### `getPublicUrl(bucketName, filePath)`
Converts a storage bucket path to a public URL.

## Testing

### Without Supabase
If you don't set up Supabase, the game will:
1. Show a warning in the console
2. Display "⚠️ Using fallback images" in the UI
3. Use local assets from the `assets` folder

### With Supabase
1. Set up your environment variables
2. Create the database table and insert data
3. Run the game - it will fetch images from Supabase
4. Check the browser console for "Background changed to level X" messages

## Troubleshooting

### "Supabase environment variables not set"
- Make sure you created a `.env` file in `apps/client`
- Restart your dev server after adding environment variables

### "No images found in database"
- Check that your table name matches ('background_images' by default)
- Verify that you inserted data into the table
- Check RLS policies allow public read access

### Images not loading
- Check browser console for errors
- Verify image URLs are publicly accessible
- Check CORS settings in Supabase if using direct storage URLs

## Architecture

```
ParkourGame Component
  ↓
useBackgroundImages Hook
  ↓
imageService Functions
  ↓
Supabase Client
  ↓
Supabase Database/Storage
```

The system is designed to be resilient with multiple fallback layers:
1. Try Supabase database
2. Fall back to provided fallback images
3. Ultimate fallback to local assets

