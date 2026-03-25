-- Add buyer_type field to profiles table to distinguish between company and individual buyers
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS buyer_type text CHECK (buyer_type IN ('company', 'individual'));

-- Create index for faster queries filtering by buyer type
CREATE INDEX IF NOT EXISTS idx_profiles_buyer_type ON public.profiles(buyer_type);

-- Update existing buyers to have default buyer_type (company for backward compatibility)
-- Only update profiles that are buyers (have user_type = 'buyer' or have posted maintenance requests)
UPDATE public.profiles
SET buyer_type = 'company'
WHERE buyer_type IS NULL
  AND (
    user_type = 'buyer'
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE buyer_id = profiles.id
    )
  );
