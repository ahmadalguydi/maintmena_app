-- Add booking_id column to messages table for booking-specific messaging
ALTER TABLE public.messages ADD COLUMN booking_id UUID REFERENCES public.booking_requests(id);

-- Update RLS policies for booking messages
CREATE POLICY "Users can view booking messages" 
ON public.messages FOR SELECT 
USING (
  booking_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.booking_requests 
      WHERE id = messages.booking_id 
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can send booking messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  booking_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.booking_requests 
      WHERE id = messages.booking_id 
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  )
);

-- Function to send booking notifications
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Attach trigger to booking_requests table
DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests;
CREATE TRIGGER booking_status_notification
AFTER INSERT OR UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_booking_status_change();

-- Function to notify new booking message
CREATE OR REPLACE FUNCTION public.notify_new_booking_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  booking_record RECORD;
  recipient_id UUID;
BEGIN
  -- Get booking details
  SELECT buyer_id, seller_id, service_category
  INTO booking_record
  FROM public.booking_requests
  WHERE id = NEW.booking_id;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = booking_record.buyer_id THEN
    recipient_id := booking_record.seller_id;
  ELSE
    recipient_id := booking_record.buyer_id;
  END IF;

  -- Create notification for recipient
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
$$;

-- Attach trigger to messages table for booking messages
DROP TRIGGER IF EXISTS booking_message_notification ON public.messages;
CREATE TRIGGER booking_message_notification
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.booking_id IS NOT NULL)
EXECUTE FUNCTION public.notify_new_booking_message();