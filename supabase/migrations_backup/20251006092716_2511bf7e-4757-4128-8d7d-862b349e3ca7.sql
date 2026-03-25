-- Add source_link field to signals table for primary source verification
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS source_link TEXT;

-- Add source_link field to tenders table for primary source verification
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS source_link TEXT;