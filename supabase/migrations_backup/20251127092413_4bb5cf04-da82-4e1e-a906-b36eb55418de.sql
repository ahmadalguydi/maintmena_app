-- Add completion tracking fields to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add completion tracking fields to booking_requests
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_seller ON maintenance_requests(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_completion ON maintenance_requests(buyer_marked_complete, seller_marked_complete);
CREATE INDEX IF NOT EXISTS idx_booking_requests_completion ON booking_requests(buyer_marked_complete, seller_marked_complete);