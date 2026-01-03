-- Add country and city to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN country TEXT,
ADD COLUMN city TEXT;

-- Add seller profile fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN show_past_work BOOLEAN DEFAULT true,
ADD COLUMN bio TEXT,
ADD COLUMN years_of_experience INTEGER,
ADD COLUMN specializations TEXT[],
ADD COLUMN certifications TEXT[],
ADD COLUMN portfolio_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN completed_projects INTEGER DEFAULT 0,
ADD COLUMN response_time_hours INTEGER,
ADD COLUMN website_url TEXT,
ADD COLUMN linkedin_url TEXT;

-- Create index for faster location-based queries
CREATE INDEX idx_maintenance_requests_country ON public.maintenance_requests(country);
CREATE INDEX idx_maintenance_requests_city ON public.maintenance_requests(city);

-- Create seller_reviews table for detailed reviews
CREATE TABLE public.seller_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on seller_reviews
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for seller_reviews
CREATE POLICY "Anyone can view published reviews"
ON public.seller_reviews
FOR SELECT
USING (true);

CREATE POLICY "Buyers can create reviews for their projects"
ON public.seller_reviews
FOR INSERT
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews"
ON public.seller_reviews
FOR UPDATE
USING (auth.uid() = buyer_id);

-- Create trigger to update seller rating when reviews are added/updated
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET seller_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.seller_reviews
    WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id)
  )
  WHERE id = COALESCE(NEW.seller_id, OLD.seller_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_seller_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_rating();