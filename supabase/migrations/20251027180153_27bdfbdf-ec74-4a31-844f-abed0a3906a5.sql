-- 1) Fix notifications.notification_type check to include contract events
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notifications_type_check;
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (
    notification_type = ANY (ARRAY[
      'new_brief','tender_deadline','new_signal','system',
      'quote_received','new_message',
      'booking_request','booking_received','booking_accepted','booking_declined','booking_updated','booking_cancelled',
      'counter_proposal_received','counter_proposal_accepted','buyer_counter_received','booking_message','new_chat',
      'contract_created','contract_updated'
    ]::text[])
  );

-- 2) Expand booking_requests.status allowed values
DO $$ BEGIN
  IF to_regclass('public.booking_requests') IS NOT NULL THEN
    ALTER TABLE public.booking_requests
      DROP CONSTRAINT IF EXISTS booking_requests_status_check;
    ALTER TABLE public.booking_requests
      ADD CONSTRAINT booking_requests_status_check
      CHECK (
        status = ANY (ARRAY[
          'pending','accepted','declined','cancelled','completed',
          'counter_proposed','buyer_countered',
          'contract_pending','contract_accepted'
        ]::text[])
      );
  END IF;
END $$;

-- 3) Expand quote_submissions.status allowed values
ALTER TABLE public.quote_submissions
  DROP CONSTRAINT IF EXISTS quote_submissions_status_check;
ALTER TABLE public.quote_submissions
  ADD CONSTRAINT quote_submissions_status_check
  CHECK (
    status = ANY (ARRAY[
      'pending','submitted','shortlisted','negotiating','accepted','rejected','withdrawn',
      'contract_pending','contract_accepted'
    ]::text[])
  );

-- 4) Clean up duplicate booking triggers and re-create single ones
-- Drop potential duplicate triggers safely
DO $$ BEGIN
  IF to_regclass('public.booking_requests') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS on_booking_request_created ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS booking_calendar_sync ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS notify_booking_status_change_trigger ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS notify_seller_booking_request_trigger ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests';
    EXECUTE 'DROP TRIGGER IF EXISTS on_booking_calendar_create ON public.booking_requests';

    -- Recreate unified triggers
    EXECUTE 'CREATE TRIGGER on_booking_status_change
      AFTER INSERT OR UPDATE ON public.booking_requests
      FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change()';

    EXECUTE 'CREATE TRIGGER on_booking_calendar_create
      AFTER INSERT OR UPDATE ON public.booking_requests
      FOR EACH ROW EXECUTE FUNCTION public.create_booking_calendar_event()';
  END IF;
END $$;

-- 5) Ensure contract notification triggers exist
DO $$ BEGIN
  IF to_regclass('public.contracts') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts';
    EXECUTE 'DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts';

    EXECUTE 'CREATE TRIGGER on_contract_created_notify
      AFTER INSERT ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.notify_contract_created()';

    EXECUTE 'CREATE TRIGGER on_contract_version_updated_notify
      AFTER UPDATE ON public.contracts
      FOR EACH ROW EXECUTE FUNCTION public.notify_contract_version_updated()';
  END IF;
END $$;