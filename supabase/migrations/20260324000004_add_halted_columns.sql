-- ============================================================
-- Add halted job columns to maintenance_requests
-- These are used by IssueRaiserSheet / JobTrackingCard when
-- a buyer or seller raises a dispute during a job.
-- ============================================================

ALTER TABLE public.maintenance_requests
    ADD COLUMN IF NOT EXISTS halted          boolean          NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS halted_at       timestamptz,
    ADD COLUMN IF NOT EXISTS halted_reason   text;

-- Index for quickly finding halted jobs (admin/support view)
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_halted
    ON public.maintenance_requests (halted)
    WHERE halted = true;

COMMENT ON COLUMN public.maintenance_requests.halted IS
    'Set to true when a buyer or seller raises a dispute mid-job';
COMMENT ON COLUMN public.maintenance_requests.halted_at IS
    'Timestamp when the job was halted';
COMMENT ON COLUMN public.maintenance_requests.halted_reason IS
    'Reason provided for halting the job';
