-- Add RLS policy to allow sellers to view buyer profiles in business contexts
-- This allows sellers to see buyer info for requests they're viewing/quoting on

CREATE POLICY "Sellers can view buyer profiles for public requests"
ON public.profiles
FOR SELECT
USING (
  -- Allow viewing profiles of buyers who have public maintenance requests
  EXISTS (
    SELECT 1 
    FROM maintenance_requests mr 
    WHERE mr.buyer_id = profiles.id 
    AND mr.visibility = 'public'
    AND mr.status = 'open'
  )
);

-- Add policy to allow buyers to view seller profiles that are discoverable
CREATE POLICY "Buyers can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'seller' 
  AND (discoverable = true OR discoverable IS NULL)
);