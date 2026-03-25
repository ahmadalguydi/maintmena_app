-- Fix RLS policies to allow viewing discoverable seller profiles
-- This allows the Explore page and seller profile views to work properly

-- Add policy to allow authenticated users to view discoverable seller profiles
CREATE POLICY "authenticated_users_view_discoverable_sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  discoverable = true 
  AND (user_type IN ('seller', 'both'))
);

-- The existing "Users can view their own profile" policy remains in place
-- This creates layered access: full access to own profile, read-only for discoverable sellers