-- Add translation columns to maintenance_requests
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
ADD COLUMN IF NOT EXISTS full_name_en TEXT,
ADD COLUMN IF NOT EXISTS company_name_ar TEXT,
ADD COLUMN IF NOT EXISTS company_name_en TEXT,
ADD COLUMN IF NOT EXISTS bio_ar TEXT,
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS company_description_ar TEXT,
ADD COLUMN IF NOT EXISTS company_description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to quote_submissions
ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS proposal_ar TEXT,
ADD COLUMN IF NOT EXISTS proposal_en TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_ar TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_original_language ON maintenance_requests(original_language);
CREATE INDEX IF NOT EXISTS idx_profiles_original_language ON profiles(original_language);