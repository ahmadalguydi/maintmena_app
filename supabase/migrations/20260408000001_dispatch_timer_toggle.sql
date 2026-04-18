-- ============================================================
-- Migration: Dispatch timer toggle
-- When dispatch_timer_enabled is 'false' in platform_settings,
-- offers get no expiry (expires_at = NULL) and sessions get no
-- timeout, giving sellers unlimited time to accept.
-- ============================================================

-- ============================================================
-- Updated start_job_dispatch: respects dispatch_timer_enabled
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
    v_timer_enabled    boolean := true;
    v_timer_setting    text;
BEGIN
    -- Check if dispatch timer is enabled (default: true)
    SELECT value INTO v_timer_setting
      FROM public.platform_settings
     WHERE key = 'dispatch_timer_enabled';

    IF v_timer_setting IS NOT NULL AND v_timer_setting = 'false' THEN
        v_timer_enabled := false;
    END IF;

    IF v_timer_enabled THEN
        -- Calculate smart timeout (existing logic)
        v_timeout_minutes := calculate_dispatch_timeout_minutes(
            p_is_scheduled,
            p_scheduled_for,
            COALESCE(array_length(p_seller_ids, 1), 0)
        );
        v_timeout_at := now() + (v_timeout_minutes || ' minutes')::interval;

        -- Offer expiry: longer for scheduled, shorter for ASAP
        IF p_is_scheduled AND p_scheduled_for IS NOT NULL THEN
            v_offer_expires := now() + LEAST(
                (v_timeout_minutes || ' minutes')::interval,
                interval '4 hours'
            );
        ELSE
            v_offer_expires := now() + interval '30 minutes';
        END IF;
    ELSE
        -- Timer disabled: no expiry, no timeout
        v_timeout_minutes := NULL;
        v_timeout_at := NULL;
        v_offer_expires := NULL;
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
