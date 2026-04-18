-- ============================================================
-- Migration: Smart dispatch timeout system
-- Adds timeout tracking to dispatch sessions and a function
-- to calculate smart timeouts based on request type, schedule
-- distance, and online seller count.
-- ============================================================

-- Add timeout columns to dispatch sessions
ALTER TABLE public.job_dispatch_sessions
  ADD COLUMN IF NOT EXISTS timeout_at         timestamptz,
  ADD COLUMN IF NOT EXISTS timeout_minutes    int,
  ADD COLUMN IF NOT EXISTS timeout_reason     text;

-- ============================================================
-- Function: calculate_dispatch_timeout_minutes
-- Returns the timeout in minutes based on:
--   - ASAP vs scheduled
--   - How far in the future the scheduled time is
--   - How many eligible sellers are online
-- Minimum: 30 minutes. Maximum: 1440 minutes (24 hours).
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_dispatch_timeout_minutes(
    p_is_scheduled     boolean,
    p_scheduled_for    timestamptz,
    p_eligible_sellers int
) RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_base_minutes     int;
    v_seller_factor    float;
    v_schedule_factor  float;
    v_hours_until      float;
    v_result           int;
BEGIN
    -- Base timeout by request type
    IF p_is_scheduled AND p_scheduled_for IS NOT NULL THEN
        -- Scheduled request: base depends on how far away the scheduled time is
        v_hours_until := EXTRACT(EPOCH FROM (p_scheduled_for - now())) / 3600.0;

        IF v_hours_until <= 0 THEN
            -- Scheduled time already passed or is now — treat like ASAP
            v_base_minutes := 30;
        ELSIF v_hours_until <= 2 THEN
            -- Scheduled within 2 hours — relatively urgent
            v_base_minutes := 45;
        ELSIF v_hours_until <= 6 THEN
            -- Scheduled within 6 hours
            v_base_minutes := 90;
        ELSIF v_hours_until <= 24 THEN
            -- Scheduled within a day
            v_base_minutes := 180;
        ELSIF v_hours_until <= 72 THEN
            -- Scheduled within 3 days
            v_base_minutes := 360;
        ELSE
            -- Scheduled further out — plenty of time
            v_base_minutes := 720;
        END IF;
    ELSE
        -- ASAP request: start with 30 minute base
        v_base_minutes := 30;
    END IF;

    -- Seller availability factor: fewer sellers = more time to find one
    IF p_eligible_sellers <= 0 THEN
        v_seller_factor := 2.0;    -- No sellers online, double the timeout
    ELSIF p_eligible_sellers <= 2 THEN
        v_seller_factor := 1.5;    -- Very few sellers
    ELSIF p_eligible_sellers <= 5 THEN
        v_seller_factor := 1.2;    -- Some sellers
    ELSE
        v_seller_factor := 1.0;    -- Plenty of sellers
    END IF;

    v_result := CEIL(v_base_minutes * v_seller_factor);

    -- Clamp to [30, 1440] (30 min to 24 hours)
    RETURN GREATEST(30, LEAST(v_result, 1440));
END;
$$;

