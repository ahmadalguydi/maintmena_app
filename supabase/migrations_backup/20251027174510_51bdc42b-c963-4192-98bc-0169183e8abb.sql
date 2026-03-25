-- Phase 1: Fix RLS Policy for Contract Creation
-- Drop the existing restrictive policy that only allows buyers
DROP POLICY IF EXISTS "Buyers can create contracts" ON contracts;

-- Create a new policy that allows both buyers and sellers to create contracts
CREATE POLICY "Both parties can create contracts" 
ON contracts 
FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);