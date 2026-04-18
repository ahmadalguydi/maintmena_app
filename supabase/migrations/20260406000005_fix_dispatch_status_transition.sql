-- ============================================================
-- Fix: Update CHECK constraint, dispatch RPCs, and transition trigger
-- to support the full lifecycle including dispatching, no_seller_found, etc.
-- ============================================================

-- 0. Update the CHECK constraint to include all valid statuses
ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
ALTER TABLE public.maintenance_requests
ADD CONSTRAINT maintenance_requests_status_check CHECK (
    status IN (
        'draft',
        'open',
        'submitted',
        'dispatching',
        'accepted',
        'no_seller_found',
        'en_route',
        'arrived',
        'in_progress',
        'seller_marked_complete',
        'completed',
        'closed',
        'cancelled',
        'disputed'
    )
);

-- 1. Update start_job_dispatch to also update the request status
CREATE OR REPLACE FUNCTION public.start_job_dispatch(
    p_job_id uuid,
    p_job_type text,
    p_seller_ids uuid[],
    p_wave_size int DEFAULT 3,
    p_is_scheduled boolean DEFAULT false,
    p_scheduled_for timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id uuid;
    v_wave_sellers uuid[];
    v_seller_id uuid;
    v_rank int := 1;
    v_expires_at timestamptz;
    v_current_status text;
BEGIN
    -- Update the maintenance_request status to 'dispatching' if it's still open/submitted
    IF p_job_type = 'request' THEN
        SELECT status INTO v_current_status
          FROM public.maintenance_requests
         WHERE id = p_job_id;

        IF v_current_status IN ('open', 'submitted') THEN
            UPDATE public.maintenance_requests
               SET status = 'dispatching',
                   updated_at = now()
             WHERE id = p_job_id
               AND status IN ('open', 'submitted');
        END IF;
    END IF;

    -- Create (or reuse) a dispatch session for this job
    INSERT INTO public.job_dispatch_sessions (
        job_id, job_type, dispatch_status, current_wave_number,
        eligible_count_initial, started_at, created_at, updated_at
    ) VALUES (
        p_job_id, p_job_type, 'dispatching_wave_1', 1,
        COALESCE(array_length(p_seller_ids, 1), 0), now(), now(), now()
    ) ON CONFLICT (job_id, job_type) DO UPDATE
    SET dispatch_status = 'dispatching_wave_1',
        current_wave_number = 1,
        eligible_count_initial = COALESCE(array_length(p_seller_ids, 1), 0),
        started_at = now(),
        updated_at = now()
    RETURNING id INTO v_session_id;

    -- Pick Wave 1 sellers
    IF array_length(p_seller_ids, 1) IS NULL THEN
        RETURN v_session_id;
    END IF;

    v_wave_sellers := p_seller_ids[1:LEAST(p_wave_size, array_length(p_seller_ids, 1))];

    -- Offer expiry: 5 minutes for standard, 15 for scheduled
    IF p_is_scheduled THEN
        v_expires_at := now() + interval '15 minutes';
    ELSE
        v_expires_at := now() + interval '5 minutes';
    END IF;

    -- Insert one offer per Wave-1 seller
    FOREACH v_seller_id IN ARRAY v_wave_sellers LOOP
        INSERT INTO public.job_dispatch_offers (
            dispatch_session_id, job_id, job_type, seller_id,
            wave_number, rank_position_at_send, offer_status,
            sent_at, expires_at, created_at, updated_at
        ) VALUES (
            v_session_id, p_job_id, p_job_type, v_seller_id,
            1, v_rank, 'sent', now(), v_expires_at, now(), now()
        ) ON CONFLICT (dispatch_session_id, seller_id) DO NOTHING;
        v_rank := v_rank + 1;
    END LOOP;

    RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_job_dispatch(uuid, text, uuid[], int, boolean, timestamptz) TO authenticated;

-- 2. Update accept_job_offer to handle pre-dispatching statuses
CREATE OR REPLACE FUNCTION public.accept_job_offer(
    p_offer_id  uuid,
    p_seller_id uuid,
    p_pricing   jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id     uuid;
    v_job_id         uuid;
    v_job_type       text;
    v_offer_status   text;
    v_session_status text;
    v_current_status text;
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
        UPDATE public.job_dispatch_offers
           SET offer_status = 'auto_closed', updated_at = now()
         WHERE id = p_offer_id;
        RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
    END IF;

    -- Confirm the session
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

    -- Auto-close competing offers
    UPDATE public.job_dispatch_offers
       SET offer_status = 'auto_closed', updated_at = now()
     WHERE dispatch_session_id = v_session_id
       AND id != p_offer_id
       AND offer_status IN ('sent', 'delivered', 'seen');

    -- Update maintenance_request
    IF v_job_type = 'request' THEN
        -- First ensure status is 'dispatching' so the transition trigger allows → accepted
        SELECT status INTO v_current_status
          FROM public.maintenance_requests
         WHERE id = v_job_id
           FOR UPDATE;

        IF v_current_status IN ('open', 'submitted') THEN
            UPDATE public.maintenance_requests
               SET status = 'dispatching', updated_at = now()
             WHERE id = v_job_id;
        END IF;

        -- Now transition to accepted
        UPDATE public.maintenance_requests
           SET assigned_seller_id = p_seller_id,
               status             = 'accepted',
               seller_pricing     = COALESCE(p_pricing, seller_pricing),
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

GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid) TO authenticated;

-- 3. Update status transition enforcement to allow re-dispatch from accepted
-- (needed for "change provider" flow where buyer wants a different seller)
CREATE OR REPLACE FUNCTION public.enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_allowed text[];
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    CASE OLD.status
        WHEN 'open'                  THEN v_allowed := ARRAY['submitted', 'dispatching', 'no_seller_found', 'cancelled'];
        WHEN 'submitted'             THEN v_allowed := ARRAY['dispatching', 'no_seller_found', 'cancelled'];
        WHEN 'dispatching'           THEN v_allowed := ARRAY['accepted', 'no_seller_found', 'cancelled'];
        WHEN 'no_seller_found'       THEN v_allowed := ARRAY['dispatching', 'cancelled'];
        WHEN 'accepted'              THEN v_allowed := ARRAY['en_route', 'dispatching', 'cancelled'];
        WHEN 'en_route'              THEN v_allowed := ARRAY['arrived', 'cancelled'];
        WHEN 'arrived'               THEN v_allowed := ARRAY['in_progress', 'cancelled'];
        WHEN 'in_progress'           THEN v_allowed := ARRAY['seller_marked_complete', 'disputed'];
        WHEN 'seller_marked_complete' THEN v_allowed := ARRAY['completed', 'disputed'];
        WHEN 'completed'             THEN v_allowed := ARRAY['closed'];
        WHEN 'closed'                THEN v_allowed := ARRAY[]::text[];
        WHEN 'cancelled'             THEN v_allowed := ARRAY[]::text[];
        WHEN 'disputed'              THEN v_allowed := ARRAY['in_progress', 'cancelled', 'closed'];
        ELSE
            RETURN NEW;
    END CASE;

    IF NOT (NEW.status = ANY(v_allowed)) THEN
        RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;
