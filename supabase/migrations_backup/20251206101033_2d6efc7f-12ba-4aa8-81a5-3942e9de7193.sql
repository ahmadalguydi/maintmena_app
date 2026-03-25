-- Phase 1: Digital Warranty System
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS warranty_activated_at timestamptz,
ADD COLUMN IF NOT EXISTS warranty_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS warranty_claimed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_claim_reason text;

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS warranty_activated_at timestamptz,
ADD COLUMN IF NOT EXISTS warranty_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS warranty_claimed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_claim_reason text;

-- Phase 2: Seller Badge & Gamification
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verified_reviews_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS founding_member boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS elite_badge_expiry timestamptz;

-- Phase 4: Price Haggle Interface
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS proposed_price numeric,
ADD COLUMN IF NOT EXISTS price_status text;

ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS final_agreed_price numeric,
ADD COLUMN IF NOT EXISTS price_negotiated_at timestamptz,
ADD COLUMN IF NOT EXISTS original_price numeric;

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS final_agreed_price numeric,
ADD COLUMN IF NOT EXISTS price_negotiated_at timestamptz;

-- Phase 5: Photo Proof System
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS completion_photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS before_photos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS completion_photos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS before_photos jsonb DEFAULT '[]'::jsonb;

-- Phase 6: Enhanced Nudge Sequence
ALTER TABLE public.booking_requests
ADD COLUMN IF NOT EXISTS nudge_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_closed boolean DEFAULT false;

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS nudge_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_nudge_at timestamptz,
ADD COLUMN IF NOT EXISTS auto_closed boolean DEFAULT false;

-- Phase 7: WhatsApp Escape Detection
CREATE TABLE IF NOT EXISTS public.platform_escape_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  booking_id uuid REFERENCES public.booking_requests(id),
  request_id uuid REFERENCES public.maintenance_requests(id),
  detected_pattern text NOT NULL,
  message_content text,
  warning_shown boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.platform_escape_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own escape events"
ON public.platform_escape_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own escape events"
ON public.platform_escape_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Warranty Claims Table
CREATE TABLE IF NOT EXISTS public.warranty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.booking_requests(id),
  request_id uuid REFERENCES public.maintenance_requests(id),
  claimant_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  claim_reason text NOT NULL,
  claim_description text,
  evidence_photos jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'pending',
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.warranty_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their warranty claims"
ON public.warranty_claims FOR SELECT
USING (auth.uid() = claimant_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create warranty claims"
ON public.warranty_claims FOR INSERT
WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Users can update their claims"
ON public.warranty_claims FOR UPDATE
USING (auth.uid() = claimant_id);

-- Seller Achievements Table
CREATE TABLE IF NOT EXISTS public.seller_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.seller_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
ON public.seller_achievements FOR SELECT
USING (true);

CREATE POLICY "System can insert achievements"
ON public.seller_achievements FOR INSERT
WITH CHECK (true);

-- Function to activate warranty on job completion
CREATE OR REPLACE FUNCTION public.activate_warranty_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_marked_complete = true AND NEW.seller_marked_complete = true 
     AND OLD.buyer_marked_complete IS DISTINCT FROM NEW.buyer_marked_complete THEN
    NEW.warranty_activated_at := now();
    NEW.warranty_expires_at := now() + interval '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for warranty activation
DROP TRIGGER IF EXISTS activate_booking_warranty ON public.booking_requests;
CREATE TRIGGER activate_booking_warranty
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW
EXECUTE FUNCTION public.activate_warranty_on_completion();

DROP TRIGGER IF EXISTS activate_request_warranty ON public.maintenance_requests;
CREATE TRIGGER activate_request_warranty
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.activate_warranty_on_completion();

-- Function to update verified reviews count and award badges
CREATE OR REPLACE FUNCTION public.update_seller_badges()
RETURNS TRIGGER AS $$
DECLARE
  review_count integer;
BEGIN
  SELECT COUNT(*) INTO review_count
  FROM public.seller_reviews
  WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id);
  
  UPDATE public.profiles
  SET verified_reviews_count = review_count,
      badges = CASE 
        WHEN review_count >= 10 AND elite_badge_expiry IS NULL THEN 
          jsonb_build_array(jsonb_build_object('type', 'elite', 'awarded_at', now()))
        ELSE badges
      END,
      elite_badge_expiry = CASE 
        WHEN review_count >= 10 AND elite_badge_expiry IS NULL THEN 
          now() + interval '1 year'
        ELSE elite_badge_expiry
      END
  WHERE id = COALESCE(NEW.seller_id, OLD.seller_id);
  
  -- Record achievement if reaching 10 reviews
  IF review_count = 10 THEN
    INSERT INTO public.seller_achievements (seller_id, achievement_type, achievement_name)
    VALUES (COALESCE(NEW.seller_id, OLD.seller_id), 'elite_badge', 'Elite Professional')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_badges_on_review ON public.seller_reviews;
CREATE TRIGGER update_badges_on_review
AFTER INSERT OR DELETE ON public.seller_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_badges();

-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for job photos
CREATE POLICY "Anyone can view job photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-photos');

CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'job-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own job photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);