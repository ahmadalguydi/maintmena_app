-- Add contract_id column to seller_reviews for better duplicate prevention
ALTER TABLE public.seller_reviews
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE
SET NULL;
-- Create unique constraint to prevent duplicate reviews per contract
-- This ensures only one review per contract
CREATE UNIQUE INDEX IF NOT EXISTS seller_reviews_contract_id_unique ON public.seller_reviews (contract_id)
WHERE contract_id IS NOT NULL;
-- Also create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_reviews_contract_id ON public.seller_reviews(contract_id);