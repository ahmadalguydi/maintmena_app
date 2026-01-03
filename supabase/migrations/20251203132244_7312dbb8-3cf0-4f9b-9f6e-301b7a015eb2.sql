-- Update message-attachments bucket to be public for file access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';