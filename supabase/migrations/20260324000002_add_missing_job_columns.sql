-- Add all missing columns required by the job flow implementation
-- Run this in the Supabase SQL editor / dashboard

ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS seller_marked_complete BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_marked_complete  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buyer_price_approved   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS job_completion_code    TEXT,
  ADD COLUMN IF NOT EXISTS final_amount           NUMERIC,
  ADD COLUMN IF NOT EXISTS seller_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buyer_completion_date  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_photos      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS seller_on_way_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS work_started_at        TIMESTAMPTZ;

-- Ensure assigned_seller_id exists (should already be there, but guard it)
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_seller_id UUID REFERENCES profiles(id);

-- Back-fill: any row already in 'completed' status that was closed by the
-- old flow should have seller_marked_complete = true so the UI can display
-- it correctly until the buyer reviews it.
UPDATE maintenance_requests
SET seller_marked_complete = TRUE
WHERE status = 'completed'
  AND seller_marked_complete IS DISTINCT FROM TRUE;

-- Index to speed up polling queries used by BuyerHome / SellerJobDetail
CREATE INDEX IF NOT EXISTS idx_mreq_buyer_status
  ON maintenance_requests (buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_mreq_seller_status
  ON maintenance_requests (assigned_seller_id, status);
