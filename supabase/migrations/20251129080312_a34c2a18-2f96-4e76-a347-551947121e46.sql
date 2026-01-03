-- Add contract negotiation columns
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS proposed_edits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edit_notes TEXT;