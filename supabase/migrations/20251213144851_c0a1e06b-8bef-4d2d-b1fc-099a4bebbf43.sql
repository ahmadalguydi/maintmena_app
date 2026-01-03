-- RLS policy to allow buyers to mark their in_progress requests as complete
CREATE POLICY "Buyers can mark their in_progress requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (
  auth.uid() = buyer_id 
  AND status = 'in_progress'
  AND assigned_seller_id IS NOT NULL
)
WITH CHECK (
  auth.uid() = buyer_id
);