-- Fix: Accepting a quote should transition the related maintenance request to a valid status
-- Update the trigger function to set status to 'in_progress' instead of invalid 'awarded'
CREATE OR REPLACE FUNCTION public.close_request_on_quote_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.maintenance_requests
       SET status = 'in_progress', updated_at = now()
     WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$function$;