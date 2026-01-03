-- Phase 1: Add Missing Columns
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS requires_deposit BOOLEAN DEFAULT false;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS buyer_counter_proposal JSONB;

-- Phase 2: Update Status Constraint
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
  'counter_proposed',
  'buyer_countered'
));

-- Phase 3: Fix Duplicate Notification Triggers
DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests;

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only send notifications on specific state transitions to avoid duplicates
  
  -- New booking created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'booking_received',
      'New Booking Request',
      'You received a new booking request for ' || COALESCE(NEW.service_category, 'a service'),
      NEW.id
    );
    RETURN NEW;
  END IF;
  
  -- Status changed from pending to something else
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
    RETURN NEW;
  END IF;
  
  -- Buyer accepts counter proposal
  IF OLD.status = 'counter_proposed' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'counter_proposal_accepted',
      'Counter Proposal Accepted',
      'The buyer accepted your counter proposal',
      NEW.id
    );
    RETURN NEW;
  END IF;
  
  -- Buyer counters the seller's counter
  IF OLD.status = 'counter_proposed' AND NEW.status = 'buyer_countered' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'buyer_counter_received',
      'Buyer Sent Counter Proposal',
      'The buyer sent a counter proposal to your offer',
      NEW.id
    );
    RETURN NEW;
  END IF;
  
  -- Booking cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO public.notifications (user_id, notification_type, title, message, content_id)
    VALUES (
      NEW.seller_id,
      'booking_cancelled',
      'Booking Cancelled',
      'A booking request has been cancelled',
      NEW.id
    );
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_booking_status_change
  AFTER INSERT OR UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_booking_status_change();

-- Phase 4: Update Notification Types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text,
  'tender_deadline'::text,
  'new_signal'::text,
  'system'::text,
  'quote_received'::text,
  'new_message'::text,
  'booking_request'::text,
  'booking_received'::text,
  'booking_accepted'::text,
  'booking_declined'::text,
  'booking_updated'::text,
  'booking_cancelled'::text,
  'counter_proposal_received'::text,
  'counter_proposal_accepted'::text,
  'buyer_counter_received'::text,
  'booking_message'::text,
  'new_chat'::text
]));