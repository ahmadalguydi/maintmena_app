-- Add revision request columns to quote_submissions table
-- These columns support the simplified "Ask for Revision" flow

ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;

-- Add 'revision_requested' to the valid status values
-- First, check if the status column is using an enum type
-- If using text, this comment documents the valid values:
-- Valid statuses: 'pending', 'revision_requested', 'accepted', 'rejected'

COMMENT ON COLUMN quote_submissions.revision_message IS 'Message from buyer explaining what changes they want to the quote';
COMMENT ON COLUMN quote_submissions.revision_requested_at IS 'Timestamp when buyer requested a revision';
