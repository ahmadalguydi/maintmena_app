-- Add halted status support to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Add halted status support to booking_requests
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;