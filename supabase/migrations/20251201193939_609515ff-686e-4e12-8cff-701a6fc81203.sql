-- Add RLS policy to allow assigned sellers to update their jobs
CREATE POLICY "Assigned sellers can update job status"
ON maintenance_requests
FOR UPDATE
USING (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
)
WITH CHECK (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
);