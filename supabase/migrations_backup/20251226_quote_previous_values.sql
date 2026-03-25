-- Add columns to store previous quote values before revision
-- This allows showing the difference when seller updates the quote

ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS previous_duration TEXT,
ADD COLUMN IF NOT EXISTS previous_proposal TEXT;
