-- ============================================================
-- Fix: accept_job_offer now also updates maintenance_requests
-- Previously the RPC only updated job_dispatch_sessions /
-- job_dispatch_offers but never stamped assigned_seller_id or
-- changed the request status — so the job vanished from every
-- query that reads maintenance_requests.assigned_seller_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_job_offer(
    p_offer_id  uuid,
    p_seller_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id    uuid;
    v_job_id        uuid;
    v_job_type      text;
    v_offer_status  text;
    v_session_status text;
BEGIN
    -- Lock the offer row and check its status
    SELECT dispatch_session_id, job_id, job_type, offer_status
      INTO v_session_id, v_job_id, v_job_type, v_offer_status
      FROM public.job_dispatch_offers
     WHERE id = p_offer_id
       AND seller_id = p_seller_id
       FOR UPDATE;

    IF v_offer_status IS NULL THEN
        RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN
        RAISE EXCEPTION 'Offer is no longer available';
    END IF;

    -- Lock the session row to prevent race conditions
    SELECT dispatch_status INTO v_session_status
      FROM public.job_dispatch_sessions
     WHERE id = v_session_id
       FOR UPDATE;

    IF v_session_status = 'assignment_confirmed' THEN
        -- Someone else got there first — close this offer
        UPDATE public.job_dispatch_offers
           SET offer_status = 'auto_closed', updated_at = now()
         WHERE id = p_offer_id;
        RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
    END IF;

    -- We are the winner! Confirm the session
    UPDATE public.job_dispatch_sessions
       SET dispatch_status    = 'assignment_confirmed',
           accepted_seller_id = p_seller_id,
           ended_at           = now(),
           updated_at         = now()
     WHERE id = v_session_id;

    -- Mark the winning offer
    UPDATE public.job_dispatch_offers
       SET offer_status   = 'accepted',
           responded_at   = now(),
           response_type  = 'accept',
           updated_at     = now()
     WHERE id = p_offer_id;

    -- Auto-close all competing offers for this session
    UPDATE public.job_dispatch_offers
       SET offer_status = 'auto_closed', updated_at = now()
     WHERE dispatch_session_id = v_session_id
       AND id != p_offer_id
       AND offer_status IN ('sent', 'delivered', 'seen');

    -- *** NEW: Stamp the maintenance_request so every downstream query
    --          that reads assigned_seller_id will find the job. ***
    IF v_job_type = 'request' THEN
        UPDATE public.maintenance_requests
           SET assigned_seller_id = p_seller_id,
               status             = 'accepted',
               updated_at         = now()
         WHERE id = v_job_id
           AND (assigned_seller_id IS NULL OR assigned_seller_id = p_seller_id);
    END IF;

    RETURN jsonb_build_object(
        'accepted',    true,
        'job_id',      v_job_id,
        'job_type',    v_job_type,
        'session_id',  v_session_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid) TO authenticated;


-- ============================================================
-- Fix: accept_marketplace_job should set status = 'accepted'
-- not 'in_progress'. The job lifecycle must go through the full
-- progression (accepted → en_route → arrived → in_progress).
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_marketplace_job(
    p_job_id    uuid,
    p_seller_id uuid
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

    -- Accept the job — start at 'accepted', not 'in_progress'
    UPDATE public.maintenance_requests
       SET status             = 'accepted',
           assigned_seller_id = p_seller_id,
           updated_at         = now()
     WHERE id = p_job_id;

    RETURN jsonb_build_object(
        'accepted',   true,
        'job_id',     p_job_id,
        'seller_id',  p_seller_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid) TO authenticated;
