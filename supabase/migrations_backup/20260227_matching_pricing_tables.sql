-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
-- 1. Pricing & Financial Data Models
CREATE TABLE IF NOT EXISTS fee_policy_versions (
    id text PRIMARY KEY,
    fee_mode text NOT NULL,
    -- 'free_intro', 'flat_fee', 'performance_fee'
    flat_fee_amount numeric,
    performance_model_key text,
    is_active boolean DEFAULT false,
    starts_at timestamptz DEFAULT now(),
    ends_at timestamptz,
    notes text
);
CREATE TABLE IF NOT EXISTS category_pricing_bands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id text NOT NULL,
    subcategory_id text,
    city_id text,
    display_mode text NOT NULL DEFAULT 'range',
    -- 'range', 'inspection', 'starts_from'
    min_amount numeric,
    max_amount numeric,
    starts_from_amount numeric,
    uncertainty_level text DEFAULT 'medium',
    -- 'low', 'medium', 'high'
    buyer_note text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_financials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL UNIQUE,
    seller_id uuid REFERENCES auth.users(id),
    -- Price inputs
    seller_estimate_accept_amount numeric,
    seller_final_claim_amount numeric,
    buyer_confirmed_paid_amount numeric,
    -- Fee outputs
    fee_model_version text REFERENCES fee_policy_versions(id),
    fee_mode text,
    fee_trigger text,
    actual_fee_amount numeric DEFAULT 0,
    simulated_fee_amount numeric,
    provider_net_amount numeric,
    -- Derived metrics
    est_to_buyer_gap_amount numeric,
    est_to_buyer_gap_pct numeric,
    seller_to_buyer_gap_amount numeric,
    seller_to_buyer_gap_pct numeric,
    pricing_outcome_status text,
    calculated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- 2. Dispatch Data Models
