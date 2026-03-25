-- Add currency preference to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'SAR'));