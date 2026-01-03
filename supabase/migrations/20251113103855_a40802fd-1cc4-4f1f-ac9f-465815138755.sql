-- Add block-based editor fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS blocks_en JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blocks_ar JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.blogs.blocks_en IS 'JSON array of content blocks for English version';
COMMENT ON COLUMN public.blogs.blocks_ar IS 'JSON array of content blocks for Arabic version';
COMMENT ON COLUMN public.blogs.scheduled_at IS 'Scheduled publish date/time';
