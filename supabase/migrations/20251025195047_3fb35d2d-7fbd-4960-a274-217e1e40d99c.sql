-- Migrate existing subscription data and define has_subscription_access
-- Only if the subscriptions table and subscription_tier type actually exist

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN

    -- Migrate existing subscription data
    UPDATE subscriptions
    SET tier = 'comfort'::subscription_tier
    WHERE tier = 'basic'::subscription_tier;

    UPDATE subscriptions
    SET tier = 'elite'::subscription_tier
    WHERE tier = 'enterprise'::subscription_tier;

    -- Replace has_subscription_access function (not drop)
    CREATE OR REPLACE FUNCTION has_subscription_access(_user_id uuid, _required_tier subscription_tier)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      user_tier subscription_tier;
      tier_hierarchy int;
      required_tier_hierarchy int;
    BEGIN
      SELECT tier INTO user_tier
      FROM subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
      LIMIT 1;

      IF user_tier IS NULL THEN
        user_tier := 'free';
      END IF;

      tier_hierarchy := CASE user_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      required_tier_hierarchy := CASE _required_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      RETURN tier_hierarchy >= required_tier_hierarchy;
    END;
    $fn$;

  END IF;
END
$do$;
