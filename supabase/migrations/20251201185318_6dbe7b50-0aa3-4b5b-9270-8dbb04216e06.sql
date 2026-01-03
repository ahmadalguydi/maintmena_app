-- Phase 1: Fix corrupted data - update requests where contract is executed but request isn't
UPDATE maintenance_requests mr
SET 
  status = 'in_progress',
  assigned_seller_id = c.seller_id
FROM contracts c
WHERE c.request_id = mr.id
  AND c.status = 'executed'
  AND (mr.status != 'in_progress' OR mr.assigned_seller_id IS NULL);

-- Phase 2: Trigger to automatically activate jobs when contract is executed
CREATE OR REPLACE FUNCTION activate_job_on_contract_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- When contract becomes executed, update the associated request/booking
  IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
    IF NEW.request_id IS NOT NULL THEN
      UPDATE maintenance_requests
      SET status = 'in_progress',
          assigned_seller_id = NEW.seller_id,
          updated_at = now()
      WHERE id = NEW.request_id;
    END IF;
    
    IF NEW.booking_id IS NOT NULL THEN
      UPDATE booking_requests
      SET status = 'accepted',
          updated_at = now()
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_executed
  AFTER UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION activate_job_on_contract_execution();

-- Phase 3: Constraint to prevent invalid contract execution
CREATE OR REPLACE FUNCTION prevent_invalid_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent setting status to 'executed' without both signatures
  IF NEW.status = 'executed' AND (NEW.signed_at_buyer IS NULL OR NEW.signed_at_seller IS NULL) THEN
    RAISE EXCEPTION 'Cannot execute contract without both signatures';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_contract_execution
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invalid_execution();