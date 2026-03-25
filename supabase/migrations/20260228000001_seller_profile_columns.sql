-- ============================================================
-- Migration: Seller Profile Columns
-- Adds all columns needed by the seller flow:
--   online status, location/service areas, services catalog,
--   and extended profile fields (bio, company details, etc.)
-- ============================================================
ALTER TABLE public.profiles -- Online status (seller home state machine)
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMPTZ,
    -- Location & service area (used by matching engine)
ADD COLUMN IF NOT EXISTS location_city TEXT,
    ADD COLUMN IF NOT EXISTS location_lat FLOAT,
    ADD COLUMN IF NOT EXISTS location_lng FLOAT,
    ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS service_cities TEXT [],
    -- Services catalog (synced from ManageServices screen)
ADD COLUMN IF NOT EXISTS service_categories TEXT [],
    ADD COLUMN IF NOT EXISTS services_pricing JSONB,
    -- Typical price inferred from services (for display in matching results)
ADD COLUMN IF NOT EXISTS typical_price_min NUMERIC,
    ADD COLUMN IF NOT EXISTS typical_price_max NUMERIC,
    -- Profile detail fields
ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS website_url TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS reliability_rate NUMERIC DEFAULT 100,
    -- Account type (individual / company)
ADD COLUMN IF NOT EXISTS user_type TEXT,
    ADD COLUMN IF NOT EXISTS buyer_type TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS company_description TEXT,
    ADD COLUMN IF NOT EXISTS company_address TEXT,
    ADD COLUMN IF NOT EXISTS cr_number TEXT,
    ADD COLUMN IF NOT EXISTS vat_number TEXT,
    ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
    ADD COLUMN IF NOT EXISTS crew_size_range TEXT;
-- Index for matching engine lookups
CREATE INDEX IF NOT EXISTS idx_profiles_service_categories ON public.profiles USING GIN (service_categories);
CREATE INDEX IF NOT EXISTS idx_profiles_location_city ON public.profiles (location_city);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles (is_online);