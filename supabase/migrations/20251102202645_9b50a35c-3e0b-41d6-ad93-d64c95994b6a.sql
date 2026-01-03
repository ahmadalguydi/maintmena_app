-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
CREATE POLICY "Users can view own verification tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage all tokens"
  ON public.email_verification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_email_verification_tokens_updated_at
  BEFORE UPDATE ON public.email_verification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user function WITHOUT subscription logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role app_role;
  buyer_account_type text;
BEGIN
  -- Get user type and buyer type from metadata
  user_role := (NEW.raw_user_meta_data->>'user_type')::app_role;
  buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';

  -- Create or update profile with data from metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      user_type    = EXCLUDED.user_type,
      phone        = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      buyer_type   = EXCLUDED.buyer_type;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assign the main user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If buyer with individual type, also add buyer_individual role
    IF user_role = 'buyer' AND buyer_account_type = 'individual' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'buyer_individual')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
