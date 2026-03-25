-- Add booking-related columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS service_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_radius_km INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS instant_booking_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'accepting_requests';

-- Add check constraint for availability_status
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_availability_status_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_availability_status_check 
CHECK (availability_status IN ('accepting_requests', 'busy', 'not_taking_work'));

-- Create booking_requests table
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'booking' CHECK (request_type IN ('booking', 'consultation', 'quote')),
  service_category TEXT,
  proposed_start_date TIMESTAMP WITH TIME ZONE,
  proposed_end_date TIMESTAMP WITH TIME ZONE,
  preferred_time_slot TEXT,
  location_address TEXT,
  location_city TEXT,
  location_country TEXT,
  job_description TEXT NOT NULL,
  budget_range TEXT,
  urgency TEXT DEFAULT 'normal' CHECK (urgency IN ('urgent', 'normal', 'flexible')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  seller_response TEXT,
  seller_counter_proposal JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on booking_requests
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Buyers can create booking requests
CREATE POLICY "Buyers can create booking requests"
ON public.booking_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- RLS Policy: Buyers can view their own booking requests
CREATE POLICY "Buyers can view their own booking requests"
ON public.booking_requests FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- RLS Policy: Sellers can view booking requests sent to them
CREATE POLICY "Sellers can view booking requests sent to them"
ON public.booking_requests FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- RLS Policy: Sellers can update booking requests sent to them
CREATE POLICY "Sellers can update booking requests sent to them"
ON public.booking_requests FOR UPDATE
TO authenticated
USING (seller_id = auth.uid());

-- RLS Policy: Buyers can update their own requests
CREATE POLICY "Buyers can update their own requests"
ON public.booking_requests FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

-- RLS Policy: Buyers can cancel their own requests
CREATE POLICY "Buyers can cancel their own requests"
ON public.booking_requests FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id AND status = 'pending');

-- Create function to notify seller of new booking request
CREATE OR REPLACE FUNCTION public.notify_seller_booking_request()
RETURNS TRIGGER AS $$
DECLARE
  seller_profile RECORD;
  buyer_name TEXT;
BEGIN
  -- Get seller info
  SELECT full_name, company_name INTO seller_profile
  FROM public.profiles
  WHERE id = NEW.seller_id;

  -- Get buyer name
  SELECT COALESCE(full_name, company_name, 'A client') INTO buyer_name
  FROM public.profiles
  WHERE id = NEW.buyer_id;

  -- Create notification for seller
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    notification_type,
    content_id
  ) VALUES (
    NEW.seller_id,
    'New Booking Request',
    buyer_name || ' sent you a booking request for ' || COALESCE(NEW.service_category, 'a service'),
    'booking_request',
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking request notifications
DROP TRIGGER IF EXISTS on_booking_request_created ON public.booking_requests;
CREATE TRIGGER on_booking_request_created
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_booking_request();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_booking_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted', 'declined') THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating timestamps
DROP TRIGGER IF EXISTS on_booking_request_updated ON public.booking_requests;
CREATE TRIGGER on_booking_request_updated
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_request_timestamp();