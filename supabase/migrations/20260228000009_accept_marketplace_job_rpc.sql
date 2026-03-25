-- ============================================================
-- Migration: accept_marketplace_job RPC
-- Allows a seller to accept a marketplace (non-dispatched) job.
-- Uses SECURITY DEFINER to bypass the buyer-only UPDATE RLS policy.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_marketplace_job(p_job_id uuid, p_seller_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_status text;
v_existing_seller uuid;
BEGIN -- Check the job exists and is still open
SELECT status,
    assigned_seller_id INTO v_status,
    v_existing_seller
FROM public.maintenance_requests
WHERE id = p_job_id FOR
UPDATE;
IF v_status IS NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
END IF;
-- Already taken
IF v_existing_seller IS NOT NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- Only accept open jobs
IF v_status != 'open' THEN RETURN jsonb_build_object(
    'accepted',
    false,
    'reason',
    'not_open',
    'current_status',
    v_status
);
END IF;
-- Accept the job
UPDATE public.maintenance_requests
SET status = 'in_progress',
    assigned_seller_id = p_seller_id,
    updated_at = now()
WHERE id = p_job_id;
RETURN jsonb_build_object(
    'accepted',
    true,
    'job_id',
    p_job_id,
    'seller_id',
    p_seller_id
);
END;
$$;
-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid) TO authenticated;