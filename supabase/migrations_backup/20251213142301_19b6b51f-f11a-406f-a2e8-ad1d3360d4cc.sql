-- Add RLS policy for buyers to mark their maintenance_requests as complete
CREATE POLICY "Buyers can mark their requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'in_progress')
WITH CHECK (auth.uid() = buyer_id AND status = 'in_progress');

-- Also add a policy for updating status to completed when buyer_marked_complete is true
CREATE POLICY "Buyers can complete their in_progress requests"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND assigned_seller_id IS NOT NULL)
WITH CHECK (auth.uid() = buyer_id);