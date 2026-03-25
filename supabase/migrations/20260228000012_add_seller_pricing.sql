-- ============================================================
-- Migration: Add seller_pricing to maintenance_requests
-- Updates RPCs to handle pricing when accepting jobs
-- ============================================================
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS seller_pricing JSONB;
-- 1b. Update the check constraint to allow 'accepted'
ALTER TABLE public.maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
ALTER TABLE public.maintenance_requests
ADD CONSTRAINT maintenance_requests_status_check CHECK (
        status IN (
            'draft',
            'open',
            'accepted',
            'in_progress',
            'en_route',
            'arrived',
            'completed',
            'cancelled',
            'disputed'
        )
    );
-- 2. Update accept_marketplace_job RPC
--    (This is for marketplace/fallback jobs with no dispatch session)
CREATE OR REPLACE FUNCTION public.accept_marketplace_job(
        p_job_id uuid,
        p_seller_id uuid,
        p_pricing jsonb DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_status text;
v_existing_seller uuid;
BEGIN -- Lock + read current state
SELECT status,
    assigned_seller_id INTO v_status,
    v_existing_seller
FROM public.maintenance_requests
WHERE id = p_job_id FOR
UPDATE;
IF v_status IS NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'not_found');
END IF;
IF v_existing_seller IS NOT NULL THEN RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
IF v_status != 'open' THEN RETURN jsonb_build_object(
    'accepted',
    false,
    'reason',
    'not_open',
    'current_status',
    v_status
);
END IF;
-- Accept it
UPDATE public.maintenance_requests
SET status = 'accepted',
    assigned_seller_id = p_seller_id,
    seller_pricing = p_pricing,
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
GRANT EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid, jsonb) TO authenticated;
-- 3. Update accept_job_offer RPC
--    Uses CORRECT column names from the current schema (migration 000010 baseline):
--      job_dispatch_offers  → dispatch_session_id, offer_status, response_type, responded_at
--      job_dispatch_sessions → dispatch_status, accepted_seller_id, ended_at
DROP FUNCTION IF EXISTS public.accept_job_offer(uuid, uuid);
CREATE OR REPLACE FUNCTION public.accept_job_offer(
        p_offer_id uuid,
        p_seller_id uuid,
        p_pricing jsonb DEFAULT NULL
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_job_id uuid;
v_job_type text;
v_offer_status text;
v_session_status text;
BEGIN -- Lock the offer row
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
-- Lock the session row (race-condition guard)
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
-- Update the job record with status + assigned seller + pricing
IF v_job_type = 'request' THEN
UPDATE public.maintenance_requests
SET status = 'accepted',
    assigned_seller_id = p_seller_id,
    seller_pricing = p_pricing,
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
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid, jsonb) TO authenticated;
-- 4. Update get_seller_scheduled_jobs RPC
--    DROP first because we're adding columns to the return type
DROP FUNCTION IF EXISTS public.get_seller_scheduled_jobs(uuid);
CREATE OR REPLACE FUNCTION public.get_seller_scheduled_jobs(p_seller_id uuid) RETURNS TABLE(
        id uuid,
        category text,
        title text,
        description text,
        location text,
        latitude double precision,
        longitude double precision,
        status text,
        urgency text,
        preferred_start_date timestamptz,
        created_at timestamptz,
        buyer_id uuid,
        seller_pricing jsonb
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT mr.id,
    mr.category,
    mr.title,
    mr.description,
    mr.location,
    mr.latitude,
    mr.longitude,
    mr.status,
    mr.urgency,
    mr.preferred_start_date,
    mr.created_at,
    mr.buyer_id,
    mr.seller_pricing
FROM public.maintenance_requests mr
WHERE mr.assigned_seller_id = p_seller_id
    AND mr.status = 'accepted'
ORDER BY COALESCE(mr.preferred_start_date, mr.created_at) ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_seller_scheduled_jobs(uuid) TO authenticated;