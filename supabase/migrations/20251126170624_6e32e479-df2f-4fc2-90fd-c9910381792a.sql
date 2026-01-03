-- Create saved_buyers table for sellers to save buyers they want to work with
CREATE TABLE IF NOT EXISTS public.saved_buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.saved_buyers ENABLE ROW LEVEL SECURITY;

-- Sellers can save buyers
CREATE POLICY "Sellers can save buyers"
ON public.saved_buyers
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can unsave buyers
CREATE POLICY "Sellers can unsave buyers"
ON public.saved_buyers
FOR DELETE
USING (auth.uid() = seller_id);

-- Sellers can view their saved buyers
CREATE POLICY "Sellers can view their saved buyers"
ON public.saved_buyers
FOR SELECT
USING (auth.uid() = seller_id);