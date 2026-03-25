-- Add latitude / longitude columns to maintenance_requests
-- (these are sent by ServiceFlowScreen.tsx on job submission)
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;