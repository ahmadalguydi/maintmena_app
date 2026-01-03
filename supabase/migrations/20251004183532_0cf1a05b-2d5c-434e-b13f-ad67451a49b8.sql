-- Step 1: Add new enum values in their own transaction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'buyer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'buyer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'seller'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'seller';
  END IF;
END $$;