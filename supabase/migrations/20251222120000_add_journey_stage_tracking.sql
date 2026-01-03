-- Add stage tracking columns to track what stage each user has last seen
-- This enables the "dopamine timeline" feature that shows progress animations
-- only when users reach NEW stages they haven't seen before

-- Track buyer and seller progress visibility for booking flows
ALTER TABLE booking_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Track buyer and seller progress visibility for request/quote flows
ALTER TABLE maintenance_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN booking_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN booking_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';