CREATE TABLE IF NOT EXISTS job_dispatch_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    -- 'booking' or 'request'
    dispatch_status text DEFAULT 'pending_match',
    -- 'pending_match', 'dispatching_wave_1', 'awaiting_seller_response', 'assignment_confirmed', 'no_seller_found', 'dispatch_cancelled'
    current_wave_number int DEFAULT 0,
    eligible_count_initial int DEFAULT 0,
    accepted_seller_id uuid REFERENCES auth.users(id),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(job_id, job_type)
);
CREATE TABLE IF NOT EXISTS job_dispatch_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_session_id uuid REFERENCES job_dispatch_sessions(id) ON DELETE CASCADE,
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    wave_number int NOT NULL,
    rank_position_at_send int,
    match_score_at_send numeric,
    offer_status text DEFAULT 'sent',
    -- 'sent', 'delivered', 'seen', 'declined', 'expired', 'accepted', 'auto_closed'
    sent_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    responded_at timestamptz,
    response_type text,
    decline_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(dispatch_session_id, seller_id)
);
-- RLS Policies
ALTER TABLE fee_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_offers ENABLE ROW LEVEL SECURITY;
-- Allow read access for category pricing to everyone
CREATE POLICY "Pricing bands are readable by everyone" ON category_pricing_bands FOR
SELECT USING (true);
-- Allow authenticated users to view dispatch offers sent to them
CREATE POLICY "Sellers can view their own dispatch offers" ON job_dispatch_offers FOR
SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Sellers can update their own dispatch offers" ON job_dispatch_offers FOR
UPDATE TO authenticated USING (seller_id = auth.uid());
-- Buyers can view dispatch sessions they initiated (checked via accepted_seller_id or auth)
CREATE POLICY "Authenticated users can view dispatch sessions" ON job_dispatch_sessions FOR
SELECT TO authenticated USING (true);
-- Function to handle atomic job acceptance (Race Condition Lock)
-- NOTE: The job status update (maintenance_requests/booking_requests) is handled in app code
CREATE OR REPLACE FUNCTION accept_job_offer(p_offer_id uuid, p_seller_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_job_id uuid;
v_job_type text;
v_offer_status text;
v_session_status text;
BEGIN -- 1. Lock the offer row and check its status
SELECT dispatch_session_id,
    job_id,
    job_type,
    offer_status INTO v_session_id,
    v_job_id,
    v_job_type,
    v_offer_status
FROM job_dispatch_offers
WHERE id = p_offer_id
    AND seller_id = p_seller_id FOR
UPDATE;
IF v_offer_status IS NULL THEN RAISE EXCEPTION 'Offer not found';
END IF;
IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN RAISE EXCEPTION 'Offer is no longer available (status: %)',
v_offer_status;
END IF;
-- 2. Lock the session row to prevent race conditions
SELECT dispatch_status INTO v_session_status
FROM job_dispatch_sessions
WHERE id = v_session_id FOR
UPDATE;
IF v_session_status = 'assignment_confirmed' THEN -- Another seller already accepted this job
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE id = p_offer_id;
RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- 3. We are the winner! Update the session
UPDATE job_dispatch_sessions
SET dispatch_status = 'assignment_confirmed',
    accepted_seller_id = p_seller_id,
    ended_at = now(),
    updated_at = now()
WHERE id = v_session_id;
-- 4. Update the winning offer
UPDATE job_dispatch_offers
SET offer_status = 'accepted',
    responded_at = now(),
    response_type = 'accept',
    updated_at = now()
WHERE id = p_offer_id;
-- 5. Auto-close all other offers for this session
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE dispatch_session_id = v_session_id
    AND id != p_offer_id
    AND offer_status IN ('sent', 'delivered', 'seen');
-- Return job info so app code can update the job record
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
-- Function to create a dispatch session and insert offers for given seller IDs
-- Seller ranking/filtering is done in app code; this just records the dispatch
CREATE OR REPLACE FUNCTION start_job_dispatch(
        p_job_id uuid,
        p_job_type text,
        p_seller_ids uuid [],
        p_wave_size int DEFAULT 3
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_seller_id uuid;
v_rank int := 0;
v_eligible_count int;
BEGIN -- 1. Create Dispatch Session
INSERT INTO job_dispatch_sessions (
        job_id,
        job_type,
        dispatch_status,
        current_wave_number
    )
VALUES (p_job_id, p_job_type, 'dispatching_wave_1', 1)
RETURNING id INTO v_session_id;
-- 2. Insert offers for each seller (up to wave_size)
FOREACH v_seller_id IN ARRAY p_seller_ids LOOP v_rank := v_rank + 1;
EXIT
WHEN v_rank > p_wave_size;
INSERT INTO job_dispatch_offers (
        dispatch_session_id,
        job_id,
        job_type,
        seller_id,
        wave_number,
        rank_position_at_send,
        offer_status,
        expires_at
    )
VALUES (
        v_session_id,
        p_job_id,
        p_job_type,
        v_seller_id,
        1,
        v_rank,
        'sent',
        now() + interval '3 minutes'
    );
END LOOP;
-- 3. Update eligible count
SELECT count(*) INTO v_eligible_count
FROM job_dispatch_offers
WHERE dispatch_session_id = v_session_id;
UPDATE job_dispatch_sessions
SET eligible_count_initial = v_eligible_count
WHERE id = v_session_id;
IF v_eligible_count = 0 THEN
UPDATE job_dispatch_sessions
SET dispatch_status = 'no_seller_found',
    ended_at = now()
WHERE id = v_session_id;
END IF;
RETURN v_session_id;
END;
$$;
-- 3. Insert Initial Bootstrapping Data for Pricing Bands
INSERT INTO category_pricing_bands (
        category_id,
        display_mode,
        min_amount,
        max_amount,
        starts_from_amount,
        uncertainty_level
    )
VALUES ('Plumbing', 'range', 100, 300, 100, 'medium'),
    ('Electrical', 'range', 150, 400, 150, 'medium'),
    (
        'Cleaning',
        'starts_from',
        null,
        null,
        150,
        'low'
    ),
    (
        'AC Maintenance',
        'starts_from',
        null,
        null,
        120,
        'low'
    );
-- Seed Phase 0 Fee Policy
INSERT INTO fee_policy_versions (id, fee_mode, is_active, notes)
VALUES (
        'v1_free_intro',
        'free_intro',
        true,
        'Introductory period, no actual fees charged'
    );