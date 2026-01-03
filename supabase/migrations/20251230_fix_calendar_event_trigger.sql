-- Fix create_booking_calendar_event to handle null dates safely
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
      COALESCE(NEW.proposed_start_date, NEW.updated_at, now()), -- Fallback to updated_at or now()
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
      COALESCE(NEW.proposed_start_date, NEW.updated_at, now()), -- Fallback to updated_at or now()
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
