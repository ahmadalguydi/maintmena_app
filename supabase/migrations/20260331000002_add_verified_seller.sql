-- Add verified_seller flag to profiles
-- Used by admin Sellers Directory to mark verified providers
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_seller BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_verified_seller ON public.profiles (verified_seller);
