-- Create storage bucket for request photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-photos',
  'request-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote_attachments',
  'quote_attachments', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Users can upload request photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quote attachments" ON storage.objects;

-- Allow authenticated users to upload to their own folder (request-photos)
CREATE POLICY "Users can upload request photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (request-photos)
CREATE POLICY "Public read access for request photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'request-photos');

-- Allow users to delete their own photos (request-photos)
CREATE POLICY "Users can delete own request photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload to their own folder (quote_attachments)
CREATE POLICY "Users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (quote_attachments)
CREATE POLICY "Public read access for quote attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote_attachments');

-- Allow users to delete their own attachments (quote_attachments)
CREATE POLICY "Users can delete own quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add photos column to maintenance_requests if it doesn't exist
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;

-- Add attachments column to quote_submissions if it doesn't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT NULL;
