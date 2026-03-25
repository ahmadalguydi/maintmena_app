-- ============================================================
-- Migration: start_job_dispatch RPC (v2 - fixed UNIQUE constraint)
-- The job_dispatch_sessions table has UNIQUE(job_id, job_type)
-- so ON CONFLICT must reference both columns.
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_job_dispatch(
        p_job_id uuid,
        p_job_type text,
        -- 'request' | 'booking'
        p_seller_ids uuid [],
        -- ranked list (best → worst)
        p_wave_size int DEFAULT 3
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_wave_sellers uuid [];
v_seller_id uuid;
v_rank int := 1;
v_expires_at timestamptz;
BEGIN -- 1. Create (or reuse) a dispatch session for this job
--    ON CONFLICT uses (job_id, job_type) to match the actual UNIQUE constraint
INSERT INTO public.job_dispatch_sessions (
        job_id,
        job_type,
        dispatch_status,
        current_wave_number,
        eligible_count_initial,
        started_at,
        created_at,
        updated_at
    )
VALUES (
        p_job_id,
        p_job_type,
        'dispatching_wave_1',
        1,
        COALESCE(array_length(p_seller_ids, 1), 0),
        now(),
        now(),
        now()
    ) ON CONFLICT (job_id, job_type) DO
UPDATE
SET dispatch_status = 'dispatching_wave_1',
    current_wave_number = 1,
    eligible_count_initial = COALESCE(array_length(p_seller_ids, 1), 0),
    started_at = now(),
    updated_at = now()
RETURNING id INTO v_session_id;
-- 2. Pick Wave 1 sellers (first p_wave_size from the ranked list)
IF array_length(p_seller_ids, 1) IS NULL THEN RETURN v_session_id;
END IF;
v_wave_sellers := p_seller_ids [1 : LEAST(p_wave_size, array_length(p_seller_ids, 1))];
-- Offer expiry: 5 minutes for standard jobs
v_expires_at := now() + interval '5 minutes';
-- 3. Insert one offer per Wave-1 seller
FOREACH v_seller_id IN ARRAY v_wave_sellers LOOP
INSERT INTO public.job_dispatch_offers (
        dispatch_session_id,
        job_id,
        job_type,
        seller_id,
        wave_number,
        rank_position_at_send,
        offer_status,
        sent_at,
        expires_at,
        created_at,
        updated_at
    )
VALUES (
        v_session_id,
        p_job_id,
        p_job_type,
        v_seller_id,
        1,
        v_rank,
        'sent',
        now(),
        v_expires_at,
        now(),
        now()
    ) ON CONFLICT (dispatch_session_id, seller_id) DO NOTHING;
v_rank := v_rank + 1;
END LOOP;
RETURN v_session_id;
END;
$$;
-- Grant execute to authenticated users (buyers trigger this client-side)
GRANT EXECUTE ON FUNCTION public.start_job_dispatch(uuid, text, uuid [], int) TO authenticated;