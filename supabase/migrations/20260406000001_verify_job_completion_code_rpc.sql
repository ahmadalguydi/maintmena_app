-- ============================================================
-- Migration: verify_job_completion_code RPC
-- Verifies the 6-digit completion code entered by the seller
-- matches the code generated for the buyer. On success, marks
-- the job as completed.
-- ============================================================
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
    -- Fetch the current request state
    SELECT job_completion_code, status, assigned_seller_id
      INTO v_stored_code, v_status, v_seller_id
      FROM public.maintenance_requests
     WHERE id = p_request_id
       FOR UPDATE;

    -- Validate request exists
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    -- Only allow verification on jobs that are seller_marked_complete or in_progress
    IF v_status NOT IN ('seller_marked_complete', 'in_progress', 'arrived') THEN
        RAISE EXCEPTION 'Job is not in a completable state';
    END IF;

    -- Verify the caller is the assigned seller
    IF v_seller_id IS NULL OR v_seller_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to complete this job';
    END IF;

    -- If no code was generated yet, generate one now and fail (buyer must see it first)
    IF v_stored_code IS NULL OR v_stored_code = '' THEN
        -- Generate a 6-digit code and store it for the buyer to see
        UPDATE public.maintenance_requests
           SET job_completion_code = lpad(floor(random() * 1000000)::text, 6, '0'),
               updated_at = now()
         WHERE id = p_request_id;
        RETURN false;
    END IF;

    -- Compare codes (case-insensitive trim)
    IF trim(v_stored_code) != trim(p_code) THEN
        RETURN false;
    END IF;

    -- Code matches — mark the job as completed
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
