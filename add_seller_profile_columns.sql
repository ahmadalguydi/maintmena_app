-- ============================================================
-- ADD MISSING SELLER PROFILE COLUMNS
-- Run this in the Supabase Dashboard SQL Editor
-- ============================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_city TEXT,
    ADD COLUMN IF NOT EXISTS location_lat FLOAT,
    ADD COLUMN IF NOT EXISTS location_lng FLOAT,
    ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS service_cities TEXT [],
    ADD COLUMN IF NOT EXISTS service_categories TEXT [],
    ADD COLUMN IF NOT EXISTS services_pricing JSONB,
    ADD COLUMN IF NOT EXISTS typical_price_min NUMERIC,
    ADD COLUMN IF NOT EXISTS typical_price_max NUMERIC,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS website_url TEXT,
    ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
    ADD COLUMN IF NOT EXISTS company_description TEXT,
    ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
    ADD COLUMN IF NOT EXISTS crew_size_range TEXT,
    ADD COLUMN IF NOT EXISTS company_address TEXT,
    ADD COLUMN IF NOT EXISTS cr_number TEXT,
    ADD COLUMN IF NOT EXISTS vat_number TEXT;