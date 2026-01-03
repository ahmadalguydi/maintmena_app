-- DIAGNOSTIC: Find and fix ALL triggers on maintenance_requests that reference seller_id
-- The error is: 'record "new" has no field "seller_id"'

-- Step 1: List all triggers on maintenance_requests (run this first to see what exists)
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'maintenance_requests';

-- Step 2: Drop ALL potential problematic triggers on maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
DROP TRIGGER IF EXISTS activate_request_warranty ON maintenance_requests;
DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_update_seller_stats ON maintenance_requests;
DROP TRIGGER IF EXISTS update_seller_stats_trigger ON maintenance_requests;
DROP TRIGGER IF EXISTS update_completed_projects_trigger ON maintenance_requests;

-- Also drop triggers on booking_requests for consistency  
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;

-- Step 3: Drop ALL functions that might reference seller_id incorrectly
DROP FUNCTION IF EXISTS increment_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS update_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS increment_completed_projects() CASCADE;

-- Step 4: Recreate the function with CORRECT column references
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
DECLARE
  seller_id_val uuid;
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- Determine the seller ID based on table name
    IF TG_TABLE_NAME = 'maintenance_requests' THEN
      seller_id_val := NEW.assigned_seller_id;
    ELSIF TG_TABLE_NAME = 'booking_requests' THEN
      seller_id_val := NEW.seller_id;
    ELSE
      seller_id_val := NULL;
    END IF;
    
    -- Update seller's completed projects count
    IF seller_id_val IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = seller_id_val;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Recreate triggers
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Step 6: Fix the activate_warranty_on_completion function if it exists
DROP FUNCTION IF EXISTS activate_warranty_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION activate_warranty_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_marked_complete = true AND NEW.seller_marked_complete = true 
     AND OLD.buyer_marked_complete IS DISTINCT FROM NEW.buyer_marked_complete THEN
    NEW.warranty_activated_at := now();
    NEW.warranty_expires_at := now() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate warranty triggers
CREATE TRIGGER activate_request_warranty
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

CREATE TRIGGER activate_booking_warranty
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

-- Step 7: Add RLS policies for buyer completion updates
DROP POLICY IF EXISTS "Buyers can mark requests complete" ON maintenance_requests;
DROP POLICY IF EXISTS "Buyers can mark bookings complete" ON booking_requests;

CREATE POLICY "Buyers can mark requests complete"
ON maintenance_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can mark bookings complete"
ON booking_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());
