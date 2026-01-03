-- Step 1: Add new subscription tier enum values
-- Adding: starter, comfort, priority, elite

-- Step 1: Add new subscription tier enum values (only if type exists)
-- Adding: starter, comfort, priority, elite

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'comfort';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'priority';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'elite';
  END IF;
END
$$;
