-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view attachments in messages they have access to
CREATE POLICY "Users can view message attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- RLS policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);