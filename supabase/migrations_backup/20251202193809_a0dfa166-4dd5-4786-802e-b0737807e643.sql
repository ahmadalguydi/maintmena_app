-- Add payload column to messages table for attachments (images, files, location)
ALTER TABLE public.messages 
ADD COLUMN payload jsonb DEFAULT NULL;