-- ============================================================
-- Migration: Auto-generate 6-digit completion code
-- When seller_marked_complete transitions to true, generate
-- a random 6-digit code if one doesn't already exist.
-- The buyer sees this code and gives it to the seller verbally.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_completion_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- When seller marks complete and no code exists yet, generate one
    IF NEW.seller_marked_complete = true
       AND (OLD.seller_marked_complete IS NULL OR OLD.seller_marked_complete = false)
       AND (NEW.job_completion_code IS NULL OR NEW.job_completion_code = '')
    THEN
        NEW.job_completion_code := lpad(floor(random() * 1000000)::text, 6, '0');
        NEW.seller_completion_date := COALESCE(NEW.seller_completion_date, now());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_completion_code ON public.maintenance_requests;

CREATE TRIGGER trg_generate_completion_code
    BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_completion_code();
