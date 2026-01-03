-- Add new columns to profiles table for services, cities, and user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services_pricing jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_cities text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'SAR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_date_format text DEFAULT 'gregorian';

COMMENT ON COLUMN profiles.services_pricing IS 'JSON array storing service pricing info: { category: string, price: number, duration: string, available: boolean }[]';
COMMENT ON COLUMN profiles.service_cities IS 'Array of city names the seller serves';
COMMENT ON COLUMN profiles.preferred_currency IS 'User preferred currency (SAR, USD, etc)';
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants email notifications';
COMMENT ON COLUMN profiles.preferred_date_format IS 'Date format preference: gregorian or hijri';