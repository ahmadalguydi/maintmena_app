-- Migration: Allow buyers to delete contracts in pending_seller status
-- This enables the "Withdraw Signature" feature

-- Drop existing delete policy if any
DROP POLICY IF EXISTS "Buyers can delete pending_seller contracts" ON contracts;

-- Allow buyers to delete their own contracts when status is pending_seller
CREATE POLICY "Buyers can delete pending_seller contracts"
ON contracts
FOR DELETE
TO authenticated
USING (
  buyer_id = auth.uid() 
  AND status = 'pending_seller'
);

-- Also allow deleting binding_terms for contracts being withdrawn
DROP POLICY IF EXISTS "Users can delete binding_terms for their contracts" ON binding_terms;

CREATE POLICY "Users can delete binding_terms for their contracts"
ON binding_terms
FOR DELETE
TO authenticated
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE buyer_id = auth.uid() 
    OR seller_id = auth.uid()
  )
);

-- Allow users to insert notifications for other parties in their contracts
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;

CREATE POLICY "Users can notify other parties in contracts"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can insert notifications for sellers in contracts where user is the buyer
  user_id IN (
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
  )
);
