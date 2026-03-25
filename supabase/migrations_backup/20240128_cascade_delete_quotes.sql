-- Fix orphaned quotes: Add CASCADE delete for quote_submissions
-- When a maintenance_request is deleted, all related quotes should also be deleted
-- Step 1: Drop existing constraint (if exists)
ALTER TABLE public.quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_request_id_fkey;
-- Step 2: Re-add with CASCADE
ALTER TABLE public.quote_submissions
ADD CONSTRAINT quote_submissions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;
-- Also cascade for messages tied to quotes
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_quote_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quote_submissions(id) ON DELETE CASCADE;
-- And tracked_items
ALTER TABLE public.tracked_items DROP CONSTRAINT IF EXISTS tracked_items_item_id_fkey;
-- tracked_items is polymorphic (item_type can be 'request' or 'tender'), 
-- so we can't add a simple FK. We'll clean up via trigger instead.
-- Cleanup trigger for tracked_items when request is deleted
CREATE OR REPLACE FUNCTION public.cleanup_tracked_items_on_request_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM public.tracked_items
WHERE item_id = OLD.id
    AND item_type = 'request';
RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trigger_cleanup_tracked_items ON public.maintenance_requests;
CREATE TRIGGER trigger_cleanup_tracked_items BEFORE DELETE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.cleanup_tracked_items_on_request_delete();