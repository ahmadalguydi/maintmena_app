-- Add geolocation columns to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS latitude float,
    ADD COLUMN IF NOT EXISTS longitude float;
-- Index for geospatial queries (optional but good for future)
CREATE INDEX IF NOT EXISTS maintenance_requests_location_idx ON public.maintenance_requests (latitude, longitude);