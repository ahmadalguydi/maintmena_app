-- ============================================================
-- Migration: Update accept_job_offer to also update maintenance_requests
-- The original RPC only updated job_dispatch_offers/sessions.
-- The client-side update to maintenance_requests was blocked by RLS.
-- This fix makes the RPC atomically update everything.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_job_offer(p_offer_id uuid, p_seller_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_job_id uuid;
v_job_type text;
v_offer_status text;
v_session_status text;
BEGIN -- Lock the offer row and check its status
SELECT dispatch_session_id,
    job_id,
    job_type,
    offer_status INTO v_session_id,
    v_job_id,
    v_job_type,
    v_offer_status
FROM public.job_dispatch_offers
WHERE id = p_offer_id
    AND seller_id = p_seller_id FOR
UPDATE;
IF v_offer_status IS NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
END IF;
IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN RETURN jsonb_build_object(
    'accepted',
    false,
    'reason',
    'no_longer_available'
);
END IF;
-- Lock the session row to prevent race conditions
SELECT dispatch_status INTO v_session_status
FROM public.job_dispatch_sessions
WHERE id = v_session_id FOR
UPDATE;
IF v_session_status = 'assignment_confirmed' THEN -- Someone else got there first
UPDATE public.job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE id = p_offer_id;
RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- Confirm the session
UPDATE public.job_dispatch_sessions
SET dispatch_status = 'assignment_confirmed',
    accepted_seller_id = p_seller_id,
    ended_at = now(),
    updated_at = now()
WHERE id = v_session_id;
-- Mark the winning offer
UPDATE public.job_dispatch_offers
SET offer_status = 'accepted',
    responded_at = now(),
    response_type = 'accept',
    updated_at = now()
WHERE id = p_offer_id;
-- Auto-close competing offers
UPDATE public.job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE dispatch_session_id = v_session_id
    AND id != p_offer_id
    AND offer_status IN ('sent', 'delivered', 'seen');
-- === NEW: Update the original job record ===
-- This used to be done client-side but was blocked by RLS
IF v_job_type = 'request' THEN
UPDATE public.maintenance_requests
SET status = 'in_progress',
    assigned_seller_id = p_seller_id,
    updated_at = now()
WHERE id = v_job_id;
END IF;
RETURN jsonb_build_object(
    'accepted',
    true,
    'job_id',
    v_job_id,
    'job_type',
    v_job_type,
    'session_id',
    v_session_id
);
END;
$$;