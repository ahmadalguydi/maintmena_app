-- Phase 1: Critical RLS & Database Security (Fixed)

-- 1. Strengthen profiles RLS - only expose limited seller info publicly
CREATE POLICY "Public can view limited seller profiles"
ON profiles FOR SELECT
USING (
  user_type = 'seller' 
  AND discoverable = true
);

-- 2. Add transaction verification for reviews
CREATE POLICY "Reviews require completed transaction"
ON seller_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.buyer_id = auth.uid()
    AND contracts.seller_id = seller_reviews.seller_id
    AND contracts.status = 'executed'
  ) OR EXISTS (
    SELECT 1 FROM booking_requests
    WHERE booking_requests.buyer_id = auth.uid()
    AND booking_requests.seller_id = seller_reviews.seller_id
    AND booking_requests.status = 'completed'
    AND booking_requests.buyer_marked_complete = true
    AND booking_requests.seller_marked_complete = true
  )
);

-- 3. Prevent self-assignment of admin role
CREATE POLICY "Prevent self-assignment of admin role"
ON user_roles FOR INSERT
WITH CHECK (
  role != 'admin' OR 
  has_role(auth.uid(), 'admin')
);

-- 4. Add audit logging trigger for contracts (drop first if exists)
DROP TRIGGER IF EXISTS audit_contract_changes ON contracts;

CREATE OR REPLACE FUNCTION log_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    old_data, 
    new_data,
    ip_address
  ) VALUES (
    auth.uid(), 
    TG_OP, 
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD), 
    to_jsonb(NEW),
    inet_client_addr()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_contract_changes
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION log_contract_changes();

-- 5. Add content hash verification column
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS content_hash_verified boolean DEFAULT false;

-- 6. Add profile visibility controls
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'limited'));