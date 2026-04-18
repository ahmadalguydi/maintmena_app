-- Add reschedule request columns to maintenance_requests
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS reschedule_requested_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_new_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_new_time_slot TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_status TEXT CHECK (reschedule_status IN ('pending', 'approved', 'rejected'));

-- Index for quick lookup of pending reschedule requests
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_reschedule_pending
  ON maintenance_requests (reschedule_status, buyer_id, assigned_seller_id)
  WHERE reschedule_status = 'pending';

-- Drop policy first if it exists, then create
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can request reschedule on their jobs" ON maintenance_requests;
END $$;

CREATE POLICY "Users can request reschedule on their jobs"
  ON maintenance_requests
  FOR UPDATE
  USING (
    auth.uid() = buyer_id OR auth.uid() = assigned_seller_id
  )
  WITH CHECK (
    auth.uid() = buyer_id OR auth.uid() = assigned_seller_id
  );

-- Function to approve a reschedule request
CREATE OR REPLACE FUNCTION approve_reschedule(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM maintenance_requests
  WHERE id = p_request_id
    AND reschedule_status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Ensure the approver is the OTHER party (not the requester)
  IF v_request.reschedule_requested_by = auth.uid() THEN
    RETURN FALSE;
  END IF;

  -- Ensure approver is buyer or seller of this request
  IF auth.uid() != v_request.buyer_id AND auth.uid() != v_request.assigned_seller_id THEN
    RETURN FALSE;
  END IF;

  -- Apply the reschedule
  UPDATE maintenance_requests
  SET
    preferred_start_date = reschedule_new_date,
    scheduled_for = reschedule_new_date,
    preferred_time_slot = reschedule_new_time_slot,
    -- Reset status back to accepted (remove in_progress/en_route state)
    status = CASE
      WHEN status IN ('en_route', 'in_progress', 'arrived') THEN 'accepted'
      ELSE status
    END,
    -- Clear reschedule fields
    reschedule_status = 'approved',
    reschedule_requested_by = NULL,
    reschedule_requested_at = NULL,
    reschedule_new_date = NULL,
    reschedule_new_time_slot = NULL
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Function to reject a reschedule request
CREATE OR REPLACE FUNCTION reject_reschedule(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM maintenance_requests
  WHERE id = p_request_id
    AND reschedule_status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Ensure the rejector is the OTHER party
  IF v_request.reschedule_requested_by = auth.uid() THEN
    RETURN FALSE;
  END IF;

  IF auth.uid() != v_request.buyer_id AND auth.uid() != v_request.assigned_seller_id THEN
    RETURN FALSE;
  END IF;

  UPDATE maintenance_requests
  SET
    reschedule_status = 'rejected',
    reschedule_requested_by = NULL,
    reschedule_requested_at = NULL,
    reschedule_new_date = NULL,
    reschedule_new_time_slot = NULL
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;
