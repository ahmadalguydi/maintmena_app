-- Add buyer_price_approved column to track when buyer confirms the final price
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS buyer_price_approved BOOLEAN DEFAULT FALSE;
