-- ============================================================
-- Migration: Backfill Missing Profile Rows
--
-- The handle_new_user trigger creates a profile row on signup,
-- but if a user was created before the trigger existed, or if
-- the trigger failed, they will have no profile row and every
-- Supabase query using .single() will return 406.
--
-- This migration inserts a minimal profile row for every auth
-- user that doesn't already have one.
-- ============================================================
INSERT INTO public.profiles (id, email, created_at, updated_at)
SELECT au.id,
    au.email,
    au.created_at,
    now()
FROM auth.users au
WHERE NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = au.id
    ) ON CONFLICT (id) DO NOTHING;
-- Also re-ensure the trigger exists for future signups
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE user_role public.app_role;
buyer_account_type text;
BEGIN user_role := (NEW.raw_user_meta_data->>'user_type')::public.app_role;
buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';
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
    ) ON CONFLICT (id) DO
UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name,
    buyer_type = EXCLUDED.buyer_type;
-- Default role
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
IF user_role IS NOT NULL THEN
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, user_role) ON CONFLICT (user_id, role) DO NOTHING;
IF user_role = 'buyer'
AND buyer_account_type = 'individual' THEN
INSERT INTO public.user_roles (user_id, role)
VALUES (NEW.id, 'buyer_individual') ON CONFLICT (user_id, role) DO NOTHING;
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Re-attach the trigger in case it was lost
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();