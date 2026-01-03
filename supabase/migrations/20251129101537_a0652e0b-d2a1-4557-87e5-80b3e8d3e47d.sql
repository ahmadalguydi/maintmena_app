-- Drop the seller_public_profiles view to fix SECURITY DEFINER security issue
-- This view was not being used in the application code and bypasses RLS policies
DROP VIEW IF EXISTS public.seller_public_profiles;