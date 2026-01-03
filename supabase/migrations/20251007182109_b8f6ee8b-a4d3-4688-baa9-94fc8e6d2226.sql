-- Fix quote_submissions status to include 'negotiating' and ensure negotiation insert updates quote status
BEGIN;

-- 1) Relax/Add status values to include 'negotiating'
ALTER TABLE public.quote_submissions
  DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

ALTER TABLE public.quote_submissions
  ADD CONSTRAINT quote_submissions_status_check
  CHECK (status IN (
    'pending',
    'submitted',
    'shortlisted',
    'negotiating',
    'accepted',
    'rejected',
    'withdrawn'
  ));

-- 2) Ensure trigger exists to set status to negotiating when a negotiation offer is created
-- Update function to avoid using nonexistent 'declined' status and instead use 'rejected'
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status NOT IN ('accepted','rejected');
  RETURN NEW;
END;
$$;

-- Recreate the trigger to be safe
DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
AFTER INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

COMMIT;