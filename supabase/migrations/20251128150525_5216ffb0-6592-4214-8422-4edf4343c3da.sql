-- Update RLS policy to allow deletion of open and in_review requests
DROP POLICY IF EXISTS "Buyers can cancel their own requests" ON maintenance_requests;

CREATE POLICY "Buyers can delete their open or in-review requests"
ON maintenance_requests
FOR DELETE
USING (
  auth.uid() = buyer_id 
  AND status IN ('open', 'in_review')
);