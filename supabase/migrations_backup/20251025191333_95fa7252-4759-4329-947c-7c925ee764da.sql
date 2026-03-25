-- Phase 11 & 12: Add calendar integration and payment fields to booking_requests

-- Add payment fields to booking_requests table
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS final_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invoice_id TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add check constraint for payment status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_status_check'
  ) THEN
    ALTER TABLE public.booking_requests
    ADD CONSTRAINT payment_status_check 
    CHECK (payment_status IN ('unpaid', 'deposit_paid', 'fully_paid', 'refunded'));
  END IF;
END $$;

-- Function to create calendar event when booking is accepted
CREATE OR REPLACE FUNCTION public.create_booking_calendar_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  
  -- When booking is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to booking_requests table for calendar sync
DROP TRIGGER IF EXISTS booking_calendar_sync ON public.booking_requests;
CREATE TRIGGER booking_calendar_sync
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_booking_calendar_event();