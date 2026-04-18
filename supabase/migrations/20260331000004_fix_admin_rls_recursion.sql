-- Fix infinite recursion caused by user_roles policy referencing itself.
--
-- Problem: "Admins can read all roles" used EXISTS (SELECT FROM user_roles)
-- inside a policy ON user_roles → recursive loop.
--
-- Solution:
--   1. Drop the recursive policy.
--   2. Create a SECURITY DEFINER function that bypasses RLS when checking
--      admin status (safe: it only reads, takes no parameters, non-injectable).
--   3. Recreate all admin policies to use the function instead of inline EXISTS.

-- ── 1. Drop the recursive policy ────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;

-- ── 2. Drop existing admin policies that used the inline EXISTS subquery ────
DROP POLICY IF EXISTS "Admins can view all requests"   ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- ── 3. Create a SECURITY DEFINER helper — bypasses RLS on user_roles ────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ── 4. Recreate admin policies using the safe helper ────────────────────────

CREATE POLICY "Admins can view all requests"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all requests"
  ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());
