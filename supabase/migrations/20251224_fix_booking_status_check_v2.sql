-- Update booking_requests status check constraint to include new statuses
DO $$ BEGIN
  IF to_regclass('public.booking_requests') IS NOT NULL THEN
    ALTER TABLE public.booking_requests
      DROP CONSTRAINT IF EXISTS booking_requests_status_check;
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_status_check
      CHECK (
        status = ANY (ARRAY[
          'pending',
          'accepted',
          'declined',
          'cancelled',
          'completed',
          'counter_proposed',
          'buyer_countered',
          'contract_pending',
          'contract_accepted',
          'seller_responded',
          'revision_requested'
        ]::text[])
      );
  END IF;
END $$;
