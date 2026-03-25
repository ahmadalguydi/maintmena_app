-- ============================================================
-- Fix: accept_marketplace_job now accepts optional p_pricing
-- parameter so sellers can submit their pricing when accepting
-- a marketplace job.  The previous 2-param version caused a
-- Postgres "unexpected named parameter" error when the client
-- passed p_pricing.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_marketplace_job(
    p_job_id    uuid,
    p_seller_id uuid,
    p_pricing   jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status          text;
    v_existing_seller uuid;
BEGIN
    -- Check the job exists and is still open
    SELECT status, assigned_seller_id
      INTO v_status, v_existing_seller
      FROM public.maintenance_requests
     WHERE id = p_job_id
       FOR UPDATE;

    IF v_status IS NULL THEN
        RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
    END IF;

    -- Already taken
    IF v_existing_seller IS NOT NULL THEN
        RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
    END IF;

    -- Only accept open jobs
    IF v_status != 'open' THEN
        RETURN jsonb_build_object(
            'accepted',      false,
            'reason',        'not_open',
            'current_status', v_status
        );
    END IF;

    -- Accept the job — start at 'accepted', store pricing if provided
    UPDATE public.maintenance_requests
       SET status             = 'accepted',
           assigned_seller_id = p_seller_id,
           seller_pricing     = COALESCE(p_pricing, seller_pricing),
           updated_at         = now()
     WHERE id = p_job_id;

    RETURN jsonb_build_object(
        'accepted',   true,
        'job_id',     p_job_id,
        'seller_id',  p_seller_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid, jsonb) TO authenticated;
-- Also keep the old 2-param signature in case any older clients call it
GRANT EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid) TO authenticated;
