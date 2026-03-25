-- Add version column to booking_requests for optimistic locking
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index on version for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_version ON booking_requests(id, version);

-- Create function to update booking with optimistic locking
CREATE OR REPLACE FUNCTION update_booking_with_lock(
  p_booking_id UUID,
  p_new_status TEXT,
  p_expected_version INTEGER,
  p_updates JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, current_version INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
  v_current_version INTEGER;
BEGIN
  -- Attempt to update with version check
  UPDATE booking_requests
  SET 
    status = p_new_status,
    version = version + 1,
    updated_at = now(),
    -- Apply additional updates from JSONB if provided
    seller_response = COALESCE((p_updates->>'seller_response')::TEXT, seller_response),
    seller_counter_proposal = COALESCE((p_updates->>'seller_counter_proposal')::JSONB, seller_counter_proposal),
    buyer_counter_proposal = COALESCE((p_updates->>'buyer_counter_proposal')::JSONB, buyer_counter_proposal),
    responded_at = CASE WHEN p_new_status IN ('accepted', 'declined', 'counter_proposed') THEN now() ELSE responded_at END
  WHERE id = p_booking_id 
    AND version = p_expected_version
  RETURNING version INTO v_current_version;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RETURN QUERY SELECT true, v_current_version;
  ELSE
    -- Get current version to return to caller
    SELECT version INTO v_current_version FROM booking_requests WHERE id = p_booking_id;
    RETURN QUERY SELECT false, COALESCE(v_current_version, p_expected_version);
  END IF;
END;
$$;