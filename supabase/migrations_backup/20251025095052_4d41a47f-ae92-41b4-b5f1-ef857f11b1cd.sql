-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view published briefs" ON public.briefs;

-- Create new policy allowing access to both published and archived briefs
CREATE POLICY "Users can view published and archived briefs" 
ON public.briefs 
FOR SELECT 
USING (status IN ('published', 'archived'));