-- Add RLS policy to allow sellers to view maintenance_requests for their executed contracts
-- This fixes the issue where sellers can't see active jobs because requests change status from 'open' to 'in_progress'

CREATE POLICY "Sellers can view requests for their executed contracts"
ON maintenance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.request_id = maintenance_requests.id
    AND contracts.seller_id = auth.uid()
    AND contracts.status = 'executed'
  )
);