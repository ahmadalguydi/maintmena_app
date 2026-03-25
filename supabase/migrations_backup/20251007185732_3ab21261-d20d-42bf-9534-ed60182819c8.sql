-- Step 1: add new enum value (must be committed alone)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer_individual';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;