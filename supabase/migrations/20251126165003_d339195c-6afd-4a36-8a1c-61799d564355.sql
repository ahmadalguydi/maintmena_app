-- Create saved_vendors table for buyers to save their favorite service providers
CREATE TABLE IF NOT EXISTS public.saved_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.saved_vendors ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own saved vendors
CREATE POLICY "Buyers can view their saved vendors"
  ON public.saved_vendors
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Buyers can save vendors
CREATE POLICY "Buyers can save vendors"
  ON public.saved_vendors
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can unsave vendors
CREATE POLICY "Buyers can unsave vendors"
  ON public.saved_vendors
  FOR DELETE
  USING (auth.uid() = buyer_id);

-- Add index for performance
CREATE INDEX idx_saved_vendors_buyer_id ON public.saved_vendors(buyer_id);
CREATE INDEX idx_saved_vendors_seller_id ON public.saved_vendors(seller_id);