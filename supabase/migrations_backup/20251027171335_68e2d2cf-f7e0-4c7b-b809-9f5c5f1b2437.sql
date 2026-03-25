
-- Clean up orphaned data (Fix Plan Option A) - handling foreign keys
-- First, delete related messages for orphaned bookings and quotes
DELETE FROM messages 
WHERE booking_id IN (
  SELECT id FROM booking_requests 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

DELETE FROM messages 
WHERE quote_id IN (
  SELECT id FROM quote_submissions 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

-- Now delete orphaned quotes and bookings
DELETE FROM quote_submissions 
WHERE seller_id NOT IN (SELECT id FROM profiles);

DELETE FROM booking_requests 
WHERE seller_id NOT IN (SELECT id FROM profiles);

-- Add comments documenting new status options for contract integration
COMMENT ON COLUMN quote_submissions.status IS 'Status: pending, accepted, rejected, negotiating, contract_pending, contract_accepted';
COMMENT ON COLUMN booking_requests.status IS 'Status: pending, accepted, declined, counter_proposed, cancelled, buyer_countered, completed, contract_pending, contract_accepted';
