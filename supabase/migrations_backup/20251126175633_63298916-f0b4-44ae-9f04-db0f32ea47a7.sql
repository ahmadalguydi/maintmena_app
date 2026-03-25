-- Fix RLS policies for profiles table to allow viewing discoverable seller profiles
DROP POLICY IF EXISTS "Buyers can view discoverable seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sellers can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view discoverable seller profiles" ON public.profiles;

-- Create comprehensive policy for viewing seller profiles
CREATE POLICY "Anyone can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  (user_type IN ('seller', 'both')) 
  AND (discoverable = true OR discoverable IS NULL)
);