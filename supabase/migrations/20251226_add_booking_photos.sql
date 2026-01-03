-- Add photos column to booking_requests if it doesn't exist
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;
