-- ================================================
-- PRE-PUBLICATION SECURITY & PERFORMANCE FIXES
-- ================================================

-- 1. Fix Subscription RLS - Prevent Self-Upgrade


-- 2. Add Performance Indexes
-- Index for maintenance_requests queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id 
ON maintenance_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status 
ON maintenance_requests(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_city 
ON maintenance_requests(city);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category 
ON maintenance_requests(category);

-- Index for quote_submissions queries
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id 
ON quote_submissions(seller_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id 
ON quote_submissions(request_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_status 
ON quote_submissions(status);

-- Index for booking_requests queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_id 
ON booking_requests(seller_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_buyer_id 
ON booking_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status 
ON booking_requests(status);

-- Index for messages queries
CREATE INDEX IF NOT EXISTS idx_messages_quote_id 
ON messages(quote_id);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id 
ON messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

-- Index for contracts queries
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_id 
ON contracts(buyer_id);

CREATE INDEX IF NOT EXISTS idx_contracts_seller_id 
ON contracts(seller_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status 
ON contracts(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_status 
ON maintenance_requests(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_status 
ON quote_submissions(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_status 
ON booking_requests(seller_id, status);