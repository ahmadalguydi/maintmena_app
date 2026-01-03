-- PHASE 1: Fix booking_requests status constraint to include 'counter_proposed'
ALTER TABLE public.booking_requests 
DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests 
ADD CONSTRAINT booking_requests_status_check 
CHECK (status IN (
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'completed',
  'counter_proposed'
));

-- PHASE 1: Ensure all payment columns exist (idempotent)
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' 
  CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded'));

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS final_amount NUMERIC;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS invoice_id TEXT;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- PHASE 1: Update timestamp trigger to handle counter_proposed status
CREATE OR REPLACE FUNCTION public.update_booking_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined', 'counter_proposed') THEN
    NEW.responded_at = now();
  END IF;
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- PHASE 2: Create comprehensive booking status notification trigger
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When seller responds (status changed from pending)
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.buyer_id,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'booking_accepted'
        WHEN NEW.status = 'declined' THEN 'booking_declined'
        WHEN NEW.status = 'counter_proposed' THEN 'counter_proposal_received'
        ELSE 'booking_updated'
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Booking Accepted!'
        WHEN NEW.status = 'declined' THEN 'Booking Declined'
        WHEN NEW.status = 'counter_proposed' THEN 'Counter Proposal Received'
        ELSE 'Booking Updated'
      END,
      CASE 
        WHEN NEW.status = 'accepted' THEN 'Your booking request has been accepted'
        WHEN NEW.status = 'declined' THEN 'Your booking request has been declined'
        WHEN NEW.status = 'counter_proposed' THEN 'The seller sent you a counter proposal'
        ELSE 'Your booking request has been updated'
      END,
      NEW.id
    );
  END IF;
  
  -- When new booking is created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'booking_received',
      'New Booking Request',
      'You received a new booking request for ' || COALESCE(NEW.service_category, 'a service'),
      NEW.id
    );
  END IF;
  
  -- When buyer accepts counter proposal
  IF OLD.status = 'counter_proposed' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'counter_proposal_accepted',
      'Counter Proposal Accepted',
      'The buyer accepted your counter proposal',
      NEW.id
    );
  END IF;
  
  -- When booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'booking_cancelled',
      'Booking Cancelled',
      'A booking request has been cancelled',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests;
CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();

-- PHASE 3: Create calendar event trigger for accepted bookings
CREATE OR REPLACE FUNCTION public.create_booking_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create calendar event for buyer
    INSERT INTO public.calendar_events (
      user_id, 
      title, 
      description, 
      event_date, 
      end_date, 
      event_type, 
      related_content_type, 
      related_content_id,
      color,
      location
    ) VALUES (
      NEW.buyer_id,
      'Booking: ' || COALESCE(NEW.service_category, 'Service'),
      NEW.job_description,
      NEW.proposed_start_date,
      NEW.proposed_end_date,
      'booking',
      'booking_request',
      NEW.id,
      '#10b981',
      NEW.location_city
    );
    
    -- Create calendar event for seller
    INSERT INTO public.calendar_events (
      user_id, 
      title, 
      description, 
      event_date, 
      end_date, 
      event_type, 
      related_content_type, 
      related_content_id,
      color,
      location
    ) VALUES (
      NEW.seller_id,
      'Booking Job: ' || COALESCE(NEW.service_category, 'Service'),
      NEW.job_description,
      NEW.proposed_start_date,
      NEW.proposed_end_date,
      'booking',
      'booking_request',
      NEW.id,
      '#3b82f6',
      NEW.location_city
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_booking_calendar_create ON public.booking_requests;
CREATE TRIGGER on_booking_calendar_create
  AFTER INSERT OR UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_booking_calendar_event();

-- PHASE 5: Ensure booking message notification trigger exists
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER AS $$
DECLARE
  booking_record RECORD;
  recipient_id UUID;
BEGIN
  SELECT buyer_id, seller_id, service_category
  INTO booking_record
  FROM public.booking_requests
  WHERE id = NEW.booking_id;

  IF NEW.sender_id = booking_record.buyer_id THEN
    recipient_id := booking_record.seller_id;
  ELSE
    recipient_id := booking_record.buyer_id;
  END IF;

  IF recipient_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      recipient_id,
      'New Booking Message',
      'You have a new message about ' || COALESCE(booking_record.service_category, 'a booking'),
      'booking_message',
      NEW.booking_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_new_booking_message ON public.messages;
CREATE TRIGGER on_new_booking_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.booking_id IS NOT NULL)
  EXECUTE FUNCTION public.notify_new_booking_message();