-- Add resolution approval columns for dual-party resolution
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

-- Create user_addresses table for address management
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  full_address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own addresses
CREATE POLICY "Users can view own addresses" ON public.user_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON public.user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON public.user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON public.user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-resolve halted jobs when both parties approve
CREATE OR REPLACE FUNCTION public.auto_resolve_halted_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_approved_resolution = true AND NEW.seller_approved_resolution = true AND NEW.halted = true THEN
    NEW.halted := false;
    NEW.resolved_at := now();
    NEW.buyer_approved_resolution := false;
    NEW.seller_approved_resolution := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for auto-resolution
DROP TRIGGER IF EXISTS auto_resolve_booking_halted ON booking_requests;
CREATE TRIGGER auto_resolve_booking_halted
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();

DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
CREATE TRIGGER auto_resolve_request_halted
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();