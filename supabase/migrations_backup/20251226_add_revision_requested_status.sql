-- Add 'revision_requested' to quote_submissions status check constraint
-- This allows buyers to request revisions to seller quotes

-- Drop the existing constraint
ALTER TABLE quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

-- Add the updated constraint with revision_requested
ALTER TABLE quote_submissions ADD CONSTRAINT quote_submissions_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'revision_requested', 'expired', 'withdrawn'));

-- Also add the revision_message and revision_requested_at columns if they don't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;
