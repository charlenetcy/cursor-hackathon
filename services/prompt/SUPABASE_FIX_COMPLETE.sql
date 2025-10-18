-- Complete fix for Supabase storage policies
-- Run this in: https://app.supabase.com/project/islcnanxruspdvmligna/sql/new

-- 1. First, drop any existing conflicting policies
DROP POLICY IF EXISTS "Allow public inserts on game-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates on game-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to game-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads on game-assets" ON storage.objects;

-- 2. Create comprehensive policies for game-assets bucket
-- Allow SELECT (reading files)
CREATE POLICY "Allow public reads on game-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'game-assets');

-- Allow INSERT (uploading new files)
CREATE POLICY "Allow public inserts on game-assets"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'game-assets');

-- Allow UPDATE (updating existing files)
CREATE POLICY "Allow public updates on game-assets"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'game-assets')
WITH CHECK (bucket_id = 'game-assets');

-- Allow DELETE (deleting files)
CREATE POLICY "Allow public deletes on game-assets"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'game-assets');

-- 3. Ensure the bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'game-assets';

-- 4. Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%game-assets%'
ORDER BY policyname;

