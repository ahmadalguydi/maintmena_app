-- 00000000000000_initial_schema.sql
-- Minimal Setup: Extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "public";
-- Minimal Setup: Enums
CREATE TYPE "public"."app_role" AS ENUM (
  'admin',
  'member',
  'user',
  'buyer',
  'seller',
  'buyer_individual'
);
-- ==========================================
-- 1. PROFILES & ROLES
-- ==========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  user_type TEXT,
  buyer_type TEXT,
  avatar_url TEXT,
  trust_score INTEGER DEFAULT 100,
  reliability_rate NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);
-- ==========================================
-- 2. DEMANDS (The Single Job Object replacing bookings & requests)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'matching',
      'assigned',
      'arrived',
      'in_progress',
      'completed',
      'cancelled'
    )
  ),
  category_id TEXT,
  subcategory_id TEXT,
  title TEXT,
  description TEXT,
  location_lat FLOAT,
  location_lng FLOAT,
  location_address TEXT,
  scheduled_time TIMESTAMPTZ,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'flexible')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- ==========================================
-- 3. PRICING & MONETIZATION
-- ==========================================
CREATE TABLE IF NOT EXISTS public.fee_policy_versions (
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
CREATE TABLE IF NOT EXISTS public.category_pricing_bands (
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
CREATE TABLE IF NOT EXISTS public.job_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL UNIQUE,
  seller_id uuid REFERENCES auth.users(id),
  seller_estimate_accept_amount numeric,
  seller_final_claim_amount numeric,
  buyer_confirmed_paid_amount numeric,
  fee_model_version text REFERENCES public.fee_policy_versions(id),
  fee_mode text,
  fee_trigger text,
  actual_fee_amount numeric DEFAULT 0,
  simulated_fee_amount numeric,
  provider_net_amount numeric,
  est_to_buyer_gap_amount numeric,
  est_to_buyer_gap_pct numeric,
  seller_to_buyer_gap_amount numeric,
  seller_to_buyer_gap_pct numeric,
  pricing_outcome_status text,
  calculated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- ==========================================
-- 4. MATCHING ENGINE & DISPATCH
-- ==========================================
CREATE TABLE IF NOT EXISTS public.job_dispatch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  job_type text NOT NULL,
  -- normally 'demand' now
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
CREATE TABLE IF NOT EXISTS public.job_dispatch_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_session_id uuid REFERENCES public.job_dispatch_sessions(id) ON DELETE CASCADE,
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
-- ==========================================
-- 5. FUNCTIONS & TRIGGERS
-- ==========================================
-- Auto User Creation
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger" LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public' AS $$
DECLARE user_role public.app_role;
buyer_account_type text;
BEGIN -- Get user type and buyer type from metadata
user_role := (NEW.raw_user_meta_data->>'user_type')::public.app_role;
buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';
-- Create or update profile
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  ) ON CONFLICT (id) DO
UPDATE
SET email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  phone = EXCLUDED.phone,
  company_name = EXCLUDED.company_name,
  buyer_type = EXCLUDED.buyer_type;
-- Default role
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
IF user_role IS NOT NULL THEN
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, user_role) ON CONFLICT (user_id, role) DO NOTHING;
-- If buyer with individual type
IF user_role = 'buyer'
AND buyer_account_type = 'individual' THEN
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'buyer_individual') ON CONFLICT (user_id, role) DO NOTHING;
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Dispatch Acceptance Logic (Moved to manual execution to bypass CLI parser bug)
-- ==========================================
-- 6. SECURITY / RLS
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_pricing_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_dispatch_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR
SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can read own roles" ON public.user_roles FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can read demands" ON public.demands FOR
SELECT USING (true);
CREATE POLICY "Buyers can insert demands" ON public.demands FOR
INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own demands" ON public.demands FOR
UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Pricing bands are readable by everyone" ON public.category_pricing_bands FOR
SELECT USING (true);
CREATE POLICY "Sellers can view their own dispatch offers" ON public.job_dispatch_offers FOR
SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Sellers can update their own dispatch offers" ON public.job_dispatch_offers FOR
UPDATE TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Authenticated users can view dispatch sessions" ON public.job_dispatch_sessions FOR
SELECT TO authenticated USING (true);
-- ==========================================
-- 7. SEED INITIAL DATA
-- ==========================================
INSERT INTO public.category_pricing_bands (
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
INSERT INTO public.fee_policy_versions (id, fee_mode, is_active, notes)
VALUES (
    'v1_free_intro',
    'free_intro',
    true,
    'Introductory period, no actual fees charged'
  );