-- Add signature_data column to profiles table for electronic signatures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.signature_data IS 'Electronic signature data: {type: "drawn"|"typed"|"uploaded", data: base64_string, created_at: timestamp, full_name: string}';

-- Create index for faster signature lookups
CREATE INDEX IF NOT EXISTS idx_profiles_signature_data ON public.profiles USING GIN (signature_data) WHERE signature_data IS NOT NULL;