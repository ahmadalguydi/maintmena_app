-- ============================================================
-- Migration: Add assigned_seller_id to maintenance_requests
-- This column tracks which seller has accepted the job.
-- ============================================================
-- Add the column (nullable, since not all requests have a seller yet)
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES auth.users(id);
-- Index for fast seller lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_seller ON public.maintenance_requests(assigned_seller_id)
WHERE assigned_seller_id IS NOT NULL;
-- Also add latitude/longitude if they don't exist yet (safe idempotent)
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS longitude double precision;
-- Allow sellers to view jobs assigned to them
CREATE POLICY "Sellers can view assigned jobs" ON public.maintenance_requests FOR
SELECT TO authenticated USING (assigned_seller_id = auth.uid());