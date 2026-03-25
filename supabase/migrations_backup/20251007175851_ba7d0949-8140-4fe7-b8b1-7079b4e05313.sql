-- Create table to track negotiation offers per quote
CREATE TABLE IF NOT EXISTS public.quote_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_submissions(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  price_offer numeric,
  duration_offer text,
  message text,
  status text NOT NULL DEFAULT 'open', -- open | accepted | declined | countered | withdrawn
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_negotiations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid name conflicts
DROP POLICY IF EXISTS "Participants can view negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can insert negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can update negotiations" ON public.quote_negotiations;

-- Policy: Participants (buyer or seller) can view negotiation entries for their quotes
CREATE POLICY "Participants can view negotiations"
ON public.quote_negotiations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Policy: Participants can insert negotiation entries for their quotes
CREATE POLICY "Participants can insert negotiations"
ON public.quote_negotiations
FOR INSERT
WITH CHECK (
  initiator_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (
        -- Seller initiates to buyer
        (qs.seller_id = auth.uid() AND recipient_id = mr.buyer_id)
        OR
        -- Buyer initiates to seller
        (mr.buyer_id = auth.uid() AND recipient_id = qs.seller_id)
      )
  )
);

-- Policy: Participants can update negotiation entries (e.g., accept/decline/counter)
CREATE POLICY "Participants can update negotiations"
ON public.quote_negotiations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Trigger to set quote_submissions.status = 'negotiating' when a negotiation entry is created
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status <> 'accepted' AND status <> 'declined';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
BEFORE INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

-- Generic updated_at trigger for quote_negotiations
DROP TRIGGER IF EXISTS trg_quote_negotiations_updated_at ON public.quote_negotiations;
CREATE TRIGGER trg_quote_negotiations_updated_at
BEFORE UPDATE ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Useful index for faster lookups by quote
CREATE INDEX IF NOT EXISTS idx_quote_negotiations_quote_id ON public.quote_negotiations(quote_id);