-- ============================================================
-- Updated start_job_dispatch: now calculates and stores smart timeout
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_job_dispatch(
    p_job_id     uuid,
    p_job_type   text,
    p_seller_ids uuid[],
    p_wave_size  int DEFAULT 3,
    p_is_scheduled     boolean DEFAULT false,
    p_scheduled_for    timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id       uuid;
    v_wave_sellers     uuid[];
    v_seller_id        uuid;
    v_rank             int := 1;
    v_timeout_minutes  int;
    v_timeout_at       timestamptz;
    v_offer_expires    timestamptz;
BEGIN
    -- Calculate smart timeout
    v_timeout_minutes := calculate_dispatch_timeout_minutes(
        p_is_scheduled,
        p_scheduled_for,
        COALESCE(array_length(p_seller_ids, 1), 0)
    );
    v_timeout_at := now() + (v_timeout_minutes || ' minutes')::interval;

    -- Offer expiry: longer for scheduled, shorter for ASAP
    -- But never shorter than 30 minutes
    IF p_is_scheduled AND p_scheduled_for IS NOT NULL THEN
        v_offer_expires := now() + LEAST(
            (v_timeout_minutes || ' minutes')::interval,
            interval '4 hours'
        );
    ELSE
        v_offer_expires := now() + interval '30 minutes';
    END IF;

    -- 1. Create (or reuse) a dispatch session for this job
    INSERT INTO public.job_dispatch_sessions (
        job_id, job_type, dispatch_status,
        current_wave_number, eligible_count_initial,
        timeout_at, timeout_minutes,
        started_at, created_at, updated_at
    )
    VALUES (
        p_job_id, p_job_type, 'dispatching_wave_1',
        1, COALESCE(array_length(p_seller_ids, 1), 0),
        v_timeout_at, v_timeout_minutes,
        now(), now(), now()
    )
    ON CONFLICT (job_id, job_type) DO UPDATE SET
        dispatch_status = 'dispatching_wave_1',
        current_wave_number = 1,
        eligible_count_initial = COALESCE(array_length(p_seller_ids, 1), 0),
        timeout_at = v_timeout_at,
        timeout_minutes = v_timeout_minutes,
        started_at = now(),
        updated_at = now()
    RETURNING id INTO v_session_id;

    -- 2. Pick Wave 1 sellers
    IF array_length(p_seller_ids, 1) IS NULL THEN
        RETURN v_session_id;
    END IF;
    v_wave_sellers := p_seller_ids[1:LEAST(p_wave_size, array_length(p_seller_ids, 1))];

    -- 3. Insert one offer per Wave-1 seller
    FOREACH v_seller_id IN ARRAY v_wave_sellers LOOP
        INSERT INTO public.job_dispatch_offers (
            dispatch_session_id, job_id, job_type, seller_id,
            wave_number, rank_position_at_send, offer_status,
            sent_at, expires_at, created_at, updated_at
        ) VALUES (
            v_session_id, p_job_id, p_job_type, v_seller_id,
            1, v_rank, 'sent',
            now(), v_offer_expires, now(), now()
        ) ON CONFLICT (dispatch_session_id, seller_id) DO NOTHING;
        v_rank := v_rank + 1;
    END LOOP;

    RETURN v_session_id;
END;
$$;

-- Grant execute (overwrite previous grant)
GRANT EXECUTE ON FUNCTION public.start_job_dispatch(uuid, text, uuid[], int, boolean, timestamptz) TO authenticated;

-- ============================================================
-- Function: expire_stale_dispatch_sessions
-- Called periodically (or by client polling) to mark timed-out
-- dispatch sessions as 'no_seller_found' and update the request.
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_stale_dispatch_sessions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_count int := 0;
    v_session       record;
BEGIN
    FOR v_session IN
        SELECT ds.id AS session_id, ds.job_id, ds.job_type
          FROM public.job_dispatch_sessions ds
         WHERE ds.dispatch_status LIKE 'dispatching%'
           AND ds.timeout_at IS NOT NULL
           AND ds.timeout_at <= now()
         ORDER BY ds.timeout_at
         LIMIT 50  -- process in batches
    LOOP
        -- Mark session as timed out
        UPDATE public.job_dispatch_sessions
           SET dispatch_status = 'timed_out',
               timeout_reason = 'no_response_within_timeout',
               ended_at = now(),
               updated_at = now()
         WHERE id = v_session.session_id;

        -- Auto-close any pending offers
        UPDATE public.job_dispatch_offers
           SET offer_status = 'expired',
               updated_at = now()
         WHERE dispatch_session_id = v_session.session_id
           AND offer_status IN ('sent', 'delivered', 'seen');

        -- Update the maintenance request status
        IF v_session.job_type = 'request' THEN
            UPDATE public.maintenance_requests
               SET status = 'no_seller_found',
                   updated_at = now()
             WHERE id = v_session.job_id
               AND status IN ('dispatching', 'submitted', 'open', 'matching')
               AND assigned_seller_id IS NULL;
        END IF;

        v_expired_count := v_expired_count + 1;
    END LOOP;

    RETURN v_expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_stale_dispatch_sessions() TO authenticated;
