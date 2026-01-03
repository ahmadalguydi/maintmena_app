-- Add RLS policy for sellers to update their own quotes
-- This allows sellers to update quote_submissions where they are the seller

-- First, ensure RLS is enabled on the table
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Sellers can update their own quotes" ON quote_submissions;

-- Create update policy for sellers
CREATE POLICY "Sellers can update their own quotes" ON quote_submissions
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Also add select policy for sellers if not exists
DROP POLICY IF EXISTS "Sellers can view their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can view their own quotes" ON quote_submissions
FOR SELECT
USING (seller_id = auth.uid());

-- Buyers should also be able to view quotes for their requests
DROP POLICY IF EXISTS "Buyers can view quotes for their requests" ON quote_submissions;
CREATE POLICY "Buyers can view quotes for their requests" ON quote_submissions
FOR SELECT
USING (
  request_id IN (
    SELECT id FROM maintenance_requests WHERE buyer_id = auth.uid()
  )
);

-- Add DELETE policy for sellers to delete their own quotes
DROP POLICY IF EXISTS "Sellers can delete their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can delete their own quotes" ON quote_submissions
FOR DELETE
USING (seller_id = auth.uid());
