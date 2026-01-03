-- Add missing payment_method column
ALTER TABLE public.maintenance_requests 
ADD COLUMN payment_method text;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Buyers can manage their own requests" ON public.maintenance_requests;

-- Create policy for INSERT
CREATE POLICY "Buyers can create their own requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for SELECT
CREATE POLICY "Buyers can view their own requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- Create policy for UPDATE
CREATE POLICY "Buyers can update their own requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for DELETE
CREATE POLICY "Buyers can delete their own requests"
ON public.maintenance_requests
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);