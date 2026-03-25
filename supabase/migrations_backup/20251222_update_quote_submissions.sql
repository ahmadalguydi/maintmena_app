-- Add start_date and attachments columns to quote_submissions table
ALTER TABLE "public"."quote_submissions" 
ADD COLUMN IF NOT EXISTS "start_date" date,
ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;

-- Create a storage bucket for quote attachments if it doesn't exist
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('quote-attachments', 'quote-attachments', true)
ON CONFLICT ("id") DO NOTHING;

-- Set up security policies for the storage bucket (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Quote attachments are publicly accessible" ON "storage"."objects";
CREATE POLICY "Quote attachments are publicly accessible" ON "storage"."objects"
  FOR SELECT USING (bucket_id = 'quote-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload quote attachments" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload quote attachments" ON "storage"."objects"
  FOR INSERT WITH CHECK (bucket_id = 'quote-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can update their own quote attachments" ON "storage"."objects"
  FOR UPDATE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can delete their own quote attachments" ON "storage"."objects"
  FOR DELETE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);
