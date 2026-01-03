-- Add denormalized buyer fields to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS buyer_type text,
  ADD COLUMN IF NOT EXISTS buyer_company_name text;

-- Function to sync buyer info when request is created or updated
CREATE OR REPLACE FUNCTION public.sync_request_buyer_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_profile RECORD;
BEGIN
  SELECT buyer_type, company_name INTO buyer_profile
  FROM public.profiles
  WHERE id = NEW.buyer_id;
  
  NEW.buyer_type := buyer_profile.buyer_type;
  NEW.buyer_company_name := buyer_profile.company_name;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON public.maintenance_requests;
CREATE TRIGGER trg_sync_request_buyer_info
BEFORE INSERT OR UPDATE OF buyer_id ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_buyer_info();

-- Function to update requests when buyer profile changes
CREATE OR REPLACE FUNCTION public.sync_requests_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.buyer_type IS DISTINCT FROM OLD.buyer_type) OR 
     (NEW.company_name IS DISTINCT FROM OLD.company_name) THEN
    UPDATE public.maintenance_requests
    SET buyer_type = NEW.buyer_type,
        buyer_company_name = NEW.company_name,
        updated_at = now()
    WHERE buyer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_requests_on_profile_update ON public.profiles;
CREATE TRIGGER trg_sync_requests_on_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_requests_on_profile_update();

-- Backfill existing requests with buyer info
UPDATE public.maintenance_requests mr
SET buyer_type = p.buyer_type,
    buyer_company_name = p.company_name
FROM public.profiles p
WHERE mr.buyer_id = p.id
  AND (mr.buyer_type IS NULL OR mr.buyer_company_name IS NULL);