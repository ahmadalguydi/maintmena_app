-- Allow buyers and sellers to update contract status to 'completed'
-- This is necessary for the contract progress tracker to show the correct completion state

-- Policy for updating contracts
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;

CREATE POLICY "Users can update their own contracts"
ON contracts
FOR UPDATE
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
)
WITH CHECK (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
);
