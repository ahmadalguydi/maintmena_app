-- Migration: Add seller online status tracking fields
-- Required for the seller home state-machine (online toggle and time tracking)
-- Add is_online field to track seller availability
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
-- Add went_online_at to track when seller went online (for time tracking)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMPTZ;
-- Add service_radius to track seller's coverage area (in km)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 5;
-- Create index for finding online sellers efficiently  
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles (is_online)
WHERE is_online = true;
-- Add comment for documentation
COMMENT ON COLUMN profiles.is_online IS 'Whether the seller is currently active and accepting job opportunities';
COMMENT ON COLUMN profiles.went_online_at IS 'Timestamp when the seller last went online, used for calculating time online';
COMMENT ON COLUMN profiles.service_radius IS 'Service radius in kilometers for opportunity matching';