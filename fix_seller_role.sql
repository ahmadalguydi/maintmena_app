DO $$
DECLARE v_user_id uuid;
BEGIN -- 1. Find the user ID for seller@test.com
SELECT id INTO v_user_id
FROM auth.users
WHERE email = 'seller@test.com';
-- 2. If the user exists, force them to be a seller
IF v_user_id IS NOT NULL THEN -- Clear out any existing incorrect roles
DELETE FROM public.user_roles
WHERE user_id = v_user_id;
-- Insert the correct seller role
INSERT INTO public.user_roles (user_id, role)
VALUES (v_user_id, 'seller');
-- Update their profile type for legacy compat
UPDATE public.profiles
SET user_type = 'seller'
WHERE id = v_user_id;
END IF;
END $$;