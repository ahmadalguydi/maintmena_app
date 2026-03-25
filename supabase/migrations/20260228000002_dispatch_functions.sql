-- ============================================================
-- Migration: Dispatch Functions
-- Creates the accept_job_offer() RPC function used by sellers
-- to atomically accept a job dispatch offer.
--
-- NOTE: This file contains PL/pgSQL blocks. If the Supabase CLI
-- fails to apply it, run it manually in the Dashboard SQL Editor.
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
IF v_offer_status IS NULL THEN RAISE EXCEPTION 'Offer not found';
END IF;
IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN RAISE EXCEPTION 'Offer is no longer available';
END IF;
-- Lock the session row to prevent race conditions
SELECT dispatch_status INTO v_session_status
FROM public.job_dispatch_sessions
WHERE id = v_session_id FOR
UPDATE;
IF v_session_status = 'assignment_confirmed' THEN -- Someone else got there first — close this offer
UPDATE public.job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE id = p_offer_id;
RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- We are the winner! Confirm the session
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
-- Auto-close all competing offers for this session
UPDATE public.job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE dispatch_session_id = v_session_id
    AND id != p_offer_id
    AND offer_status IN ('sent', 'delivered', 'seen');
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
-- Grant execute to authenticated users (sellers call this client-side)
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid) TO authenticated;