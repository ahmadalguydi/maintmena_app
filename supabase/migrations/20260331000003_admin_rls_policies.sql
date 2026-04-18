-- Admin RLS policies
-- Allows users with role = 'admin' in user_roles to read and update
-- all maintenance_requests (needed for admin dashboard screens).

-- Helper: reusable check (inlined in each policy to avoid function overhead)
-- EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')

-- maintenance_requests: admins can view all
CREATE POLICY "Admins can view all requests"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- maintenance_requests: admins can update all (resolve disputes, cancel jobs, etc.)
CREATE POLICY "Admins can update all requests"
  ON public.maintenance_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- profiles: admins can update any profile (suspend, verify sellers, etc.)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- user_roles: admins can read all roles (needed for admin user management)
CREATE POLICY "Admins can read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );
