-- Add avatar_seed column to profiles table for custom avatar selection
ALTER TABLE public.profiles 
ADD COLUMN avatar_seed TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.avatar_seed IS 'Custom avatar seed for DiceBear API (e.g., warrior, hero, explorer)';

-- Ensure user_preferences table has SAR as default currency
-- Check if table exists and add default if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    -- Add default to preferred_currency if column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences' 
      AND column_name = 'preferred_currency'
    ) THEN
      ALTER TABLE public.user_preferences 
      ALTER COLUMN preferred_currency SET DEFAULT 'SAR';
    END IF;
  END IF;
END $$;