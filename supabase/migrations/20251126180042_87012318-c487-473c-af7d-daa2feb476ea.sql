-- Drop the previous policy
DROP POLICY IF EXISTS "Anyone can view discoverable seller profiles" ON public.profiles;

-- Create a comprehensive policy that works for both authenticated and anonymous users
CREATE POLICY "Authenticated users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable IS NOT FALSE)
);

-- Also allow anonymous users to view discoverable sellers
CREATE POLICY "Anonymous users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO anon
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable = true)
);