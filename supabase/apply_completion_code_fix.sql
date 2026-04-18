-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Ensures the job completion code system works end-to-end:
--   1. Adds the job_completion_code column (if missing)
--   2. Creates the trigger that auto-generates codes
--   3. Creates the verify_job_completion_code RPC
-- ============================================================

-- Step 1: Ensure the column exists
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS job_completion_code    TEXT,
  ADD COLUMN IF NOT EXISTS seller_marked_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_marked_complete  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seller_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_completion_date  TIMESTAMPTZ;

-- Step 2: Trigger to auto-generate code when seller marks complete
CREATE OR REPLACE FUNCTION public.generate_completion_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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

-- Step 3: The RPC function the frontend calls
CREATE OR REPLACE FUNCTION public.verify_job_completion_code(
    p_request_id uuid,
    p_code       text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_code text;
    v_status      text;
    v_seller_id   uuid;
BEGIN
    SELECT job_completion_code, status, assigned_seller_id
      INTO v_stored_code, v_status, v_seller_id
      FROM public.maintenance_requests
     WHERE id = p_request_id
       FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF v_status NOT IN ('seller_marked_complete', 'in_progress', 'arrived') THEN
        RAISE EXCEPTION 'Job is not in a completable state (current: %)', v_status;
    END IF;

    IF v_seller_id IS NULL OR v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to complete this job';
    END IF;

    IF v_stored_code IS NULL OR v_stored_code = '' THEN
        UPDATE public.maintenance_requests
           SET job_completion_code = lpad(floor(random() * 1000000)::text, 6, '0'),
               updated_at = now()
         WHERE id = p_request_id;
        RETURN false;
    END IF;

    IF trim(v_stored_code) != trim(p_code) THEN
        RETURN false;
    END IF;

    UPDATE public.maintenance_requests
       SET status = 'completed',
           buyer_marked_complete = true,
           buyer_completion_date = now(),
           updated_at = now()
     WHERE id = p_request_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_job_completion_code(uuid, text) TO authenticated;
