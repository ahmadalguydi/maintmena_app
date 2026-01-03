-- Only configure subscriptions / realtime if the table actually exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  ) THEN
    -- Ensure subscriptions table emits full rows for realtime and is added to publication
    ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

    -- Backfill missing subscriptions with 14-day trial on professional
    INSERT INTO public.subscriptions (user_id, tier, status, trial_ends_at)
    SELECT u.id, 'professional', 'active', now() + interval '14 days'
    FROM auth.users u
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE s.user_id IS NULL;
  END IF;
END
$$;

-- Create trigger to populate profiles, roles and subscriptions for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Backfill missing profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill missing user roles with default 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;

