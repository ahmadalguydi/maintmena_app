

-- ==========================================
-- Migration: 20240127_atomic_job_submission.sql
-- ==========================================

-- Function to handle atomic job submission
CREATE OR REPLACE FUNCTION public.create_maintenance_request(
        request_data jsonb,
        template_sections jsonb DEFAULT null
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_request_id uuid;
result_record jsonb;
BEGIN -- 1. Insert the Maintenance Request
INSERT INTO public.maintenance_requests (
        buyer_id,
        title,
        description,
        title_en,
        title_ar,
        description_en,
        description_ar,
        original_language,
        category,
        service_type,
        location,
        country,
        city,
        urgency,
        budget,
        estimated_budget_min,
        estimated_budget_max,
        deadline,
        preferred_start_date,
        project_duration_days,
        facility_type,
        scope_of_work,
        payment_method,
        tags,
        status,
        visibility,
        latitude,
        longitude
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        request_data->>'title',
        request_data->>'description',
        request_data->>'title_en',
        request_data->>'title_ar',
        request_data->>'description_en',
        request_data->>'description_ar',
        request_data->>'original_language',
        request_data->>'category',
        request_data->>'service_type',
        request_data->>'location',
        request_data->>'country',
        request_data->>'city',
        request_data->>'urgency',
        (request_data->>'budget')::numeric,
        (request_data->>'estimated_budget_min')::numeric,
        (request_data->>'estimated_budget_max')::numeric,
        (request_data->>'deadline')::timestamptz,
        (request_data->>'preferred_start_date')::timestamptz,
        (request_data->>'project_duration_days')::int,
        request_data->>'facility_type',
        request_data->>'scope_of_work',
        request_data->>'payment_method',
        (request_data->'tags')::jsonb,
        'open',
        'public',
        (request_data->>'latitude')::float,
        (request_data->>'longitude')::float
    )
RETURNING id INTO new_request_id;
-- 2. Insert Quote Template (if provided)
IF template_sections IS NOT NULL THEN
INSERT INTO public.request_quote_templates (
        request_id,
        sections,
        created_by
    )
VALUES (
        new_request_id,
        template_sections,
        (request_data->>'buyer_id')::uuid
    );
END IF;
-- 3. Auto-track the item for the buyer
INSERT INTO public.tracked_items (
        user_id,
        item_id,
        item_type
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        new_request_id,
        'request'
    );
-- Return the new ID
result_record := jsonb_build_object('id', new_request_id);
RETURN result_record;
END;
$$;

-- ==========================================
-- Migration: 20240127_geofencing.sql
-- ==========================================

-- Add geolocation columns to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS latitude float,
    ADD COLUMN IF NOT EXISTS longitude float;
-- Index for geospatial queries (optional but good for future)
CREATE INDEX IF NOT EXISTS maintenance_requests_location_idx ON public.maintenance_requests (latitude, longitude);

-- ==========================================
-- Migration: 20240127_quote_stats.sql
-- ==========================================

-- Function to get quote statistics for a request
CREATE OR REPLACE FUNCTION public.get_quote_stats(request_uuid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE avg_price numeric;
min_price numeric;
max_price numeric;
quote_count int;
BEGIN
SELECT AVG(price),
    MIN(price),
    MAX(price),
    COUNT(*) INTO avg_price,
    min_price,
    max_price,
    quote_count
FROM public.quote_submissions
WHERE request_id = request_uuid
    AND status != 'rejected';
RETURN jsonb_build_object(
    'average_price',
    COALESCE(avg_price, 0),
    'min_price',
    COALESCE(min_price, 0),
    'max_price',
    COALESCE(max_price, 0),
    'count',
    quote_count
);
END;
$$;

-- ==========================================
-- Migration: 20240127_weighted_ratings.sql
-- ==========================================

-- Add columns for weighted ratings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS effective_rating float DEFAULT 0,
    ADD COLUMN IF NOT EXISTS high_value_badge boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_rating_recalc timestamp with time zone;
-- Function to calculate weighted rating
CREATE OR REPLACE FUNCTION public.calculate_seller_rating(seller_uuid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_weight float := 0;
weighted_sum float := 0;
review_record RECORD;
review_age_days int;
weight float;
-- High Value Stats
high_value_count int := 0;
high_value_sum float := 0;
is_high_value boolean := false;
BEGIN -- Loop through all reviews for this seller
FOR review_record IN
SELECT r.rating,
    r.created_at,
    m.budget
FROM public.seller_reviews r
    LEFT JOIN public.maintenance_requests m ON r.request_id = m.id
WHERE r.seller_id = seller_uuid LOOP -- Calculate Age in Days
    review_age_days := EXTRACT(
        DAY
        FROM (NOW() - review_record.created_at)
    );
-- Determine Weight based on Recency
IF review_age_days < 90 THEN weight := 1.0;
ELSIF review_age_days < 180 THEN weight := 0.8;
ELSE weight := 0.5;
END IF;
-- Add to sums
weighted_sum := weighted_sum + (review_record.rating * weight);
total_weight := total_weight + weight;
-- High Value Logic (Jobs > 1000)
IF review_record.budget IS NOT NULL
AND review_record.budget > 1000 THEN high_value_count := high_value_count + 1;
high_value_sum := high_value_sum + review_record.rating;
END IF;
END LOOP;
-- Determine High Value Badge (e.g., > 5 high value jobs with > 4.5 avg)
IF high_value_count >= 5
AND (high_value_sum / high_value_count) >= 4.5 THEN is_high_value := true;
END IF;
-- Update Profile
UPDATE public.profiles
SET effective_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    seller_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    -- Sync legacy column for now
    high_value_badge = is_high_value,
    last_rating_recalc = NOW()
WHERE id = seller_uuid;
END;
$$;
-- Trigger to run on review changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_rating() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF (TG_OP = 'DELETE') THEN PERFORM public.calculate_seller_rating(OLD.seller_id);
ELSE PERFORM public.calculate_seller_rating(NEW.seller_id);
END IF;
RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS on_review_change ON public.seller_reviews;
CREATE TRIGGER on_review_change
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.seller_reviews FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_rating();

-- ==========================================
-- Migration: 20240128_cascade_delete_quotes.sql
-- ==========================================

-- Fix orphaned quotes: Add CASCADE delete for quote_submissions
-- When a maintenance_request is deleted, all related quotes should also be deleted
-- Step 1: Drop existing constraint (if exists)
ALTER TABLE public.quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_request_id_fkey;
-- Step 2: Re-add with CASCADE
ALTER TABLE public.quote_submissions
ADD CONSTRAINT quote_submissions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;
-- Also cascade for messages tied to quotes
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_quote_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quote_submissions(id) ON DELETE CASCADE;
-- And tracked_items
ALTER TABLE public.tracked_items DROP CONSTRAINT IF EXISTS tracked_items_item_id_fkey;
-- tracked_items is polymorphic (item_type can be 'request' or 'tender'), 
-- so we can't add a simple FK. We'll clean up via trigger instead.
-- Cleanup trigger for tracked_items when request is deleted
CREATE OR REPLACE FUNCTION public.cleanup_tracked_items_on_request_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM public.tracked_items
WHERE item_id = OLD.id
    AND item_type = 'request';
RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trigger_cleanup_tracked_items ON public.maintenance_requests;
CREATE TRIGGER trigger_cleanup_tracked_items BEFORE DELETE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.cleanup_tracked_items_on_request_delete();

-- ==========================================
-- Migration: 20251003162043_874f9c2d-e003-43fe-af95-1b2f0ab9e024.sql
-- ==========================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role to new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- Migration: 20251003162058_6bb6184c-196f-4ad1-835d-2f7863ab19e1.sql
-- ==========================================

-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- Migration: 20251003174530_6ce6c0b5-c470-453c-b982-d816a69136ee.sql
-- ==========================================

-- Only configure subscriptions / realtime if the table actually exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  ) THEN
    -- Ensure subscriptions table emits full rows for realtime and is added to publication
    ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

    -- Backfill missing subscriptions with 14-day trial on professional
    INSERT INTO public.subscriptions (user_id, tier, status, trial_ends_at)
    SELECT u.id, 'professional', 'active', now() + interval '14 days'
    FROM auth.users u
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE s.user_id IS NULL;
  END IF;
END
$$;

-- Create trigger to populate profiles, roles and subscriptions for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Backfill missing profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill missing user roles with default 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;



-- ==========================================
-- Migration: 20251003175149_64fc081b-f915-4fbb-8e7c-6cc4daa11f8f.sql
-- ==========================================

-- Create briefs table
CREATE TABLE public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  publication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefs_publication_date ON public.briefs(publication_date DESC);
CREATE INDEX idx_briefs_status ON public.briefs(status);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published briefs"
  ON public.briefs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all briefs"
  ON public.briefs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create signals table
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  estimated_value TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  location TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_deadline ON public.signals(deadline);
CREATE INDEX idx_signals_urgency ON public.signals(urgency);
CREATE INDEX idx_signals_status ON public.signals(status);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Admins can manage all signals"
  ON public.signals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create tenders table
CREATE TABLE public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  value_min DECIMAL,
  value_max DECIMAL,
  submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  requirements TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenders_deadline ON public.tenders(submission_deadline);
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_category ON public.tenders(category);

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open tenders"
  ON public.tenders FOR SELECT
  USING (status = 'open');

CREATE POLICY "Admins can manage all tenders"
  ON public.tenders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create educational_content table
CREATE TABLE public.educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'webinar', 'article', 'course')),
  thumbnail_url TEXT,
  video_url TEXT,
  transcript_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'basic', 'professional', 'enterprise')),
  views_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_educational_content_category ON public.educational_content(category);
CREATE INDEX idx_educational_content_access_tier ON public.educational_content(access_tier);

ALTER TABLE public.educational_content ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can manage all educational content"
  ON public.educational_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create key_contacts table
CREATE TABLE public.key_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  recent_activity TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_key_contacts_company ON public.key_contacts(company);

ALTER TABLE public.key_contacts ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Admins can manage all key contacts"
  ON public.key_contacts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create user_activity table
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('brief_read', 'signal_view', 'tender_view', 'content_watch', 'signal_bookmark', 'tender_bookmark')),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('brief', 'signal', 'tender', 'educational_content')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_content ON public.user_activity(content_type, content_id);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.user_activity FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_interests TEXT[],
  notification_settings JSONB DEFAULT '{"email": true, "push": false, "new_briefs": true, "tender_deadlines": true, "new_signals": true}'::jsonb,
  content_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_brief', 'tender_deadline', 'new_signal', 'system')),
  content_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add update triggers for updated_at columns
CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_signals_updated_at
  BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_educational_content_updated_at
  BEFORE UPDATE ON public.educational_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_key_contacts_updated_at
  BEFORE UPDATE ON public.key_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for content tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.educational_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================
-- Migration: 20251003180317_08083f6e-4cf0-4d4e-bc0d-9b92e3f1a6d8.sql
-- ==========================================

-- Fix security issues: Restrict public access to sensitive tables

-- Drop the overly permissive policy on key_contacts
DROP POLICY IF EXISTS "Anyone can view key contacts" ON public.key_contacts;

-- Create authenticated-only policy for key_contacts
CREATE POLICY "Authenticated users can view key contacts"
  ON public.key_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the overly permissive policy on signals
DROP POLICY IF EXISTS "Anyone can view active signals" ON public.signals;

-- Create authenticated-only policy for signals
CREATE POLICY "Authenticated users can view active signals"
  ON public.signals FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Similarly restrict tenders to authenticated users only
DROP POLICY IF EXISTS "Anyone can view open tenders" ON public.tenders;

CREATE POLICY "Authenticated users can view open tenders"
  ON public.tenders FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'open');

-- ==========================================
-- Migration: 20251003183222_99a5b5bb-61a7-44c4-b906-6335412736ba.sql
-- ==========================================

-- Add tags column to briefs table
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create junction table for briefs and signals
CREATE TABLE IF NOT EXISTS public.brief_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, signal_id)
);

-- Create junction table for briefs and tenders
CREATE TABLE IF NOT EXISTS public.brief_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, tender_id)
);

-- Enable RLS on junction tables
ALTER TABLE public.brief_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_tenders ENABLE ROW LEVEL SECURITY;

-- RLS policies for brief_signals
CREATE POLICY "Admins can manage brief signals" ON public.brief_signals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief signals" ON public.brief_signals
FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS policies for brief_tenders
CREATE POLICY "Admins can manage brief tenders" ON public.brief_tenders
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief tenders" ON public.brief_tenders
FOR SELECT USING (auth.uid() IS NOT NULL);

-- ==========================================
-- Migration: 20251004051016_8b0411d8-a652-46af-8467-e5cd922799e3.sql
-- ==========================================

-- Create templates_guides table
CREATE TABLE public.templates_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'published',
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates_guides ENABLE ROW LEVEL SECURITY;

-- Policies for templates_guides
CREATE POLICY "Admins can manage all templates/guides"
ON public.templates_guides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Create industry_reports table
CREATE TABLE public.industry_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_url TEXT,
  preview_content TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'published',
  views_count INTEGER DEFAULT 0,
  publication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_reports ENABLE ROW LEVEL SECURITY;

-- Policies for industry_reports
CREATE POLICY "Admins can manage all reports"
ON public.industry_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Add update triggers
CREATE TRIGGER update_templates_guides_updated_at
BEFORE UPDATE ON public.templates_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_industry_reports_updated_at
BEFORE UPDATE ON public.industry_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- Migration: 20251004154649_dcec6969-0bb2-4b7e-9505-14d25b45bed5.sql
-- ==========================================

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  event_type text NOT NULL DEFAULT 'manual', -- manual, tender, signal, reminder
  related_content_id uuid, -- Link to tender/signal ID
  related_content_type text, -- tender or signal
  location text,
  status text DEFAULT 'upcoming', -- upcoming, completed, cancelled
  reminder_sent boolean DEFAULT false,
  color text DEFAULT '#3b82f6',
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can manage their own calendar events
CREATE POLICY "Users can view their own calendar events"
ON public.calendar_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- Migration: 20251004183532_0cf1a05b-2d5c-434e-b13f-ad67451a49b8.sql
-- ==========================================

-- Step 1: Add new enum values in their own transaction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'buyer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'buyer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'seller'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'seller';
  END IF;
END $$;

-- ==========================================
-- Migration: 20251004183548_9043c5ae-8b9c-414b-b7cb-7290be95a4ea.sql
-- ==========================================

-- Step 2: Create policies allowing self-assign buyer/seller and optional profile insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' 
      AND policyname = 'Users can set themselves as buyer or seller'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can set themselves as buyer or seller" 
      ON public.user_roles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id AND role IN (''buyer'',''seller''))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Users can create their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create their own profile" 
      ON public.profiles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- ==========================================
-- Migration: 20251004185151_ba101786-a394-41c9-b932-c4730427cadc.sql
-- ==========================================

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  service_type TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  location TEXT NOT NULL,
  facility_type TEXT,
  estimated_budget_min NUMERIC,
  estimated_budget_max NUMERIC,
  budget NUMERIC,
  project_duration_days INTEGER,
  scope_of_work TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  preferred_start_date TIMESTAMP WITH TIME ZONE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quote_submissions table
CREATE TABLE IF NOT EXISTS public.quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  estimated_duration TEXT NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create saved_requests table
CREATE TABLE IF NOT EXISTS public.saved_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(seller_id, request_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS verified_seller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_rating NUMERIC DEFAULT 0;

-- Enable RLS on all tables
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Buyers can manage their own requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view public open requests" 
  ON public.maintenance_requests 
  FOR SELECT 
  USING (visibility = 'public' AND status = 'open');

CREATE POLICY "Admins can manage all requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quote_submissions
CREATE POLICY "Sellers can create quotes" 
  ON public.quote_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can view their own quotes" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view quotes for their requests" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can update quote status" 
  ON public.quote_submissions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

-- RLS Policies for saved_requests
CREATE POLICY "Sellers can manage their saved requests" 
  ON public.saved_requests 
  FOR ALL 
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages for their requests" 
  ON public.messages 
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = messages.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.quote_submissions 
      WHERE quote_submissions.request_id = messages.request_id 
      AND quote_submissions.seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Add updated_at triggers
CREATE TRIGGER update_maintenance_requests_updated_at 
  BEFORE UPDATE ON public.maintenance_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_quote_submissions_updated_at 
  BEFORE UPDATE ON public.quote_submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id ON public.maintenance_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id ON public.quote_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id ON public.quote_submissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_saved_requests_seller_id ON public.saved_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_id ON public.messages(request_id);

-- ==========================================
-- Migration: 20251006091341_4ddaaf13-99fe-4b04-8a27-5290d18c3790.sql
-- ==========================================

-- Create table for tracking signals and tenders
CREATE TABLE IF NOT EXISTS public.tracked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('signal', 'tender')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tracked items
CREATE POLICY "Users can view their own tracked items"
  ON public.tracked_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked items"
  ON public.tracked_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked items"
  ON public.tracked_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_tracked_items_user_id ON public.tracked_items(user_id);
CREATE INDEX idx_tracked_items_item_id ON public.tracked_items(item_id, item_type);

-- ==========================================
-- Migration: 20251006091406_d93ec8b5-0d18-4922-af12-f7b3b77b0bb2.sql
-- ==========================================

-- Add quote_id to messages table for quote-specific messaging
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quote_submissions(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_quote_id ON public.messages(quote_id);

-- Update RLS policies for quote-specific messages
DROP POLICY IF EXISTS "Users can view messages for their requests" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can view messages for their quotes"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    -- Seller can see messages for their quotes
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      WHERE quote_submissions.id = messages.quote_id 
      AND quote_submissions.seller_id = auth.uid()
    )) OR
    -- Buyer can see messages for quotes on their requests
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages for their quotes"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      -- Seller can message their own quotes
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        WHERE quote_submissions.id = quote_id 
        AND quote_submissions.seller_id = auth.uid()
      )) OR
      -- Buyer can message quotes on their requests
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
        WHERE quote_submissions.id = quote_id 
        AND maintenance_requests.buyer_id = auth.uid()
      ))
    )
  );

-- ==========================================
-- Migration: 20251006092704_41cee02d-4cc3-47d1-a925-d5d2e0337be2.sql
-- ==========================================

-- Make request_id nullable in messages table since we're using quote-specific messaging
ALTER TABLE public.messages ALTER COLUMN request_id DROP NOT NULL;

-- Update RLS policies for messages to work with quote-specific messaging
DROP POLICY IF EXISTS "Users can send messages for their quotes" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their quotes" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can send messages for their quotes"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  quote_id IS NOT NULL AND
  (
    -- Seller can send if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can send if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view messages for their quotes"
ON public.messages
FOR SELECT
TO authenticated
USING (
  quote_id IS NOT NULL AND
  (
    -- Seller can view if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can view if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);

-- ==========================================
-- Migration: 20251006092716_2511bf7e-4757-4128-8d7d-862b349e3ca7.sql
-- ==========================================

-- Add source_link field to signals table for primary source verification
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS source_link TEXT;

-- Add source_link field to tenders table for primary source verification
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS source_link TEXT;

-- ==========================================
-- Migration: 20251007153629_0627331a-8548-45fb-b4c4-db8a46a8abeb.sql
-- ==========================================

-- Add detailed fields to quote_submissions table
ALTER TABLE public.quote_submissions 
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS technical_approach TEXT,
ADD COLUMN IF NOT EXISTS team_experience TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS timeline_details TEXT,
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB,
ADD COLUMN IF NOT EXISTS client_references TEXT,
ADD COLUMN IF NOT EXISTS custom_sections JSONB;

-- Create request_quote_templates table for customizable quote forms
CREATE TABLE IF NOT EXISTS public.request_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on request_quote_templates
ALTER TABLE public.request_quote_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for request_quote_templates
CREATE POLICY "Buyers can manage templates for their requests"
ON public.request_quote_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view templates for open requests"
ON public.request_quote_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND status = 'open'
    AND visibility = 'public'
  )
);

-- Function to create notification when quote is submitted
CREATE OR REPLACE FUNCTION public.notify_quote_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_id UUID;
  request_title TEXT;
BEGIN
  -- Get buyer_id and request title
  SELECT mr.buyer_id, mr.title INTO buyer_id, request_title
  FROM maintenance_requests mr
  WHERE mr.id = NEW.request_id;

  -- Create notification for buyer
  IF buyer_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      buyer_id,
      'New Quote Received',
      'You received a new quote for "' || request_title || '"',
      'quote_received',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for quote submissions
DROP TRIGGER IF EXISTS on_quote_submission ON public.quote_submissions;
CREATE TRIGGER on_quote_submission
AFTER INSERT ON public.quote_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_submission();

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  buyer_id UUID;
  seller_id UUID;
  recipient_id UUID;
BEGIN
  -- Get quote details
  SELECT qs.seller_id, mr.buyer_id, mr.title
  INTO quote_record
  FROM quote_submissions qs
  JOIN maintenance_requests mr ON mr.id = qs.request_id
  WHERE qs.id = NEW.quote_id;

  seller_id := quote_record.seller_id;
  buyer_id := quote_record.buyer_id;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = buyer_id THEN
    recipient_id := seller_id;
  ELSE
    recipient_id := buyer_id;
  END IF;

  -- Create notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      recipient_id,
      'New Message',
      'You have a new message regarding "' || quote_record.title || '"',
      'new_message',
      NEW.quote_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- ==========================================
-- Migration: 20251007155928_2177ea91-d13c-4de0-ae86-09437b708113.sql
-- ==========================================

-- Ensure triggers are properly created
DROP TRIGGER IF EXISTS on_quote_submission ON quote_submissions;
CREATE TRIGGER on_quote_submission
  AFTER INSERT ON quote_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_submission();

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- ==========================================
-- Migration: 20251007161054_f12c7d89-097b-470e-968d-4c90dcf4ad79.sql
-- ==========================================

-- Update the notification_type check constraint to include quote and message types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text, 
  'tender_deadline'::text, 
  'new_signal'::text, 
  'system'::text,
  'quote_received'::text,
  'new_message'::text
]));

-- ==========================================
-- Migration: 20251007175851_ba7d0949-8140-4fe7-b8b1-7079b4e05313.sql
-- ==========================================

-- Create table to track negotiation offers per quote
CREATE TABLE IF NOT EXISTS public.quote_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_submissions(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  price_offer numeric,
  duration_offer text,
  message text,
  status text NOT NULL DEFAULT 'open', -- open | accepted | declined | countered | withdrawn
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_negotiations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid name conflicts
DROP POLICY IF EXISTS "Participants can view negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can insert negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can update negotiations" ON public.quote_negotiations;

-- Policy: Participants (buyer or seller) can view negotiation entries for their quotes
CREATE POLICY "Participants can view negotiations"
ON public.quote_negotiations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Policy: Participants can insert negotiation entries for their quotes
CREATE POLICY "Participants can insert negotiations"
ON public.quote_negotiations
FOR INSERT
WITH CHECK (
  initiator_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (
        -- Seller initiates to buyer
        (qs.seller_id = auth.uid() AND recipient_id = mr.buyer_id)
        OR
        -- Buyer initiates to seller
        (mr.buyer_id = auth.uid() AND recipient_id = qs.seller_id)
      )
  )
);

-- Policy: Participants can update negotiation entries (e.g., accept/decline/counter)
CREATE POLICY "Participants can update negotiations"
ON public.quote_negotiations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Trigger to set quote_submissions.status = 'negotiating' when a negotiation entry is created
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status <> 'accepted' AND status <> 'declined';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
BEFORE INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

-- Generic updated_at trigger for quote_negotiations
DROP TRIGGER IF EXISTS trg_quote_negotiations_updated_at ON public.quote_negotiations;
CREATE TRIGGER trg_quote_negotiations_updated_at
BEFORE UPDATE ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Useful index for faster lookups by quote
CREATE INDEX IF NOT EXISTS idx_quote_negotiations_quote_id ON public.quote_negotiations(quote_id);


-- ==========================================
-- Migration: 20251007180333_e00c34a5-fbbe-4d97-a458-989ff6e94270.sql
-- ==========================================

-- Add buyer_type field to profiles table to distinguish between company and individual buyers
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS buyer_type text CHECK (buyer_type IN ('company', 'individual'));

-- Create index for faster queries filtering by buyer type
CREATE INDEX IF NOT EXISTS idx_profiles_buyer_type ON public.profiles(buyer_type);

-- Update existing buyers to have default buyer_type (company for backward compatibility)
-- Only update profiles that are buyers (have user_type = 'buyer' or have posted maintenance requests)
UPDATE public.profiles
SET buyer_type = 'company'
WHERE buyer_type IS NULL
  AND (
    user_type = 'buyer'
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE buyer_id = profiles.id
    )
  );


-- ==========================================
-- Migration: 20251007182109_b8f6ee8b-a4d3-4688-baa9-94fc8e6d2226.sql
-- ==========================================

-- Fix quote_submissions status to include 'negotiating' and ensure negotiation insert updates quote status
BEGIN;

-- 1) Relax/Add status values to include 'negotiating'
ALTER TABLE public.quote_submissions
  DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

ALTER TABLE public.quote_submissions
  ADD CONSTRAINT quote_submissions_status_check
  CHECK (status IN (
    'pending',
    'submitted',
    'shortlisted',
    'negotiating',
    'accepted',
    'rejected',
    'withdrawn'
  ));

-- 2) Ensure trigger exists to set status to negotiating when a negotiation offer is created
-- Update function to avoid using nonexistent 'declined' status and instead use 'rejected'
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status NOT IN ('accepted','rejected');
  RETURN NEW;
END;
$$;

-- Recreate the trigger to be safe
DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
AFTER INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

COMMIT;

-- ==========================================
-- Migration: 20251007185732_3ab21261-d20d-42bf-9534-ed60182819c8.sql
-- ==========================================

-- Step 1: add new enum value (must be committed alone)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer_individual';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- Migration: 20251007185808_364a71eb-844f-40ac-90ae-87a70d589626.sql
-- ==========================================

-- Step 2: policies, counters, view tracking, and triggers

-- Allow users to set buyer_individual role in user_roles
DROP POLICY IF EXISTS "Users can set themselves as buyer_individual" ON public.user_roles;
CREATE POLICY "Users can set themselves as buyer_individual"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (role = 'buyer_individual'));

-- Add counters to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quotes_count integer NOT NULL DEFAULT 0;

-- Table to track unique request views
CREATE TABLE IF NOT EXISTS public.request_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

ALTER TABLE public.request_views ENABLE ROW LEVEL SECURITY;

-- RLS: users can insert their own views
DROP POLICY IF EXISTS "Users can insert their own request views" ON public.request_views;
CREATE POLICY "Users can insert their own request views"
ON public.request_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Optional: users can view their own rows
DROP POLICY IF EXISTS "Users can view their own request views" ON public.request_views;
CREATE POLICY "Users can view their own request views"
ON public.request_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to increment views_count on insert into request_views
CREATE OR REPLACE FUNCTION public.increment_request_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET views_count = COALESCE(views_count, 0) + 1,
         updated_at = now()
   WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_request_views ON public.request_views;
CREATE TRIGGER trg_increment_request_views
AFTER INSERT ON public.request_views
FOR EACH ROW EXECUTE FUNCTION public.increment_request_views_count();

-- Triggers to maintain quotes_count on quote_submissions
CREATE OR REPLACE FUNCTION public.increment_quotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET quotes_count = COALESCE(quotes_count, 0) + 1,
         updated_at = now()
   WHERE id = NEW.request_id;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.decrement_quotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET quotes_count = GREATEST(COALESCE(quotes_count, 0) - 1, 0),
         updated_at = now()
   WHERE id = OLD.request_id;
  RETURN OLD;
END;$$;

DROP TRIGGER IF EXISTS trg_increment_quotes_count ON public.quote_submissions;
CREATE TRIGGER trg_increment_quotes_count
AFTER INSERT ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.increment_quotes_count();

DROP TRIGGER IF EXISTS trg_decrement_quotes_count ON public.quote_submissions;
CREATE TRIGGER trg_decrement_quotes_count
AFTER DELETE ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.decrement_quotes_count();

-- Close request when a quote is accepted
CREATE OR REPLACE FUNCTION public.close_request_on_quote_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.maintenance_requests
       SET status = 'awarded', updated_at = now()
     WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_close_request_on_quote_accepted ON public.quote_submissions;
CREATE TRIGGER trg_close_request_on_quote_accepted
AFTER UPDATE ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.close_request_on_quote_accepted();

-- ==========================================
-- Migration: 20251007190417_8e0867e9-9272-443d-b946-d05e3f536ec0.sql
-- ==========================================

-- Add denormalized buyer fields to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS buyer_type text,
  ADD COLUMN IF NOT EXISTS buyer_company_name text;

-- Function to sync buyer info when request is created or updated
CREATE OR REPLACE FUNCTION public.sync_request_buyer_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_profile RECORD;
BEGIN
  SELECT buyer_type, company_name INTO buyer_profile
  FROM public.profiles
  WHERE id = NEW.buyer_id;
  
  NEW.buyer_type := buyer_profile.buyer_type;
  NEW.buyer_company_name := buyer_profile.company_name;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON public.maintenance_requests;
CREATE TRIGGER trg_sync_request_buyer_info
BEFORE INSERT OR UPDATE OF buyer_id ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_buyer_info();

-- Function to update requests when buyer profile changes
CREATE OR REPLACE FUNCTION public.sync_requests_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.buyer_type IS DISTINCT FROM OLD.buyer_type) OR 
     (NEW.company_name IS DISTINCT FROM OLD.company_name) THEN
    UPDATE public.maintenance_requests
    SET buyer_type = NEW.buyer_type,
        buyer_company_name = NEW.company_name,
        updated_at = now()
    WHERE buyer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_requests_on_profile_update ON public.profiles;
CREATE TRIGGER trg_sync_requests_on_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_requests_on_profile_update();

-- Backfill existing requests with buyer info
UPDATE public.maintenance_requests mr
SET buyer_type = p.buyer_type,
    buyer_company_name = p.company_name
FROM public.profiles p
WHERE mr.buyer_id = p.id
  AND (mr.buyer_type IS NULL OR mr.buyer_company_name IS NULL);

-- ==========================================
-- Migration: 20251007193121_86b33385-724c-4ad2-a9f4-37f962af5d26.sql
-- ==========================================

-- Add action_items field to signals table
ALTER TABLE public.signals
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Add action_items field to tenders table
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Comment describing the structure of action_items
COMMENT ON COLUMN public.signals.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';

COMMENT ON COLUMN public.tenders.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';

-- ==========================================
-- Migration: 20251010163026_04425d52-19b1-4e40-bdb8-904016a64fbc.sql
-- ==========================================

-- Create table to track per-user completion state of action items from signals/tenders
CREATE TABLE IF NOT EXISTS public.user_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('signal','tender')),
  source_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, action_key)
);

-- Enable RLS
ALTER TABLE public.user_action_items ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own records
CREATE POLICY "Users can view their own action items"
ON public.user_action_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action items"
ON public.user_action_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action items"
ON public.user_action_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action items"
ON public.user_action_items
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_items_user ON public.user_action_items (user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_items_source ON public.user_action_items (source_type, source_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_timestamp_user_action_items
BEFORE UPDATE ON public.user_action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ==========================================
-- Migration: 20251011140415_be9625ec-a511-4efc-8f7e-8ab1b1b237e0.sql
-- ==========================================

-- Add currency preference to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'SAR'));

-- ==========================================
-- Migration: 20251018092410_5d7ce777-489e-45fa-bb11-e8fb292dbda4.sql
-- ==========================================

-- Create support_chats table for live chat sessions
CREATE TABLE public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_form_submissions table
CREATE TABLE public.contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_chats
CREATE POLICY "Users can view their own chats"
  ON public.support_chats FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own chats"
  ON public.support_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all chats"
  ON public.support_chats FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all chats"
  ON public.support_chats FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chats"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = chat_messages.chat_id
      AND (support_chats.user_id = auth.uid() OR support_chats.user_id IS NULL)
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can send messages in their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = chat_messages.chat_id
      AND (support_chats.user_id = auth.uid() OR support_chats.user_id IS NULL)
    ) OR (has_role(auth.uid(), 'admin') AND sender_type = 'admin')
  );

CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for contact_form_submissions
CREATE POLICY "Anyone can submit contact forms"
  ON public.contact_form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all contact submissions"
  ON public.contact_form_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact submissions"
  ON public.contact_form_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create function to update last_message_at
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_chats
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating last_message_at
CREATE TRIGGER update_chat_last_message_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- Create function to notify admins of new chats
CREATE OR REPLACE FUNCTION notify_admins_new_chat()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      admin_record.user_id,
      'New Support Chat',
      'A new support chat has been started by ' || COALESCE(NEW.user_name, NEW.user_email),
      'new_chat',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for notifying admins
CREATE TRIGGER notify_admins_new_chat_trigger
AFTER INSERT ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION notify_admins_new_chat();

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for performance
CREATE INDEX idx_support_chats_user_id ON public.support_chats(user_id);
CREATE INDEX idx_support_chats_status ON public.support_chats(status);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_contact_submissions_status ON public.contact_form_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_form_submissions(created_at DESC);

-- ==========================================
-- Migration: 20251024204713_61ed5d34-3b00-4780-b5e7-6065276604c3.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251024210443_abe7c5a4-df0b-4fcd-a3af-a56c43a07223.sql
-- ==========================================

-- Add country and city columns to signals table
ALTER TABLE public.signals
ADD COLUMN country text,
ADD COLUMN city text;

-- Add country and city columns to tenders table
ALTER TABLE public.tenders
ADD COLUMN country text,
ADD COLUMN city text;

-- ==========================================
-- Migration: 20251025095052_4d41a47f-ae92-41b4-b5f1-ef857f11b1cd.sql
-- ==========================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view published briefs" ON public.briefs;

-- Create new policy allowing access to both published and archived briefs
CREATE POLICY "Users can view published and archived briefs" 
ON public.briefs 
FOR SELECT 
USING (status IN ('published', 'archived'));

-- ==========================================
-- Migration: 20251025101728_3cca864a-a738-4bf4-9529-2c380cc0225e.sql
-- ==========================================

-- Add read tracking columns to messages table
ALTER TABLE public.messages 
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy to allow users to mark messages as read
CREATE POLICY "Users can mark their received messages as read"
ON public.messages
FOR UPDATE
USING (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
)
WITH CHECK (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
);

-- Add RLS policy for sellers to update their own pending/negotiating quotes
CREATE POLICY "Sellers can update their own pending quotes"
ON public.quote_submissions
FOR UPDATE
USING (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
)
WITH CHECK (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
);

-- ==========================================
-- Migration: 20251025180204_362d549b-41bb-416f-87a9-5a7c5e74bf91.sql
-- ==========================================

-- Add tags column for flexible metadata (Home/Project, job size, timeline, site readiness)
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tags ON public.maintenance_requests USING GIN (tags);

-- Add service_focus column to profiles for vendors (array of 'home', 'project', 'both')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_focus TEXT[] DEFAULT ARRAY['both'];

-- Add crew_size_range column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_size_range TEXT;

-- ==========================================
-- Migration: 20251025184540_051495b2-eba1-42cf-a049-5dc4ac238dcd.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251025191022_bff52ba4-b945-4a1e-a2e5-b822d4334009.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251025191333_95fa7252-4759-4329-947c-7c925ee764da.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251025192043_da648b9e-f42f-4f13-aa0e-1e2bd4766677.sql
-- ==========================================

-- Fix RLS policies to allow viewing discoverable seller profiles
-- This allows the Explore page and seller profile views to work properly

-- Add policy to allow authenticated users to view discoverable seller profiles
CREATE POLICY "authenticated_users_view_discoverable_sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  discoverable = true 
  AND (user_type IN ('seller', 'both'))
);

-- The existing "Users can view their own profile" policy remains in place
-- This creates layered access: full access to own profile, read-only for discoverable sellers

-- ==========================================
-- Migration: 20251025194956_41329c92-c1eb-4a1e-b38c-9760e6acc1b7.sql
-- ==========================================

-- Step 1: Add new subscription tier enum values
-- Adding: starter, comfort, priority, elite

-- Step 1: Add new subscription tier enum values (only if type exists)
-- Adding: starter, comfort, priority, elite

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'comfort';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'priority';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'elite';
  END IF;
END
$$;


-- ==========================================
-- Migration: 20251025195047_3fb35d2d-7fbd-4960-a274-217e1e40d99c.sql
-- ==========================================

-- Migrate existing subscription data and define has_subscription_access
-- Only if the subscriptions table and subscription_tier type actually exist

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN

    -- Migrate existing subscription data
    UPDATE subscriptions
    SET tier = 'comfort'::subscription_tier
    WHERE tier = 'basic'::subscription_tier;

    UPDATE subscriptions
    SET tier = 'elite'::subscription_tier
    WHERE tier = 'enterprise'::subscription_tier;

    -- Replace has_subscription_access function (not drop)
    CREATE OR REPLACE FUNCTION has_subscription_access(_user_id uuid, _required_tier subscription_tier)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      user_tier subscription_tier;
      tier_hierarchy int;
      required_tier_hierarchy int;
    BEGIN
      SELECT tier INTO user_tier
      FROM subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
      LIMIT 1;

      IF user_tier IS NULL THEN
        user_tier := 'free';
      END IF;

      tier_hierarchy := CASE user_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      required_tier_hierarchy := CASE _required_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      RETURN tier_hierarchy >= required_tier_hierarchy;
    END;
    $fn$;

  END IF;
END
$do$;


-- ==========================================
-- Migration: 20251025210550_4d8c952d-03ea-4e31-acda-465e56c59066.sql
-- ==========================================

-- Drop the old constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Add updated constraint with all notification types including booking-related ones
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text,
  'tender_deadline'::text,
  'new_signal'::text,
  'system'::text,
  'quote_received'::text,
  'quote_accepted'::text,
  'quote_declined'::text,
  'new_message'::text,
  'booking_request'::text,
  'booking_received'::text,
  'booking_accepted'::text,
  'booking_declined'::text,
  'booking_updated'::text,
  'booking_cancelled'::text,
  'counter_proposal_received'::text,
  'counter_proposal_accepted'::text,
  'booking_message'::text,
  'new_chat'::text
]));

-- ==========================================
-- Migration: 20251025211630_a3d53b48-334b-489d-931e-80dabd4807db.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251025214114_066c124a-5a15-4b9f-a9d8-609857842b8c.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251026172551_87b7af6a-f6d1-42a3-bc7b-339ba34cb721.sql
-- ==========================================

-- Add translation columns to maintenance_requests
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
ADD COLUMN IF NOT EXISTS full_name_en TEXT,
ADD COLUMN IF NOT EXISTS company_name_ar TEXT,
ADD COLUMN IF NOT EXISTS company_name_en TEXT,
ADD COLUMN IF NOT EXISTS bio_ar TEXT,
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS company_description_ar TEXT,
ADD COLUMN IF NOT EXISTS company_description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to quote_submissions
ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS proposal_ar TEXT,
ADD COLUMN IF NOT EXISTS proposal_en TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_ar TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_original_language ON maintenance_requests(original_language);
CREATE INDEX IF NOT EXISTS idx_profiles_original_language ON profiles(original_language);

-- ==========================================
-- Migration: 20251026174315_5cb5c768-6546-4876-9c56-cf4132966739.sql
-- ==========================================

-- Strip "Request #" from titles and descriptions
UPDATE maintenance_requests 
SET title = regexp_replace(title, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE title ~* 'Request\s*#';

UPDATE maintenance_requests 
SET description = regexp_replace(description, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE description ~* 'Request\s*#';

-- Normalize urgency from 'normal' to 'medium'
UPDATE maintenance_requests 
SET urgency = 'medium' 
WHERE urgency = 'normal';

-- Lower and round budgets for home services (many under 500 SAR)
UPDATE maintenance_requests
SET 
  estimated_budget_min = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100)::numeric
  END,
  estimated_budget_max = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100 + floor(random() * 3) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100 + floor(random() * 5 + 2) * 100)::numeric
  END
WHERE estimated_budget_min IS NOT NULL;

-- Update existing vendors for more diversity
UPDATE profiles SET
  discoverable = true,
  user_type = 'seller',
  availability_status = CASE 
    WHEN random() < 0.6 THEN 'accepting_requests'
    WHEN random() < 0.8 THEN 'busy'
    ELSE 'not_taking_work'
  END,
  verified_seller = random() < 0.4,
  seller_rating = CASE 
    WHEN random() < 0.3 THEN 0
    WHEN random() < 0.5 THEN NULL
    ELSE (random() * 2.4 + 2.5)::numeric(3,1)
  END,
  completed_projects = floor(random() * 41)::integer,
  full_name = CASE floor(random() * 15)
    WHEN 0 THEN 'Ahmed'
    WHEN 1 THEN 'Jomar'
    WHEN 2 THEN 'Anil'
    WHEN 3 THEN 'Mae'
    WHEN 4 THEN 'Priya'
    WHEN 5 THEN 'محمد'
    WHEN 6 THEN 'فاطمة'
    WHEN 7 THEN 'Ricardo'
    WHEN 8 THEN 'Joseph'
    WHEN 9 THEN 'Maria'
    WHEN 10 THEN 'Ali'
    WHEN 11 THEN 'Hassan'
    WHEN 12 THEN 'Omar'
    WHEN 13 THEN 'Yusuf'
    ELSE 'Khalid'
  END,
  company_name = CASE 
    WHEN random() < 0.4 THEN NULL
    WHEN random() < 0.6 THEN 'Service Co'
    WHEN random() < 0.8 THEN full_name || ' Services'
    ELSE NULL
  END,
  bio = CASE 
    WHEN random() < 0.3 THEN NULL
    ELSE 'Experienced professional'
  END,
  phone = CASE 
    WHEN random() < 0.2 THEN NULL
    ELSE '+966' || floor(random() * 900000000 + 500000000)::text
  END,
  response_time_hours = floor(random() * 48 + 1)::integer
WHERE user_type = 'seller' OR user_type = 'both';

-- Insert sample reviews for vendors with ratings > 0
INSERT INTO seller_reviews (seller_id, buyer_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM profiles WHERE user_type IN ('buyer', 'both') ORDER BY random() LIMIT 1),
  floor(random() * 2 + 4)::integer,
  CASE floor(random() * 8)
    WHEN 0 THEN 'Great service, very professional'
    WHEN 1 THEN 'Quick response and good quality work'
    WHEN 2 THEN 'Excellent work, highly recommend'
    WHEN 3 THEN 'Professional and efficient'
    WHEN 4 THEN 'Good value for money'
    WHEN 5 THEN 'Very satisfied with the service'
    WHEN 6 THEN 'Reliable and trustworthy'
    ELSE 'Would hire again'
  END,
  now() - (floor(random() * 180) || ' days')::interval
FROM profiles p
WHERE p.seller_rating > 0 
  AND p.seller_rating IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM seller_reviews WHERE seller_id = p.id)
LIMIT 20;

-- ==========================================
-- Migration: 20251026180555_b05e3c56-ba67-4d60-ac31-874545d52788.sql
-- ==========================================

-- Phase 1: Add system_generated flag to distinguish real users from mock data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_generated boolean DEFAULT false;

-- Phase 2A: Update existing 6 sellers with maximum diversity
-- First, let's identify and preserve real users by marking system_generated vendors

-- Vendor 1: Filipino freelancer - Mae
UPDATE public.profiles
SET 
  full_name = 'Mae',
  full_name_en = 'Mae',
  full_name_ar = 'ماي',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Experienced home helper for cleaning and small repairs',
  bio_en = 'Experienced home helper for cleaning and small repairs',
  bio_ar = 'عاملة منزلية ذات خبرة في التنظيف والإصلاحات الصغيرة',
  service_categories = ARRAY['cleaning', 'handyman'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 2,
  years_of_experience = 3,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 0);

-- Vendor 2: Indian technician - Anil Kumar
UPDATE public.profiles
SET 
  full_name = 'Anil Kumar',
  full_name_en = 'Anil Kumar',
  full_name_ar = 'أنيل كومار',
  company_name = 'Kumar Electrical Services',
  company_name_en = 'Kumar Electrical Services',
  company_name_ar = 'خدمات كومار الكهربائية',
  bio = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_en = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_ar = 'كهربائي مرخص مع 10 سنوات خبرة في المشاريع التجارية والسكنية',
  service_categories = ARRAY['electrical', 'appliance_repair'],
  verified_seller = true,
  seller_rating = 4.2,
  completed_projects = 8,
  years_of_experience = 10,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966501234567',
  crew_size_range = '1-5',
  certifications = ARRAY['Licensed Electrician', 'Safety Certified'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 1);

-- Vendor 3: Arabic contractor - Khalid
UPDATE public.profiles
SET 
  full_name = 'خالد',
  full_name_en = 'Khalid',
  full_name_ar = 'خالد',
  company_name = 'شركة الصيانة السريعة',
  company_name_en = 'Fast Maintenance Company',
  company_name_ar = 'شركة الصيانة السريعة',
  bio = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  bio_en = 'Maintenance company specialized in all plumbing and electrical work',
  bio_ar = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  service_categories = ARRAY['plumbing', 'electrical', 'hvac'],
  verified_seller = false,
  seller_rating = 3.8,
  completed_projects = 15,
  years_of_experience = 7,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966502345678',
  crew_size_range = '6-15',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 2);

-- Vendor 4: Filipino handyman - Jomar Santos
UPDATE public.profiles
SET 
  full_name = 'Jomar Santos',
  full_name_en = 'Jomar Santos',
  full_name_ar = 'جومار سانتوس',
  company_name = 'Santos Repairs',
  company_name_en = 'Santos Repairs',
  company_name_ar = 'إصلاحات سانتوس',
  bio = 'Family business providing handyman services for homes',
  bio_en = 'Family business providing handyman services for homes',
  bio_ar = 'شركة عائلية تقدم خدمات الصيانة المنزلية',
  service_categories = ARRAY['handyman', 'carpentry', 'painting'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 1,
  years_of_experience = 2,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966503456789',
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 3);

-- Vendor 5: Indian electrician - Priya
UPDATE public.profiles
SET 
  full_name = 'Priya',
  full_name_en = 'Priya',
  full_name_ar = 'بريا',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Specialist in home electrical repairs',
  bio_en = 'Specialist in home electrical repairs',
  bio_ar = 'متخصصة في إصلاحات الكهرباء المنزلية',
  service_categories = ARRAY['electrical'],
  verified_seller = true,
  seller_rating = 4.5,
  completed_projects = 23,
  years_of_experience = 6,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  certifications = ARRAY['Electrical License'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 4);

-- Vendor 6: Arabic plumber - Hassan
UPDATE public.profiles
SET 
  full_name = 'حسن',
  full_name_en = 'Hassan',
  full_name_ar = 'حسن',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = NULL,
  bio_en = NULL,
  bio_ar = NULL,
  service_categories = ARRAY['plumbing'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 0,
  years_of_experience = 1,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 5);

-- Insert sample reviews for vendors with ratings
INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 4
    WHEN p.full_name = 'خالد' THEN 4
    WHEN p.full_name = 'Priya' THEN 5
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Good work, professional service'
    WHEN p.full_name = 'خالد' THEN 'عمل جيد وسريع'
    WHEN p.full_name = 'Priya' THEN 'Excellent electrician, highly recommended'
  END,
  now() - (random() * interval '60 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;

INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 5
    WHEN p.full_name = 'خالد' THEN 3
    WHEN p.full_name = 'Priya' THEN 4
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Fixed our office electrical issues quickly'
    WHEN p.full_name = 'خالد' THEN 'خدمة جيدة لكن متأخر قليلاً'
    WHEN p.full_name = 'Priya' THEN 'Fast response and great work'
  END,
  now() - (random() * interval '30 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;

-- ==========================================
-- Migration: 20251026183926_20c59f98-e5ac-4070-b705-219f2d287891.sql
-- ==========================================

-- Delete all existing system-generated vendors
DELETE FROM public.profiles WHERE system_generated = true;

-- Update the 6 existing real vendor profiles to be realistic for Arab community
-- Get the 6 oldest seller profiles by ID (these are likely the original sellers)
WITH oldest_sellers AS (
  SELECT id 
  FROM public.profiles 
  WHERE user_type IN ('seller', 'both') 
    AND (system_generated = false OR system_generated IS NULL)
  ORDER BY id ASC 
  LIMIT 6
),
vendor_updates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM oldest_sellers
)
UPDATE public.profiles p
SET
  full_name = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_ar = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_en = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  original_language = CASE v.rn
    WHEN 1 THEN 'ar'
    WHEN 2 THEN 'ar'
    WHEN 3 THEN 'en'
    WHEN 4 THEN 'en'
    WHEN 5 THEN 'ar'
    WHEN 6 THEN 'ar'
  END,
  company_name = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_ar = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_en = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  bio = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_ar = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'عامل صيانة ذو خبرة'
    WHEN 4 THEN 'فني كهرباء مرخص بخبرة ١٠ سنوات'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_en = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'Electrician with 15 years experience'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'HVAC specialist'
    WHEN 6 THEN NULL
  END,
  service_categories = CASE v.rn
    WHEN 1 THEN ARRAY['plumbing']
    WHEN 2 THEN ARRAY['electrical']
    WHEN 3 THEN ARRAY['handyman', 'painting']
    WHEN 4 THEN ARRAY['electrical', 'appliance_repair']
    WHEN 5 THEN ARRAY['hvac']
    WHEN 6 THEN ARRAY['cleaning']
  END,
  verified_seller = CASE v.rn
    WHEN 2 THEN true
    WHEN 4 THEN true
    WHEN 6 THEN true
    ELSE false
  END,
  seller_rating = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 4.2
    WHEN 3 THEN 3.8
    WHEN 4 THEN 4.5
    WHEN 5 THEN 4.7
    WHEN 6 THEN 0
  END,
  completed_projects = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 8
    WHEN 3 THEN 5
    WHEN 4 THEN 23
    WHEN 5 THEN 15
    WHEN 6 THEN 0
  END,
  years_of_experience = CASE v.rn
    WHEN 1 THEN 3
    WHEN 2 THEN 15
    WHEN 3 THEN 7
    WHEN 4 THEN 10
    WHEN 5 THEN 12
    WHEN 6 THEN 2
  END,
  availability_status = 'accepting_requests',
  discoverable = true,
  system_generated = false
FROM vendor_updates v
WHERE p.id = v.id;

-- ==========================================
-- Migration: 20251026192545_a7b4e18e-fd5a-4b96-b19e-442af16381b5.sql
-- ==========================================

-- Update service_type based on category for legacy requests
UPDATE maintenance_requests
SET service_type = CASE
  WHEN category IN ('plumbing', 'electrical', 'hvac', 'painting', 'cleaning', 'handyman', 'appliances', 'landscaping_home', 'ac_repair') THEN 'home'
  WHEN category IN ('fitout', 'tiling', 'gypsum', 'carpentry', 'mep', 'waterproofing', 'landscaping_commercial', 'renovation') THEN 'project'
  ELSE service_type
END
WHERE service_type IS NULL;

-- Update tags.audience to match service_type
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{audience}',
  to_jsonb(service_type)
)
WHERE service_type IS NOT NULL 
  AND (tags->'audience' IS NULL OR tags->'audience'::text = 'null');

-- Update tags.service_category to match category
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{service_category}',
  to_jsonb(category)
)
WHERE category IS NOT NULL 
  AND (tags->'service_category' IS NULL OR tags->'service_category'::text = 'null');

-- ==========================================
-- Migration: 20251026194200_17025093-0f13-465d-a218-3d4a4e39b792.sql
-- ==========================================

-- Fix: Accepting a quote should transition the related maintenance request to a valid status
-- Update the trigger function to set status to 'in_progress' instead of invalid 'awarded'
CREATE OR REPLACE FUNCTION public.close_request_on_quote_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.maintenance_requests
       SET status = 'in_progress', updated_at = now()
     WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ==========================================
-- Migration: 20251027164211_2f8202e0-7ff4-4641-9e45-1b31da7aaed7.sql
-- ==========================================

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(id),
  quote_id UUID REFERENCES quote_submissions(id),
  booking_id UUID REFERENCES booking_requests(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | pending_buyer | pending_seller | pending_both | ready_to_sign | pending_signatures | fully_executed | completed | amended
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  buyer_accepted_version INTEGER,
  seller_accepted_version INTEGER,
  
  -- Language & content
  language_mode TEXT NOT NULL DEFAULT 'dual',
  -- dual | arabic_only | english_only
  html_snapshot TEXT,
  pdf_url TEXT,
  content_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for contracts
CREATE INDEX idx_contracts_buyer ON contracts(buyer_id);
CREATE INDEX idx_contracts_seller ON contracts(seller_id);
CREATE INDEX idx_contracts_request ON contracts(request_id);
CREATE INDEX idx_contracts_quote ON contracts(quote_id);
CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- RLS for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Both parties can update their contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create binding_terms table
CREATE TABLE public.binding_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Payment terms
  payment_schedule JSONB NOT NULL DEFAULT '{"deposit": 30, "progress": 40, "completion": 30}'::jsonb,
  use_deposit_escrow BOOLEAN DEFAULT false,
  
  -- Timeline
  start_date DATE,
  completion_date DATE,
  warranty_days INTEGER DEFAULT 90,
  
  -- Penalties & materials
  penalty_rate_per_day NUMERIC(10, 2),
  materials_by TEXT,
  
  -- Access & cleanup
  access_hours TEXT,
  cleanup_disposal BOOLEAN DEFAULT true,
  
  -- Additional terms
  custom_terms JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for binding_terms
ALTER TABLE binding_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terms for their contracts"
  ON binding_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Both parties can manage binding terms"
  ON binding_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_clauses table (Clause Library)
CREATE TABLE public.contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clause identification
  clause_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  service_tags TEXT[] DEFAULT '{}',
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  
  -- Merge variables
  variables TEXT[] DEFAULT '{}',
  
  -- Metadata
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for contract_clauses
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active clauses"
  ON contract_clauses FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage clauses"
  ON contract_clauses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create contract_versions table
CREATE TABLE public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Version content
  html_snapshot TEXT NOT NULL,
  binding_terms_snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  
  -- Changes
  changed_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  changes_diff JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, version)
);

-- RLS for contract_versions
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their contracts"
  ON contract_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_versions.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_signatures table
CREATE TABLE public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL,
  
  -- Signature details
  signature_method TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  otp_code TEXT,
  ip_address INET,
  user_agent TEXT,
  
  signed_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, user_id)
);

-- RLS for contract_signatures
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures on their contracts"
  ON contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_signatures.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can sign their own contracts"
  ON contract_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create contract_amendments table
CREATE TABLE public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL,
  
  -- Change details
  scope_delta TEXT,
  cost_delta NUMERIC(10, 2),
  time_delta INTEGER,
  
  -- Amendment contract
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  html_snapshot TEXT,
  pdf_url TEXT,
  
  -- Signatures
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(parent_contract_id, amendment_number)
);

-- RLS for contract_amendments
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendments to their contracts"
  ON contract_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_amendments.parent_contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Notification trigger for contract creation
CREATE OR REPLACE FUNCTION notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, notification_type, title, message, content_id)
  VALUES 
    (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id),
    (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_created
  AFTER INSERT ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_created();

-- Notification trigger for contract version updates
CREATE OR REPLACE FUNCTION notify_contract_version_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version > OLD.version THEN
    INSERT INTO notifications (user_id, notification_type, title, message, content_id)
    VALUES 
      (CASE WHEN NEW.status = 'pending_buyer' THEN NEW.buyer_id ELSE NEW.seller_id END,
       'contract_updated', 'Contract Updated', 'Contract has been updated to version ' || NEW.version, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_version_updated
  AFTER UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_version_updated();

-- ==========================================
-- Migration: 20251027171335_68e2d2cf-f7e0-4c7b-b809-9f5c5f1b2437.sql
-- ==========================================


-- Clean up orphaned data (Fix Plan Option A) - handling foreign keys
-- First, delete related messages for orphaned bookings and quotes
DELETE FROM messages 
WHERE booking_id IN (
  SELECT id FROM booking_requests 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

DELETE FROM messages 
WHERE quote_id IN (
  SELECT id FROM quote_submissions 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

-- Now delete orphaned quotes and bookings
DELETE FROM quote_submissions 
WHERE seller_id NOT IN (SELECT id FROM profiles);

DELETE FROM booking_requests 
WHERE seller_id NOT IN (SELECT id FROM profiles);

-- Add comments documenting new status options for contract integration
COMMENT ON COLUMN quote_submissions.status IS 'Status: pending, accepted, rejected, negotiating, contract_pending, contract_accepted';
COMMENT ON COLUMN booking_requests.status IS 'Status: pending, accepted, declined, counter_proposed, cancelled, buyer_countered, completed, contract_pending, contract_accepted';


-- ==========================================
-- Migration: 20251027173423_0b67e25f-781e-4ff2-841f-b3b3dc7f0ea1.sql
-- ==========================================

-- Phase 1: Backfill missing profiles for all users referenced in the system
-- This creates profile records for any user IDs that exist in quotes, requests, bookings, or contracts
-- but don't have a profile entry yet

INSERT INTO public.profiles (id, system_generated, created_at, updated_at)
SELECT DISTINCT u_id, true, now(), now()
FROM (
  SELECT seller_id as u_id FROM public.quote_submissions WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.maintenance_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.booking_requests WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.booking_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.contracts WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.contracts WHERE seller_id IS NOT NULL
) x
LEFT JOIN public.profiles p ON p.id = x.u_id
WHERE p.id IS NULL;

-- ==========================================
-- Migration: 20251027174510_51bdc42b-c963-4192-98bc-0169183e8abb.sql
-- ==========================================

-- Phase 1: Fix RLS Policy for Contract Creation
-- Drop the existing restrictive policy that only allows buyers
DROP POLICY IF EXISTS "Buyers can create contracts" ON contracts;

-- Create a new policy that allows both buyers and sellers to create contracts
CREATE POLICY "Both parties can create contracts" 
ON contracts 
FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- ==========================================
-- Migration: 20251027180153_27bdfbdf-ec74-4a31-844f-abed0a3906a5.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251029142618_81240ff7-7b58-4538-ad67-8b2754be683d.sql
-- ==========================================

-- Add signature_data column to profiles table for electronic signatures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.signature_data IS 'Electronic signature data: {type: "drawn"|"typed"|"uploaded", data: base64_string, created_at: timestamp, full_name: string}';

-- Create index for faster signature lookups
CREATE INDEX IF NOT EXISTS idx_profiles_signature_data ON public.profiles USING GIN (signature_data) WHERE signature_data IS NOT NULL;

-- ==========================================
-- Migration: 20251030105750_1d680a6b-7e7c-4660-9328-710432f848da.sql
-- ==========================================

-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  excerpt_en TEXT NOT NULL,
  excerpt_ar TEXT,
  content_en TEXT NOT NULL,
  content_ar TEXT,
  featured_image_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_name TEXT NOT NULL DEFAULT 'MaintMENA Team',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  views_count INTEGER NOT NULL DEFAULT 0,
  seo_title_en TEXT,
  seo_title_ar TEXT,
  seo_description_en TEXT,
  seo_description_ar TEXT,
  seo_keywords TEXT,
  reading_time_minutes INTEGER DEFAULT 5
);

-- Enable Row Level Security
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published blogs
CREATE POLICY "Anyone can view published blogs" 
ON public.blogs 
FOR SELECT 
USING (status = 'published');

-- Create policy for admins to manage all blogs
CREATE POLICY "Admins can manage all blogs" 
ON public.blogs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_published_at ON public.blogs(published_at DESC);
CREATE INDEX idx_blogs_category ON public.blogs(category);
CREATE INDEX idx_blogs_status ON public.blogs(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Migration: 20251031162927_7c396555-3c90-444a-b69b-faee5aecb26e.sql
-- ==========================================

-- Drop and recreate handle_new_user function WITHOUT subscription logic
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- ==========================================
-- Migration: 20251031163016_dc554ec5-9321-43d1-8b0c-e600cc0c4aac.sql
-- ==========================================



-- ==========================================
-- Migration: 20251031163414_1dbca92b-9520-4e48-9cd9-b2a6857c2692.sql
-- ==========================================

-- Clean up legacy 'user' roles from user_roles table
-- Only keep buyer, buyer_individual, seller, and admin roles
DELETE FROM public.user_roles 
WHERE role NOT IN ('buyer', 'buyer_individual', 'seller', 'admin');

-- ==========================================
-- Migration: 20251101160911_40fb8082-d826-4447-912b-dcd678e3202d.sql
-- ==========================================

-- Add missing payment_method column
ALTER TABLE public.maintenance_requests 
ADD COLUMN payment_method text;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Buyers can manage their own requests" ON public.maintenance_requests;

-- Create policy for INSERT
CREATE POLICY "Buyers can create their own requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for SELECT
CREATE POLICY "Buyers can view their own requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- Create policy for UPDATE
CREATE POLICY "Buyers can update their own requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for DELETE
CREATE POLICY "Buyers can delete their own requests"
ON public.maintenance_requests
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

-- ==========================================
-- Migration: 20251101174959_faa70904-e077-4b93-add8-6648fc86e65c.sql
-- ==========================================

-- Update handle_new_user function to handle all role assignments WITHOUT subscriptions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role app_role;
  buyer_account_type text;
BEGIN
  -- Get user type and buyer type from metadata
  user_role := (NEW.raw_user_meta_data->>'user_type')::app_role;
  buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';

  -- Create or update profile with data from metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      user_type    = EXCLUDED.user_type,
      phone        = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      buyer_type   = EXCLUDED.buyer_type;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assign the main user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If buyer with individual type, also add buyer_individual role
    IF user_role = 'buyer' AND buyer_account_type = 'individual' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'buyer_individual')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- ==========================================
-- Migration: 20251101182734_a63c9d0a-96d5-4212-8e47-4eaecbfdc022.sql
-- ==========================================

-- Ensure the trigger exists to call handle_new_user on auth.users insert
-- This trigger creates user profiles, roles, and trial subscriptions at signup

-- Drop existing trigger if it exists (to ensure clean recreation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==========================================
-- Migration: 20251102202645_9b50a35c-3e0b-41d6-ad93-d64c95994b6a.sql
-- ==========================================

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
CREATE POLICY "Users can view own verification tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage all tokens"
  ON public.email_verification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_email_verification_tokens_updated_at
  BEFORE UPDATE ON public.email_verification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user function WITHOUT subscription logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role app_role;
  buyer_account_type text;
BEGIN
  -- Get user type and buyer type from metadata
  user_role := (NEW.raw_user_meta_data->>'user_type')::app_role;
  buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';

  -- Create or update profile with data from metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      user_type    = EXCLUDED.user_type,
      phone        = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      buyer_type   = EXCLUDED.buyer_type;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assign the main user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If buyer with individual type, also add buyer_individual role
    IF user_role = 'buyer' AND buyer_account_type = 'individual' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'buyer_individual')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- ==========================================
-- Migration: 20251112153933_34f30311-e66b-418c-9e10-26ef128fedd3.sql
-- ==========================================


-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_ar TEXT,
  excerpt TEXT NOT NULL,
  excerpt_ar TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  category TEXT NOT NULL,
  category_ar TEXT,
  tags TEXT[] DEFAULT '{}',
  tags_ar TEXT[] DEFAULT '{}',
  author_name TEXT NOT NULL,
  author_name_ar TEXT,
  author_avatar TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reading_time INTEGER DEFAULT 5,
  featured_image TEXT,
  views INTEGER DEFAULT 0,
  meta_description TEXT,
  meta_description_ar TEXT,
  meta_keywords TEXT[] DEFAULT '{}',
  meta_keywords_ar TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Blog posts are viewable by everyone" 
ON public.blog_posts 
FOR SELECT 
USING (published = true);

-- Create policy for authenticated users to view all posts (including unpublished)
CREATE POLICY "Authenticated users can view all blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- ==========================================
-- Migration: 20251113103855_a40802fd-1cc4-4f1f-ac9f-465815138755.sql
-- ==========================================

-- Add block-based editor fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS blocks_en JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blocks_ar JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.blogs.blocks_en IS 'JSON array of content blocks for English version';
COMMENT ON COLUMN public.blogs.blocks_ar IS 'JSON array of content blocks for Arabic version';
COMMENT ON COLUMN public.blogs.scheduled_at IS 'Scheduled publish date/time';


-- ==========================================
-- Migration: 20251126165003_d339195c-6afd-4a36-8a1c-61799d564355.sql
-- ==========================================

-- Create saved_vendors table for buyers to save their favorite service providers
CREATE TABLE IF NOT EXISTS public.saved_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.saved_vendors ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own saved vendors
CREATE POLICY "Buyers can view their saved vendors"
  ON public.saved_vendors
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Buyers can save vendors
CREATE POLICY "Buyers can save vendors"
  ON public.saved_vendors
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can unsave vendors
CREATE POLICY "Buyers can unsave vendors"
  ON public.saved_vendors
  FOR DELETE
  USING (auth.uid() = buyer_id);

-- Add index for performance
CREATE INDEX idx_saved_vendors_buyer_id ON public.saved_vendors(buyer_id);
CREATE INDEX idx_saved_vendors_seller_id ON public.saved_vendors(seller_id);

-- ==========================================
-- Migration: 20251126170624_6e32e479-df2f-4fc2-90fd-c9910381792a.sql
-- ==========================================

-- Create saved_buyers table for sellers to save buyers they want to work with
CREATE TABLE IF NOT EXISTS public.saved_buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.saved_buyers ENABLE ROW LEVEL SECURITY;

-- Sellers can save buyers
CREATE POLICY "Sellers can save buyers"
ON public.saved_buyers
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can unsave buyers
CREATE POLICY "Sellers can unsave buyers"
ON public.saved_buyers
FOR DELETE
USING (auth.uid() = seller_id);

-- Sellers can view their saved buyers
CREATE POLICY "Sellers can view their saved buyers"
ON public.saved_buyers
FOR SELECT
USING (auth.uid() = seller_id);

-- ==========================================
-- Migration: 20251126173159_0d3662ee-3e0d-43d1-8fef-f47878e2fa3b.sql
-- ==========================================

-- Add RLS policy to allow sellers to view buyer profiles in business contexts
-- This allows sellers to see buyer info for requests they're viewing/quoting on

CREATE POLICY "Sellers can view buyer profiles for public requests"
ON public.profiles
FOR SELECT
USING (
  -- Allow viewing profiles of buyers who have public maintenance requests
  EXISTS (
    SELECT 1 
    FROM maintenance_requests mr 
    WHERE mr.buyer_id = profiles.id 
    AND mr.visibility = 'public'
    AND mr.status = 'open'
  )
);

-- Add policy to allow buyers to view seller profiles that are discoverable
CREATE POLICY "Buyers can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'seller' 
  AND (discoverable = true OR discoverable IS NULL)
);

-- ==========================================
-- Migration: 20251126175633_63298916-f0b4-44ae-9f04-db0f32ea47a7.sql
-- ==========================================

-- Fix RLS policies for profiles table to allow viewing discoverable seller profiles
DROP POLICY IF EXISTS "Buyers can view discoverable seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sellers can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view discoverable seller profiles" ON public.profiles;

-- Create comprehensive policy for viewing seller profiles
CREATE POLICY "Anyone can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  (user_type IN ('seller', 'both')) 
  AND (discoverable = true OR discoverable IS NULL)
);

-- ==========================================
-- Migration: 20251126180042_87012318-c487-473c-af7d-daa2feb476ea.sql
-- ==========================================

-- Drop the previous policy
DROP POLICY IF EXISTS "Anyone can view discoverable seller profiles" ON public.profiles;

-- Create a comprehensive policy that works for both authenticated and anonymous users
CREATE POLICY "Authenticated users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable IS NOT FALSE)
);

-- Also allow anonymous users to view discoverable sellers
CREATE POLICY "Anonymous users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO anon
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable = true)
);

-- ==========================================
-- Migration: 20251126184602_fb8ba4c9-d46a-4f4d-9f67-66428d215d06.sql
-- ==========================================

-- Add avatar_seed column to profiles table for custom avatar selection
ALTER TABLE public.profiles 
ADD COLUMN avatar_seed TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.avatar_seed IS 'Custom avatar seed for DiceBear API (e.g., warrior, hero, explorer)';

-- Ensure user_preferences table has SAR as default currency
-- Check if table exists and add default if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    -- Add default to preferred_currency if column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences' 
      AND column_name = 'preferred_currency'
    ) THEN
      ALTER TABLE public.user_preferences 
      ALTER COLUMN preferred_currency SET DEFAULT 'SAR';
    END IF;
  END IF;
END $$;

-- ==========================================
-- Migration: 20251127092413_4bb5cf04-da82-4e1e-a906-b36eb55418de.sql
-- ==========================================

-- Add completion tracking fields to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add completion tracking fields to booking_requests
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_seller ON maintenance_requests(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_completion ON maintenance_requests(buyer_marked_complete, seller_marked_complete);
CREATE INDEX IF NOT EXISTS idx_booking_requests_completion ON booking_requests(buyer_marked_complete, seller_marked_complete);

-- ==========================================
-- Migration: 20251127142341_f3ca56fd-ce72-4fc1-95f8-0a0d7d66c99a.sql
-- ==========================================

-- Add halted status support to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Add halted status support to booking_requests
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- ==========================================
-- Migration: 20251128081623_83c0ed7a-67a7-47d0-a663-030a879168aa.sql
-- ==========================================

-- Add new columns to profiles table for services, cities, and user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services_pricing jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_cities text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'SAR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_date_format text DEFAULT 'gregorian';

COMMENT ON COLUMN profiles.services_pricing IS 'JSON array storing service pricing info: { category: string, price: number, duration: string, available: boolean }[]';
COMMENT ON COLUMN profiles.service_cities IS 'Array of city names the seller serves';
COMMENT ON COLUMN profiles.preferred_currency IS 'User preferred currency (SAR, USD, etc)';
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants email notifications';
COMMENT ON COLUMN profiles.preferred_date_format IS 'Date format preference: gregorian or hijri';

-- ==========================================
-- Migration: 20251128083522_77316f4f-541d-4388-89a2-9e59e167933b.sql
-- ==========================================

-- Phase 1: Critical RLS & Database Security (Fixed)

-- 1. Strengthen profiles RLS - only expose limited seller info publicly
CREATE POLICY "Public can view limited seller profiles"
ON profiles FOR SELECT
USING (
  user_type = 'seller' 
  AND discoverable = true
);

-- 2. Add transaction verification for reviews
CREATE POLICY "Reviews require completed transaction"
ON seller_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.buyer_id = auth.uid()
    AND contracts.seller_id = seller_reviews.seller_id
    AND contracts.status = 'executed'
  ) OR EXISTS (
    SELECT 1 FROM booking_requests
    WHERE booking_requests.buyer_id = auth.uid()
    AND booking_requests.seller_id = seller_reviews.seller_id
    AND booking_requests.status = 'completed'
    AND booking_requests.buyer_marked_complete = true
    AND booking_requests.seller_marked_complete = true
  )
);

-- 3. Prevent self-assignment of admin role
CREATE POLICY "Prevent self-assignment of admin role"
ON user_roles FOR INSERT
WITH CHECK (
  role != 'admin' OR 
  has_role(auth.uid(), 'admin')
);

-- 4. Add audit logging trigger for contracts (drop first if exists)
DROP TRIGGER IF EXISTS audit_contract_changes ON contracts;

CREATE OR REPLACE FUNCTION log_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    old_data, 
    new_data,
    ip_address
  ) VALUES (
    auth.uid(), 
    TG_OP, 
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD), 
    to_jsonb(NEW),
    inet_client_addr()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_contract_changes
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION log_contract_changes();

-- 5. Add content hash verification column
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS content_hash_verified boolean DEFAULT false;

-- 6. Add profile visibility controls
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'limited'));

-- ==========================================
-- Migration: 20251128121130_dd2d6bd4-3efb-4d9d-bbf0-8b55be8da0c4.sql
-- ==========================================

-- ================================================
-- PRE-PUBLICATION SECURITY & PERFORMANCE FIXES
-- ================================================

-- 1. Fix Subscription RLS - Prevent Self-Upgrade


-- 2. Add Performance Indexes
-- Index for maintenance_requests queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id 
ON maintenance_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status 
ON maintenance_requests(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_city 
ON maintenance_requests(city);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category 
ON maintenance_requests(category);

-- Index for quote_submissions queries
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id 
ON quote_submissions(seller_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id 
ON quote_submissions(request_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_status 
ON quote_submissions(status);

-- Index for booking_requests queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_id 
ON booking_requests(seller_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_buyer_id 
ON booking_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status 
ON booking_requests(status);

-- Index for messages queries
CREATE INDEX IF NOT EXISTS idx_messages_quote_id 
ON messages(quote_id);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id 
ON messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

-- Index for contracts queries
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_id 
ON contracts(buyer_id);

CREATE INDEX IF NOT EXISTS idx_contracts_seller_id 
ON contracts(seller_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status 
ON contracts(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_status 
ON maintenance_requests(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_status 
ON quote_submissions(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_status 
ON booking_requests(seller_id, status);

-- ==========================================
-- Migration: 20251128150525_5216ffb0-6592-4214-8422-4edf4343c3da.sql
-- ==========================================

-- Update RLS policy to allow deletion of open and in_review requests
DROP POLICY IF EXISTS "Buyers can cancel their own requests" ON maintenance_requests;

CREATE POLICY "Buyers can delete their open or in-review requests"
ON maintenance_requests
FOR DELETE
USING (
  auth.uid() = buyer_id 
  AND status IN ('open', 'in_review')
);

-- ==========================================
-- Migration: 20251129080312_a34c2a18-2f96-4e76-a347-551947121e46.sql
-- ==========================================

-- Add contract negotiation columns
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS proposed_edits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edit_notes TEXT;

-- ==========================================
-- Migration: 20251129101537_a0652e0b-d2a1-4557-87e5-80b3e8d3e47d.sql
-- ==========================================

-- Drop the seller_public_profiles view to fix SECURITY DEFINER security issue
-- This view was not being used in the application code and bypasses RLS policies
DROP VIEW IF EXISTS public.seller_public_profiles;

-- ==========================================
-- Migration: 20251129102309_1196e2aa-0605-4847-8c0d-670c16f25e6f.sql
-- ==========================================

-- Add version column to booking_requests for optimistic locking
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index on version for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_version ON booking_requests(id, version);

-- Create function to update booking with optimistic locking
CREATE OR REPLACE FUNCTION update_booking_with_lock(
  p_booking_id UUID,
  p_new_status TEXT,
  p_expected_version INTEGER,
  p_updates JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, current_version INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
  v_current_version INTEGER;
BEGIN
  -- Attempt to update with version check
  UPDATE booking_requests
  SET 
    status = p_new_status,
    version = version + 1,
    updated_at = now(),
    -- Apply additional updates from JSONB if provided
    seller_response = COALESCE((p_updates->>'seller_response')::TEXT, seller_response),
    seller_counter_proposal = COALESCE((p_updates->>'seller_counter_proposal')::JSONB, seller_counter_proposal),
    buyer_counter_proposal = COALESCE((p_updates->>'buyer_counter_proposal')::JSONB, buyer_counter_proposal),
    responded_at = CASE WHEN p_new_status IN ('accepted', 'declined', 'counter_proposed') THEN now() ELSE responded_at END
  WHERE id = p_booking_id 
    AND version = p_expected_version
  RETURNING version INTO v_current_version;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RETURN QUERY SELECT true, v_current_version;
  ELSE
    -- Get current version to return to caller
    SELECT version INTO v_current_version FROM booking_requests WHERE id = p_booking_id;
    RETURN QUERY SELECT false, COALESCE(v_current_version, p_expected_version);
  END IF;
END;
$$;

-- ==========================================
-- Migration: 20251201174738_1fd5e097-7c06-4797-a07e-863f149f17c5.sql
-- ==========================================

-- Phase 1: Add unique constraints to prevent duplicate contracts
CREATE UNIQUE INDEX contracts_request_id_unique 
ON contracts (request_id) 
WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX contracts_booking_id_unique 
ON contracts (booking_id) 
WHERE booking_id IS NOT NULL;

-- ==========================================
-- Migration: 20251201181749_2707c516-9c5b-4c73-95f5-3a283b82b4e2.sql
-- ==========================================

-- Add RLS policy to allow sellers to view maintenance_requests for their executed contracts
-- This fixes the issue where sellers can't see active jobs because requests change status from 'open' to 'in_progress'

CREATE POLICY "Sellers can view requests for their executed contracts"
ON maintenance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.request_id = maintenance_requests.id
    AND contracts.seller_id = auth.uid()
    AND contracts.status = 'executed'
  )
);

-- ==========================================
-- Migration: 20251201185318_6dbe7b50-0aa3-4b5b-9270-8dbb04216e06.sql
-- ==========================================

-- Phase 1: Fix corrupted data - update requests where contract is executed but request isn't
UPDATE maintenance_requests mr
SET 
  status = 'in_progress',
  assigned_seller_id = c.seller_id
FROM contracts c
WHERE c.request_id = mr.id
  AND c.status = 'executed'
  AND (mr.status != 'in_progress' OR mr.assigned_seller_id IS NULL);

-- Phase 2: Trigger to automatically activate jobs when contract is executed
CREATE OR REPLACE FUNCTION activate_job_on_contract_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- When contract becomes executed, update the associated request/booking
  IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
    IF NEW.request_id IS NOT NULL THEN
      UPDATE maintenance_requests
      SET status = 'in_progress',
          assigned_seller_id = NEW.seller_id,
          updated_at = now()
      WHERE id = NEW.request_id;
    END IF;
    
    IF NEW.booking_id IS NOT NULL THEN
      UPDATE booking_requests
      SET status = 'accepted',
          updated_at = now()
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_executed
  AFTER UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION activate_job_on_contract_execution();

-- Phase 3: Constraint to prevent invalid contract execution
CREATE OR REPLACE FUNCTION prevent_invalid_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent setting status to 'executed' without both signatures
  IF NEW.status = 'executed' AND (NEW.signed_at_buyer IS NULL OR NEW.signed_at_seller IS NULL) THEN
    RAISE EXCEPTION 'Cannot execute contract without both signatures';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_contract_execution
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invalid_execution();

-- ==========================================
-- Migration: 20251201193939_609515ff-686e-4e12-8cff-701a6fc81203.sql
-- ==========================================

-- Add RLS policy to allow assigned sellers to update their jobs
CREATE POLICY "Assigned sellers can update job status"
ON maintenance_requests
FOR UPDATE
USING (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
)
WITH CHECK (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
);

-- ==========================================
-- Migration: 20251202192711_b833478c-ea36-45cc-949c-f8ec37305120.sql
-- ==========================================

-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view attachments in messages they have access to
CREATE POLICY "Users can view message attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- RLS policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ==========================================
-- Migration: 20251202193809_a0dfa166-4dd5-4786-802e-b0737807e643.sql
-- ==========================================

-- Add payload column to messages table for attachments (images, files, location)
ALTER TABLE public.messages 
ADD COLUMN payload jsonb DEFAULT NULL;

-- ==========================================
-- Migration: 20251203132244_7312dbb8-3cf0-4f9b-9f6e-301b7a015eb2.sql
-- ==========================================

-- Update message-attachments bucket to be public for file access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';

-- ==========================================
-- Migration: 20251206101033_2d6efc7f-12ba-4aa8-81a5-3942e9de7193.sql
-- ==========================================

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

-- ==========================================
-- Migration: 20251207165250_7921cfc3-7f9d-47ea-9f49-e447ae38c52a.sql
-- ==========================================

-- Add resolution approval columns for dual-party resolution
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

-- Create user_addresses table for address management
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  full_address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own addresses
CREATE POLICY "Users can view own addresses" ON public.user_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON public.user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON public.user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON public.user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-resolve halted jobs when both parties approve
CREATE OR REPLACE FUNCTION public.auto_resolve_halted_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_approved_resolution = true AND NEW.seller_approved_resolution = true AND NEW.halted = true THEN
    NEW.halted := false;
    NEW.resolved_at := now();
    NEW.buyer_approved_resolution := false;
    NEW.seller_approved_resolution := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for auto-resolution
DROP TRIGGER IF EXISTS auto_resolve_booking_halted ON booking_requests;
CREATE TRIGGER auto_resolve_booking_halted
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();

DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
CREATE TRIGGER auto_resolve_request_halted
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();

-- ==========================================
-- Migration: 20251211152731_6cec84e3-b7d9-42a0-9778-ddec20b79a60.sql
-- ==========================================

-- Create function to increment seller completed projects when both parties confirm
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- For maintenance_requests, use assigned_seller_id
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    -- For booking_requests, use seller_id
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Create trigger for booking_requests
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;
CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Also update verified_reviews_count when a review is added
CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  -- Check if seller reached 10 reviews - award founding member badge
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for seller_reviews
DROP TRIGGER IF EXISTS increment_reviews_count ON seller_reviews;
CREATE TRIGGER increment_reviews_count
  AFTER INSERT ON seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_reviews_count();

-- ==========================================
-- Migration: 20251211152744_dbe52de7-6573-436b-bc1d-582ab34af964.sql
-- ==========================================

-- Fix search_path for functions
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM public.profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE public.profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- Migration: 20251213142301_19b6b51f-f11a-406f-a2e8-ad1d3360d4cc.sql
-- ==========================================

-- Add RLS policy for buyers to mark their maintenance_requests as complete
CREATE POLICY "Buyers can mark their requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'in_progress')
WITH CHECK (auth.uid() = buyer_id AND status = 'in_progress');

-- Also add a policy for updating status to completed when buyer_marked_complete is true
CREATE POLICY "Buyers can complete their in_progress requests"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND assigned_seller_id IS NOT NULL)
WITH CHECK (auth.uid() = buyer_id);

-- ==========================================
-- Migration: 20251213144851_c0a1e06b-8bef-4d2d-b1fc-099a4bebbf43.sql
-- ==========================================

-- RLS policy to allow buyers to mark their in_progress requests as complete
CREATE POLICY "Buyers can mark their in_progress requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (
  auth.uid() = buyer_id 
  AND status = 'in_progress'
  AND assigned_seller_id IS NOT NULL
)
WITH CHECK (
  auth.uid() = buyer_id
);

-- ==========================================
-- Migration: 20251213151210_10ad7bcd-3093-4f61-9e6c-66a305046a5a.sql
-- ==========================================

-- Allow sellers to delete their own pending quotes
CREATE POLICY "Sellers can delete their own pending quotes"
ON public.quote_submissions
FOR DELETE
USING (auth.uid() = seller_id AND status = 'pending');

-- ==========================================
-- Migration: 20251220175800_add_revision_request_columns.sql
-- ==========================================

-- Add revision request columns to quote_submissions table
-- These columns support the simplified "Ask for Revision" flow

ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;

-- Add 'revision_requested' to the valid status values
-- First, check if the status column is using an enum type
-- If using text, this comment documents the valid values:
-- Valid statuses: 'pending', 'revision_requested', 'accepted', 'rejected'

COMMENT ON COLUMN quote_submissions.revision_message IS 'Message from buyer explaining what changes they want to the quote';
COMMENT ON COLUMN quote_submissions.revision_requested_at IS 'Timestamp when buyer requested a revision';


-- ==========================================
-- Migration: 20251222120000_add_journey_stage_tracking.sql
-- ==========================================

-- Add stage tracking columns to track what stage each user has last seen
-- This enables the "dopamine timeline" feature that shows progress animations
-- only when users reach NEW stages they haven't seen before

-- Track buyer and seller progress visibility for booking flows
ALTER TABLE booking_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Track buyer and seller progress visibility for request/quote flows
ALTER TABLE maintenance_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN booking_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN booking_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';


-- ==========================================
-- Migration: 20251222230000_reload_schema.sql
-- ==========================================

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';


-- ==========================================
-- Migration: 20251222_update_quote_submissions.sql
-- ==========================================

-- Add start_date and attachments columns to quote_submissions table
ALTER TABLE "public"."quote_submissions" 
ADD COLUMN IF NOT EXISTS "start_date" date,
ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;

-- Create a storage bucket for quote attachments if it doesn't exist
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('quote-attachments', 'quote-attachments', true)
ON CONFLICT ("id") DO NOTHING;

-- Set up security policies for the storage bucket (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Quote attachments are publicly accessible" ON "storage"."objects";
CREATE POLICY "Quote attachments are publicly accessible" ON "storage"."objects"
  FOR SELECT USING (bucket_id = 'quote-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload quote attachments" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload quote attachments" ON "storage"."objects"
  FOR INSERT WITH CHECK (bucket_id = 'quote-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can update their own quote attachments" ON "storage"."objects"
  FOR UPDATE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can delete their own quote attachments" ON "storage"."objects"
  FOR DELETE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);


-- ==========================================
-- Migration: 20251223120000_enable_public_profiles.sql
-- ==========================================

-- Enable read access for all authenticated users to view profiles
-- This is necessary for buyers to see seller information (name, avatar, rating) in quotes.

create policy "Profiles are viewable by everyone"
on "public"."profiles"
for select
to authenticated
using ( true );

-- Also allow public access if needed for unauthenticated views (optional, but sticking to authenticated for now)
-- If the app allows unauthenticated browsing of requests/quotes, we might need 'public' role too.


-- ==========================================
-- Migration: 20251223130000_auto_confirm_users.sql
-- ==========================================

-- Create a function to auto-confirm users
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$;

-- Create a trigger that runs before the user is inserted
drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute procedure public.auto_confirm_user();


-- ==========================================
-- Migration: 20251223230000_fix_audit_logs.sql
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);

-- RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to admins
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Allow system/triggers to insert (auth.uid() might be null for system actions, but usually triggers run as user)
-- Since the function is SECURITY DEFINER, we don't strictly need a policy for the trigger if it bypasses RLS,
-- but standard insert policy for safety:
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);


-- ==========================================
-- Migration: 20251224_fix_booking_status_check_v2.sql
-- ==========================================

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


-- ==========================================
-- Migration: 20251225_add_request_photos.sql
-- ==========================================

-- Create storage bucket for request photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-photos',
  'request-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote_attachments',
  'quote_attachments', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Users can upload request photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quote attachments" ON storage.objects;

-- Allow authenticated users to upload to their own folder (request-photos)
CREATE POLICY "Users can upload request photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (request-photos)
CREATE POLICY "Public read access for request photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'request-photos');

-- Allow users to delete their own photos (request-photos)
CREATE POLICY "Users can delete own request photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload to their own folder (quote_attachments)
CREATE POLICY "Users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (quote_attachments)
CREATE POLICY "Public read access for quote attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote_attachments');

-- Allow users to delete their own attachments (quote_attachments)
CREATE POLICY "Users can delete own quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add photos column to maintenance_requests if it doesn't exist
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;

-- Add attachments column to quote_submissions if it doesn't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT NULL;


-- ==========================================
-- Migration: 20251226_add_booking_photos.sql
-- ==========================================

-- Add photos column to booking_requests if it doesn't exist
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;


-- ==========================================
-- Migration: 20251226_add_revision_requested_status.sql
-- ==========================================

-- Add 'revision_requested' to quote_submissions status check constraint
-- This allows buyers to request revisions to seller quotes

-- Drop the existing constraint
ALTER TABLE quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

-- Add the updated constraint with revision_requested
ALTER TABLE quote_submissions ADD CONSTRAINT quote_submissions_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'revision_requested', 'expired', 'withdrawn'));

-- Also add the revision_message and revision_requested_at columns if they don't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;


-- ==========================================
-- Migration: 20251226_quote_previous_values.sql
-- ==========================================

-- Add columns to store previous quote values before revision
-- This allows showing the difference when seller updates the quote

ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS previous_duration TEXT,
ADD COLUMN IF NOT EXISTS previous_proposal TEXT;


-- ==========================================
-- Migration: 20251226_quote_update_policy.sql
-- ==========================================

-- Add RLS policy for sellers to update their own quotes
-- This allows sellers to update quote_submissions where they are the seller

-- First, ensure RLS is enabled on the table
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Sellers can update their own quotes" ON quote_submissions;

-- Create update policy for sellers
CREATE POLICY "Sellers can update their own quotes" ON quote_submissions
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Also add select policy for sellers if not exists
DROP POLICY IF EXISTS "Sellers can view their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can view their own quotes" ON quote_submissions
FOR SELECT
USING (seller_id = auth.uid());

-- Buyers should also be able to view quotes for their requests
DROP POLICY IF EXISTS "Buyers can view quotes for their requests" ON quote_submissions;
CREATE POLICY "Buyers can view quotes for their requests" ON quote_submissions
FOR SELECT
USING (
  request_id IN (
    SELECT id FROM maintenance_requests WHERE buyer_id = auth.uid()
  )
);

-- Add DELETE policy for sellers to delete their own quotes
DROP POLICY IF EXISTS "Sellers can delete their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can delete their own quotes" ON quote_submissions
FOR DELETE
USING (seller_id = auth.uid());


-- ==========================================
-- Migration: 20251227_buyer_completion_policy.sql
-- ==========================================

-- DIAGNOSTIC: Find and fix ALL triggers on maintenance_requests that reference seller_id
-- The error is: 'record "new" has no field "seller_id"'

-- Step 1: List all triggers on maintenance_requests (run this first to see what exists)
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'maintenance_requests';

-- Step 2: Drop ALL potential problematic triggers on maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
DROP TRIGGER IF EXISTS activate_request_warranty ON maintenance_requests;
DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_update_seller_stats ON maintenance_requests;
DROP TRIGGER IF EXISTS update_seller_stats_trigger ON maintenance_requests;
DROP TRIGGER IF EXISTS update_completed_projects_trigger ON maintenance_requests;

-- Also drop triggers on booking_requests for consistency  
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;

-- Step 3: Drop ALL functions that might reference seller_id incorrectly
DROP FUNCTION IF EXISTS increment_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS update_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS increment_completed_projects() CASCADE;

-- Step 4: Recreate the function with CORRECT column references
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
DECLARE
  seller_id_val uuid;
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- Determine the seller ID based on table name
    IF TG_TABLE_NAME = 'maintenance_requests' THEN
      seller_id_val := NEW.assigned_seller_id;
    ELSIF TG_TABLE_NAME = 'booking_requests' THEN
      seller_id_val := NEW.seller_id;
    ELSE
      seller_id_val := NULL;
    END IF;
    
    -- Update seller's completed projects count
    IF seller_id_val IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = seller_id_val;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Recreate triggers
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Step 6: Fix the activate_warranty_on_completion function if it exists
DROP FUNCTION IF EXISTS activate_warranty_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION activate_warranty_on_completion()
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

-- Recreate warranty triggers
CREATE TRIGGER activate_request_warranty
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

CREATE TRIGGER activate_booking_warranty
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

-- Step 7: Add RLS policies for buyer completion updates
DROP POLICY IF EXISTS "Buyers can mark requests complete" ON maintenance_requests;
DROP POLICY IF EXISTS "Buyers can mark bookings complete" ON booking_requests;

CREATE POLICY "Buyers can mark requests complete"
ON maintenance_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can mark bookings complete"
ON booking_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());


-- ==========================================
-- Migration: 20251227_contract_withdraw_policy.sql
-- ==========================================

-- Migration: Allow buyers to delete contracts in pending_seller status
-- This enables the "Withdraw Signature" feature

-- Drop existing delete policy if any
DROP POLICY IF EXISTS "Buyers can delete pending_seller contracts" ON contracts;

-- Allow buyers to delete their own contracts when status is pending_seller
CREATE POLICY "Buyers can delete pending_seller contracts"
ON contracts
FOR DELETE
TO authenticated
USING (
  buyer_id = auth.uid() 
  AND status = 'pending_seller'
);

-- Also allow deleting binding_terms for contracts being withdrawn
DROP POLICY IF EXISTS "Users can delete binding_terms for their contracts" ON binding_terms;

CREATE POLICY "Users can delete binding_terms for their contracts"
ON binding_terms
FOR DELETE
TO authenticated
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE buyer_id = auth.uid() 
    OR seller_id = auth.uid()
  )
);

-- Allow users to insert notifications for other parties in their contracts
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;

CREATE POLICY "Users can notify other parties in contracts"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can insert notifications for sellers in contracts where user is the buyer
  user_id IN (
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
  )
);


-- ==========================================
-- Migration: 20251227_create_reviews.sql
-- ==========================================

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    reviewed_id UUID NOT NULL REFERENCES public.profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reviews_contract_id ON public.reviews(contract_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert reviews for their contracts" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.id = contract_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT TO public
    USING (true);


-- ==========================================
-- Migration: 20251227_fix_duplicate_notifications.sql
-- ==========================================

-- Drop duplicate triggers found in previous migrations
DROP TRIGGER IF EXISTS on_contract_created ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Improved notification function that checks auth.uid()
CREATE OR REPLACE FUNCTION public.notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify seller if they didn't create it (prevent self-notification)
  IF NEW.seller_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id);
  END IF;

  -- Notify buyer if they didn't create it (prevent self-notification)
  IF NEW.buyer_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate single trigger for creation
CREATE TRIGGER on_contract_created_notify
  AFTER INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_created();

-- Recreate single trigger for updates (ensuring no duplicates there either)
CREATE TRIGGER on_contract_version_updated_notify
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_version_updated();


-- ==========================================
-- Migration: 20251229_comprehensive_notification_policy.sql
-- ==========================================

-- Migration: Comprehensive notification insert policy for all users
-- Fixes 403 Forbidden error when trying to send notifications

-- Drop all existing insert policies for notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

-- Create a comprehensive policy that allows authenticated users to insert notifications
-- for parties they have legitimate business relationships with
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create notification for anyone they have a relationship with:
  user_id IN (
    -- Sellers in contracts where user is buyer
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in contracts where user is seller
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
    UNION
    -- Sellers in bookings where user is buyer
    SELECT seller_id FROM booking_requests WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in bookings where user is seller
    SELECT buyer_id FROM booking_requests WHERE seller_id = auth.uid()
    UNION
    -- Buyers who made requests the user quoted
    SELECT mr.buyer_id FROM maintenance_requests mr
    JOIN quote_submissions qs ON qs.request_id = mr.id
    WHERE qs.seller_id = auth.uid()
    UNION
    -- Sellers who quoted on user's requests
    SELECT qs.seller_id FROM quote_submissions qs
    JOIN maintenance_requests mr ON qs.request_id = mr.id
    WHERE mr.buyer_id = auth.uid()
    UNION
    -- User can also create notifications for themselves
    SELECT auth.uid()
  )
);


-- ==========================================
-- Migration: 20251229_disable_contract_notification_triggers.sql
-- ==========================================

-- Migration: Disable contract creation notification triggers to prevent duplicates
-- The front-end handles contract notifications now with duplicate prevention

-- Drop the contract creation notification trigger
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;

-- Drop the contract version updated notification trigger
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Optional: Keep the functions but they won't be triggered
-- This allows re-enabling if needed later


-- ==========================================
-- Migration: 20251230_contract_completion_policy.sql
-- ==========================================

-- Allow buyers and sellers to update contract status to 'completed'
-- This is necessary for the contract progress tracker to show the correct completion state

-- Policy for updating contracts
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;

CREATE POLICY "Users can update their own contracts"
ON contracts
FOR UPDATE
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
)
WITH CHECK (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
);


-- ==========================================
-- Migration: 20251230_fix_calendar_event_trigger.sql
-- ==========================================

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


-- ==========================================
-- Migration: 20251231_fix_contract_status.sql
-- ==========================================

-- Fix contract statuses based on signature timestamps
-- This normalizes contracts where the status doesn't match the signature state
-- Contracts where buyer signed but seller hasn't -> should be pending_seller
UPDATE contracts
SET status = 'pending_seller'
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NULL
    AND status NOT IN (
        'pending_seller',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where seller signed but buyer hasn't -> should be pending_buyer
UPDATE contracts
SET status = 'pending_buyer'
WHERE signed_at_seller IS NOT NULL
    AND signed_at_buyer IS NULL
    AND status NOT IN (
        'pending_buyer',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where both signed but not executed -> should be executed
UPDATE contracts
SET status = 'executed',
    executed_at = COALESCE(
        executed_at,
        GREATEST(signed_at_buyer, signed_at_seller)
    )
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NOT NULL
    AND status NOT IN (
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );

-- ==========================================
-- Migration: 20251231_normalize_contract_status.sql
-- ==========================================

-- Migration: Update old 'active' contracts to 'executed'
-- This migration normalizes all contract statuses to use the modern 'executed' value
-- Step 1: Update all contracts with status='active' to status='executed'
UPDATE contracts
SET status = 'executed',
    updated_at = NOW()
WHERE status = 'active';
-- Verify the update (optional, for logging)
-- SELECT COUNT(*) as updated_count FROM contracts WHERE status = 'executed';

-- ==========================================
-- Migration: 20260102_add_contract_id_to_reviews.sql
-- ==========================================

-- Add contract_id column to seller_reviews for better duplicate prevention
ALTER TABLE public.seller_reviews
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE
SET NULL;
-- Create unique constraint to prevent duplicate reviews per contract
-- This ensures only one review per contract
CREATE UNIQUE INDEX IF NOT EXISTS seller_reviews_contract_id_unique ON public.seller_reviews (contract_id)
WHERE contract_id IS NOT NULL;
-- Also create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_reviews_contract_id ON public.seller_reviews(contract_id);

-- ==========================================
-- Migration: 20260103_fix_booking_notifications.sql
-- ==========================================

-- Comprehensive cleanup of booking notification triggers
DO $$ BEGIN -- Drop all known variations of booking status triggers
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_booking_status_change_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_seller_booking_request_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_notification_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_request_updated ON public.booking_requests';
END $$;
-- Redefine the notification function to use valid keys and cleaner logic
CREATE OR REPLACE FUNCTION public.notify_booking_status_change() RETURNS TRIGGER AS $$ BEGIN -- New booking created
    IF TG_OP = 'INSERT' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_received',
        'booking_received',
        'booking_received',
        NEW.id
    );
RETURN NEW;
END IF;
-- Status changed
IF OLD.status IS DISTINCT
FROM NEW.status THEN -- Only notify on specific status changes
    IF NEW.status = 'accepted' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_accepted',
        'booking_accepted',
        'booking_accepted',
        NEW.id
    );
ELSIF NEW.status = 'declined' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_declined',
        'booking_declined',
        'booking_declined',
        NEW.id
    );
ELSIF NEW.status = 'cancelled' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_cancelled',
        'booking_cancelled',
        'booking_cancelled',
        NEW.id
    );
ELSIF NEW.status = 'counter_proposed' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'counter_proposal_received',
        'counter_proposal_received',
        'counter_proposal_received',
        NEW.id
    );
ELSIF NEW.status = 'buyer_countered' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'buyer_counter_received',
        'buyer_counter_received',
        'buyer_counter_received',
        NEW.id
    );
ELSIF OLD.status = 'pending'
AND NEW.status != 'pending' THEN -- Catch-all for other updates from pending (e.g. detailed updates)
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_updated',
        'booking_updated',
        'booking_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Recreate Single Trigger with V2 name to ensure uniqueness
CREATE TRIGGER on_booking_status_change_v2
AFTER
INSERT
    OR
UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- ==========================================
-- Migration: 20260103_quote_update_notification.sql
-- ==========================================

-- Create notification trigger for quote updates (seller updates a quote)
-- This notifies the buyer when their quote has been modified
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_quote_update ON public.quote_submissions;
-- Function to create notification when quote is updated
CREATE OR REPLACE FUNCTION public.notify_quote_update() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE buyer_id UUID;
request_title TEXT;
BEGIN -- Only trigger if meaningful fields changed (price, description, duration, status)
IF (
    OLD.price IS DISTINCT
    FROM NEW.price
        OR OLD.description IS DISTINCT
    FROM NEW.description
        OR OLD.proposal IS DISTINCT
    FROM NEW.proposal
        OR OLD.estimated_duration IS DISTINCT
    FROM NEW.estimated_duration
        OR OLD.start_date IS DISTINCT
    FROM NEW.start_date
        OR (
            OLD.status = 'revision_requested'
            AND NEW.status = 'pending'
        )
) THEN -- Get buyer_id and request title
SELECT mr.buyer_id,
    COALESCE(mr.title, 'your request') INTO buyer_id,
    request_title
FROM maintenance_requests mr
WHERE mr.id = NEW.request_id;
-- Create notification for buyer using localization keys
IF buyer_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        content_id
    )
VALUES (
        buyer_id,
        'quote_updated',
        -- Use type as title for client-side translation
        'quote_updated',
        -- Use type as message for client-side translation
        'quote_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Create trigger for quote updates
CREATE TRIGGER on_quote_update
AFTER
UPDATE ON public.quote_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_quote_update();

-- ==========================================
-- Migration: 20260106_user_reports.sql
-- ==========================================

-- Create user_reports table for content moderation
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        content_type TEXT NOT NULL,
        -- 'profile', 'message', 'quote', 'request', 'booking', 'image'
        content_id UUID NOT NULL,
        -- ID of the reported item
        reported_user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        -- Who is being reported
        reason TEXT NOT NULL,
        -- 'inappropriate_image', 'harassment', 'spam', 'scam', 'other'
        details TEXT,
        -- User's additional context
        evidence_urls TEXT [],
        -- Optional screenshot URLs
        status TEXT DEFAULT 'pending' CHECK (
            status IN ('pending', 'reviewed', 'resolved', 'dismissed')
        ),
        resolution_notes TEXT,
        resolved_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
-- Policy: Any authenticated user can insert a report
CREATE POLICY "Users can create reports" ON public.user_reports FOR
INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.user_reports FOR
SELECT TO authenticated USING (auth.uid() = reporter_id);
-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.user_reports FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- Policy: Admins can update reports
CREATE POLICY "Admins can update reports" ON public.user_reports FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- Trigger for updated_at
CREATE TRIGGER update_user_reports_updated_at BEFORE
UPDATE ON public.user_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- Migration: 20260108_rollback_job_issues.sql
-- ==========================================

-- ROLLBACK SCRIPT 
-- Run this in Supabase SQL Editor to undo all changes from the Job Issue Resolution System
-- 1. Drop Tables (Cascade to remove policies and indexes)
DROP TABLE IF EXISTS job_issues CASCADE;
DROP TABLE IF EXISTS job_events CASCADE;
-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS raise_issue;
DROP FUNCTION IF EXISTS respond_to_issue;
DROP FUNCTION IF EXISTS close_issue;
DROP FUNCTION IF EXISTS reopen_issue;
-- 3. Drop Helper Functions
DROP FUNCTION IF EXISTS map_outcome_to_type;
DROP FUNCTION IF EXISTS calculate_issue_deadline;
DROP FUNCTION IF EXISTS capture_context_snapshot;
DROP FUNCTION IF EXISTS is_issue_counterparty;
DROP FUNCTION IF EXISTS is_job_participant;
-- 4. Drop Processing Functions
DROP FUNCTION IF EXISTS process_issue_timeouts;
DROP FUNCTION IF EXISTS update_seller_reliability;
-- 5. Remove Columns from Profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS reliability_rate,
    DROP COLUMN IF EXISTS total_jobs_30d,
    DROP COLUMN IF EXISTS incidents_30d,
    DROP COLUMN IF EXISTS on_time_rate,
    DROP COLUMN IF EXISTS first_issue_raised_at,
    DROP COLUMN IF EXISTS first_issue_received_at;
-- Confirmation
SELECT 'Rollback successful: Job Issue System removed' as result;

-- ==========================================
-- Migration: 20260208_seller_online_status.sql
-- ==========================================

-- Migration: Add seller online status tracking fields
-- Required for the seller home state-machine (online toggle and time tracking)
-- Add is_online field to track seller availability
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
-- Add went_online_at to track when seller went online (for time tracking)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMPTZ;
-- Add service_radius to track seller's coverage area (in km)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 5;
-- Create index for finding online sellers efficiently  
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles (is_online)
WHERE is_online = true;
-- Add comment for documentation
COMMENT ON COLUMN profiles.is_online IS 'Whether the seller is currently active and accepting job opportunities';
COMMENT ON COLUMN profiles.went_online_at IS 'Timestamp when the seller last went online, used for calculating time online';
COMMENT ON COLUMN profiles.service_radius IS 'Service radius in kilometers for opportunity matching';

-- ==========================================
-- Migration: 20260227_matching_pricing_tables.sql
-- ==========================================

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
-- 1. Pricing & Financial Data Models
CREATE TABLE IF NOT EXISTS fee_policy_versions (
    id text PRIMARY KEY,
    fee_mode text NOT NULL,
    -- 'free_intro', 'flat_fee', 'performance_fee'
    flat_fee_amount numeric,
    performance_model_key text,
    is_active boolean DEFAULT false,
    starts_at timestamptz DEFAULT now(),
    ends_at timestamptz,
    notes text
);
CREATE TABLE IF NOT EXISTS category_pricing_bands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id text NOT NULL,
    subcategory_id text,
    city_id text,
    display_mode text NOT NULL DEFAULT 'range',
    -- 'range', 'inspection', 'starts_from'
    min_amount numeric,
    max_amount numeric,
    starts_from_amount numeric,
    uncertainty_level text DEFAULT 'medium',
    -- 'low', 'medium', 'high'
    buyer_note text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_financials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL UNIQUE,
    seller_id uuid REFERENCES auth.users(id),
    -- Price inputs
    seller_estimate_accept_amount numeric,
    seller_final_claim_amount numeric,
    buyer_confirmed_paid_amount numeric,
    -- Fee outputs
    fee_model_version text REFERENCES fee_policy_versions(id),
    fee_mode text,
    fee_trigger text,
    actual_fee_amount numeric DEFAULT 0,
    simulated_fee_amount numeric,
    provider_net_amount numeric,
    -- Derived metrics
    est_to_buyer_gap_amount numeric,
    est_to_buyer_gap_pct numeric,
    seller_to_buyer_gap_amount numeric,
    seller_to_buyer_gap_pct numeric,
    pricing_outcome_status text,
    calculated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- 2. Dispatch Data Models
CREATE TABLE IF NOT EXISTS job_dispatch_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    -- 'booking' or 'request'
    dispatch_status text DEFAULT 'pending_match',
    -- 'pending_match', 'dispatching_wave_1', 'awaiting_seller_response', 'assignment_confirmed', 'no_seller_found', 'dispatch_cancelled'
    current_wave_number int DEFAULT 0,
    eligible_count_initial int DEFAULT 0,
    accepted_seller_id uuid REFERENCES auth.users(id),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(job_id, job_type)
);
CREATE TABLE IF NOT EXISTS job_dispatch_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_session_id uuid REFERENCES job_dispatch_sessions(id) ON DELETE CASCADE,
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    wave_number int NOT NULL,
    rank_position_at_send int,
    match_score_at_send numeric,
    offer_status text DEFAULT 'sent',
    -- 'sent', 'delivered', 'seen', 'declined', 'expired', 'accepted', 'auto_closed'
    sent_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    responded_at timestamptz,
    response_type text,
    decline_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(dispatch_session_id, seller_id)
);
-- RLS Policies
ALTER TABLE fee_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_offers ENABLE ROW LEVEL SECURITY;
-- Allow read access for category pricing to everyone
CREATE POLICY "Pricing bands are readable by everyone" ON category_pricing_bands FOR
SELECT USING (true);
-- Allow authenticated users to view dispatch offers sent to them
CREATE POLICY "Sellers can view their own dispatch offers" ON job_dispatch_offers FOR
SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Sellers can update their own dispatch offers" ON job_dispatch_offers FOR
UPDATE TO authenticated USING (seller_id = auth.uid());
-- Buyers can view dispatch sessions they initiated (checked via accepted_seller_id or auth)
CREATE POLICY "Authenticated users can view dispatch sessions" ON job_dispatch_sessions FOR
SELECT TO authenticated USING (true);
-- Function to handle atomic job acceptance (Race Condition Lock)
-- NOTE: The job status update (maintenance_requests/booking_requests) is handled in app code
CREATE OR REPLACE FUNCTION accept_job_offer(p_offer_id uuid, p_seller_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_job_id uuid;
v_job_type text;
v_offer_status text;
v_session_status text;
BEGIN -- 1. Lock the offer row and check its status
SELECT dispatch_session_id,
    job_id,
    job_type,
    offer_status INTO v_session_id,
    v_job_id,
    v_job_type,
    v_offer_status
FROM job_dispatch_offers
WHERE id = p_offer_id
    AND seller_id = p_seller_id FOR
UPDATE;
IF v_offer_status IS NULL THEN RAISE EXCEPTION 'Offer not found';
END IF;
IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN RAISE EXCEPTION 'Offer is no longer available (status: %)',
v_offer_status;
END IF;
-- 2. Lock the session row to prevent race conditions
SELECT dispatch_status INTO v_session_status
FROM job_dispatch_sessions
WHERE id = v_session_id FOR
UPDATE;
IF v_session_status = 'assignment_confirmed' THEN -- Another seller already accepted this job
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE id = p_offer_id;
RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- 3. We are the winner! Update the session
UPDATE job_dispatch_sessions
SET dispatch_status = 'assignment_confirmed',
    accepted_seller_id = p_seller_id,
    ended_at = now(),
    updated_at = now()
WHERE id = v_session_id;
-- 4. Update the winning offer
UPDATE job_dispatch_offers
SET offer_status = 'accepted',
    responded_at = now(),
    response_type = 'accept',
    updated_at = now()
WHERE id = p_offer_id;
-- 5. Auto-close all other offers for this session
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE dispatch_session_id = v_session_id
    AND id != p_offer_id
    AND offer_status IN ('sent', 'delivered', 'seen');
-- Return job info so app code can update the job record
RETURN jsonb_build_object(
    'accepted',
    true,
    'job_id',
    v_job_id,
    'job_type',
    v_job_type,
    'session_id',
    v_session_id
);
END;
$$;
-- Function to create a dispatch session and insert offers for given seller IDs
-- Seller ranking/filtering is done in app code; this just records the dispatch
CREATE OR REPLACE FUNCTION start_job_dispatch(
        p_job_id uuid,
        p_job_type text,
        p_seller_ids uuid [],
        p_wave_size int DEFAULT 3
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_seller_id uuid;
v_rank int := 0;
v_eligible_count int;
BEGIN -- 1. Create Dispatch Session
INSERT INTO job_dispatch_sessions (
        job_id,
        job_type,
        dispatch_status,
        current_wave_number
    )
VALUES (p_job_id, p_job_type, 'dispatching_wave_1', 1)
RETURNING id INTO v_session_id;
-- 2. Insert offers for each seller (up to wave_size)
FOREACH v_seller_id IN ARRAY p_seller_ids LOOP v_rank := v_rank + 1;
EXIT
WHEN v_rank > p_wave_size;
INSERT INTO job_dispatch_offers (
        dispatch_session_id,
        job_id,
        job_type,
        seller_id,
        wave_number,
        rank_position_at_send,
        offer_status,
        expires_at
    )
VALUES (
        v_session_id,
        p_job_id,
        p_job_type,
        v_seller_id,
        1,
        v_rank,
        'sent',
        now() + interval '3 minutes'
    );
END LOOP;
-- 3. Update eligible count
SELECT count(*) INTO v_eligible_count
FROM job_dispatch_offers
WHERE dispatch_session_id = v_session_id;
UPDATE job_dispatch_sessions
SET eligible_count_initial = v_eligible_count
WHERE id = v_session_id;
IF v_eligible_count = 0 THEN
UPDATE job_dispatch_sessions
SET dispatch_status = 'no_seller_found',
    ended_at = now()
WHERE id = v_session_id;
END IF;
RETURN v_session_id;
END;
$$;
-- 3. Insert Initial Bootstrapping Data for Pricing Bands
INSERT INTO category_pricing_bands (
        category_id,
        display_mode,
        min_amount,
        max_amount,
        starts_from_amount,
        uncertainty_level
    )
VALUES ('Plumbing', 'range', 100, 300, 100, 'medium'),
    ('Electrical', 'range', 150, 400, 150, 'medium'),
    (
        'Cleaning',
        'starts_from',
        null,
        null,
        150,
        'low'
    ),
    (
        'AC Maintenance',
        'starts_from',
        null,
        null,
        120,
        'low'
    );
-- Seed Phase 0 Fee Policy
INSERT INTO fee_policy_versions (id, fee_mode, is_active, notes)
VALUES (
        'v1_free_intro',
        'free_intro',
        true,
        'Introductory period, no actual fees charged'
    );

-- ==========================================
-- Migration: all_migrations_combined.temp.sql
-- ==========================================



-- File: 20240127_atomic_job_submission.sql

-- Function to handle atomic job submission
CREATE OR REPLACE FUNCTION public.create_maintenance_request(
        request_data jsonb,
        template_sections jsonb DEFAULT null
    ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_request_id uuid;
result_record jsonb;
BEGIN -- 1. Insert the Maintenance Request
INSERT INTO public.maintenance_requests (
        buyer_id,
        title,
        description,
        title_en,
        title_ar,
        description_en,
        description_ar,
        original_language,
        category,
        service_type,
        location,
        country,
        city,
        urgency,
        budget,
        estimated_budget_min,
        estimated_budget_max,
        deadline,
        preferred_start_date,
        project_duration_days,
        facility_type,
        scope_of_work,
        payment_method,
        tags,
        status,
        visibility,
        latitude,
        longitude
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        request_data->>'title',
        request_data->>'description',
        request_data->>'title_en',
        request_data->>'title_ar',
        request_data->>'description_en',
        request_data->>'description_ar',
        request_data->>'original_language',
        request_data->>'category',
        request_data->>'service_type',
        request_data->>'location',
        request_data->>'country',
        request_data->>'city',
        request_data->>'urgency',
        (request_data->>'budget')::numeric,
        (request_data->>'estimated_budget_min')::numeric,
        (request_data->>'estimated_budget_max')::numeric,
        (request_data->>'deadline')::timestamptz,
        (request_data->>'preferred_start_date')::timestamptz,
        (request_data->>'project_duration_days')::int,
        request_data->>'facility_type',
        request_data->>'scope_of_work',
        request_data->>'payment_method',
        (request_data->'tags')::jsonb,
        'open',
        'public',
        (request_data->>'latitude')::float,
        (request_data->>'longitude')::float
    )
RETURNING id INTO new_request_id;
-- 2. Insert Quote Template (if provided)
IF template_sections IS NOT NULL THEN
INSERT INTO public.request_quote_templates (
        request_id,
        sections,
        created_by
    )
VALUES (
        new_request_id,
        template_sections,
        (request_data->>'buyer_id')::uuid
    );
END IF;
-- 3. Auto-track the item for the buyer
INSERT INTO public.tracked_items (
        user_id,
        item_id,
        item_type
    )
VALUES (
        (request_data->>'buyer_id')::uuid,
        new_request_id,
        'request'
    );
-- Return the new ID
result_record := jsonb_build_object('id', new_request_id);
RETURN result_record;
END;
$$;

-- File: 20240127_geofencing.sql

-- Add geolocation columns to maintenance_requests
ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS latitude float,
    ADD COLUMN IF NOT EXISTS longitude float;
-- Index for geospatial queries (optional but good for future)
CREATE INDEX IF NOT EXISTS maintenance_requests_location_idx ON public.maintenance_requests (latitude, longitude);

-- File: 20240127_quote_stats.sql

-- Function to get quote statistics for a request
CREATE OR REPLACE FUNCTION public.get_quote_stats(request_uuid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE avg_price numeric;
min_price numeric;
max_price numeric;
quote_count int;
BEGIN
SELECT AVG(price),
    MIN(price),
    MAX(price),
    COUNT(*) INTO avg_price,
    min_price,
    max_price,
    quote_count
FROM public.quote_submissions
WHERE request_id = request_uuid
    AND status != 'rejected';
RETURN jsonb_build_object(
    'average_price',
    COALESCE(avg_price, 0),
    'min_price',
    COALESCE(min_price, 0),
    'max_price',
    COALESCE(max_price, 0),
    'count',
    quote_count
);
END;
$$;

-- File: 20240127_weighted_ratings.sql

-- Add columns for weighted ratings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS effective_rating float DEFAULT 0,
    ADD COLUMN IF NOT EXISTS high_value_badge boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_rating_recalc timestamp with time zone;
-- Function to calculate weighted rating
CREATE OR REPLACE FUNCTION public.calculate_seller_rating(seller_uuid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE total_weight float := 0;
weighted_sum float := 0;
review_record RECORD;
review_age_days int;
weight float;
-- High Value Stats
high_value_count int := 0;
high_value_sum float := 0;
is_high_value boolean := false;
BEGIN -- Loop through all reviews for this seller
FOR review_record IN
SELECT r.rating,
    r.created_at,
    m.budget
FROM public.seller_reviews r
    LEFT JOIN public.maintenance_requests m ON r.request_id = m.id
WHERE r.seller_id = seller_uuid LOOP -- Calculate Age in Days
    review_age_days := EXTRACT(
        DAY
        FROM (NOW() - review_record.created_at)
    );
-- Determine Weight based on Recency
IF review_age_days < 90 THEN weight := 1.0;
ELSIF review_age_days < 180 THEN weight := 0.8;
ELSE weight := 0.5;
END IF;
-- Add to sums
weighted_sum := weighted_sum + (review_record.rating * weight);
total_weight := total_weight + weight;
-- High Value Logic (Jobs > 1000)
IF review_record.budget IS NOT NULL
AND review_record.budget > 1000 THEN high_value_count := high_value_count + 1;
high_value_sum := high_value_sum + review_record.rating;
END IF;
END LOOP;
-- Determine High Value Badge (e.g., > 5 high value jobs with > 4.5 avg)
IF high_value_count >= 5
AND (high_value_sum / high_value_count) >= 4.5 THEN is_high_value := true;
END IF;
-- Update Profile
UPDATE public.profiles
SET effective_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    seller_rating = CASE
        WHEN total_weight > 0 THEN (weighted_sum / total_weight)
        ELSE 0
    END,
    -- Sync legacy column for now
    high_value_badge = is_high_value,
    last_rating_recalc = NOW()
WHERE id = seller_uuid;
END;
$$;
-- Trigger to run on review changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_rating() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN IF (TG_OP = 'DELETE') THEN PERFORM public.calculate_seller_rating(OLD.seller_id);
ELSE PERFORM public.calculate_seller_rating(NEW.seller_id);
END IF;
RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS on_review_change ON public.seller_reviews;
CREATE TRIGGER on_review_change
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.seller_reviews FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_rating();

-- File: 20240128_cascade_delete_quotes.sql

-- Fix orphaned quotes: Add CASCADE delete for quote_submissions
-- When a maintenance_request is deleted, all related quotes should also be deleted
-- Step 1: Drop existing constraint (if exists)
ALTER TABLE public.quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_request_id_fkey;
-- Step 2: Re-add with CASCADE
ALTER TABLE public.quote_submissions
ADD CONSTRAINT quote_submissions_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;
-- Also cascade for messages tied to quotes
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_quote_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quote_submissions(id) ON DELETE CASCADE;
-- And tracked_items
ALTER TABLE public.tracked_items DROP CONSTRAINT IF EXISTS tracked_items_item_id_fkey;
-- tracked_items is polymorphic (item_type can be 'request' or 'tender'), 
-- so we can't add a simple FK. We'll clean up via trigger instead.
-- Cleanup trigger for tracked_items when request is deleted
CREATE OR REPLACE FUNCTION public.cleanup_tracked_items_on_request_delete() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM public.tracked_items
WHERE item_id = OLD.id
    AND item_type = 'request';
RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trigger_cleanup_tracked_items ON public.maintenance_requests;
CREATE TRIGGER trigger_cleanup_tracked_items BEFORE DELETE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.cleanup_tracked_items_on_request_delete();

-- File: 20251003162043_874f9c2d-e003-43fe-af95-1b2f0ab9e024.sql

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'user' role to new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- File: 20251003162058_6bb6184c-196f-4ad1-835d-2f7863ab19e1.sql

-- Fix search_path for update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- File: 20251003174530_6ce6c0b5-c470-453c-b982-d816a69136ee.sql

-- Only configure subscriptions / realtime if the table actually exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  ) THEN
    -- Ensure subscriptions table emits full rows for realtime and is added to publication
    ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

    -- Backfill missing subscriptions with 14-day trial on professional
    INSERT INTO public.subscriptions (user_id, tier, status, trial_ends_at)
    SELECT u.id, 'professional', 'active', now() + interval '14 days'
    FROM auth.users u
    LEFT JOIN public.subscriptions s ON s.user_id = u.id
    WHERE s.user_id IS NULL;
  END IF;
END
$$;

-- Create trigger to populate profiles, roles and subscriptions for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- Backfill missing profiles
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill missing user roles with default 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;



-- File: 20251003175149_64fc081b-f915-4fbb-8e7c-6cc4daa11f8f.sql

-- Create briefs table
CREATE TABLE public.briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  publication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_briefs_publication_date ON public.briefs(publication_date DESC);
CREATE INDEX idx_briefs_status ON public.briefs(status);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published briefs"
  ON public.briefs FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage all briefs"
  ON public.briefs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create signals table
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  estimated_value TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  location TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_signals_deadline ON public.signals(deadline);
CREATE INDEX idx_signals_urgency ON public.signals(urgency);
CREATE INDEX idx_signals_status ON public.signals(status);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Admins can manage all signals"
  ON public.signals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create tenders table
CREATE TABLE public.tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  value_min DECIMAL,
  value_max DECIMAL,
  submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  requirements TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenders_deadline ON public.tenders(submission_deadline);
CREATE INDEX idx_tenders_status ON public.tenders(status);
CREATE INDEX idx_tenders_category ON public.tenders(category);

ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open tenders"
  ON public.tenders FOR SELECT
  USING (status = 'open');

CREATE POLICY "Admins can manage all tenders"
  ON public.tenders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create educational_content table
CREATE TABLE public.educational_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'webinar', 'article', 'course')),
  thumbnail_url TEXT,
  video_url TEXT,
  transcript_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'free' CHECK (access_tier IN ('free', 'basic', 'professional', 'enterprise')),
  views_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_educational_content_category ON public.educational_content(category);
CREATE INDEX idx_educational_content_access_tier ON public.educational_content(access_tier);

ALTER TABLE public.educational_content ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can manage all educational content"
  ON public.educational_content FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create key_contacts table
CREATE TABLE public.key_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT NOT NULL,
  department TEXT,
  phone TEXT,
  email TEXT,
  recent_activity TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_key_contacts_company ON public.key_contacts(company);

ALTER TABLE public.key_contacts ENABLE ROW LEVEL SECURITY;



CREATE POLICY "Admins can manage all key contacts"
  ON public.key_contacts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create user_activity table
CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('brief_read', 'signal_view', 'tender_view', 'content_watch', 'signal_bookmark', 'tender_bookmark')),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('brief', 'signal', 'tender', 'educational_content')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_type ON public.user_activity(activity_type);
CREATE INDEX idx_user_activity_content ON public.user_activity(content_type, content_id);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity"
  ON public.user_activity FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create user_preferences table
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_interests TEXT[],
  notification_settings JSONB DEFAULT '{"email": true, "push": false, "new_briefs": true, "tender_deadlines": true, "new_signals": true}'::jsonb,
  content_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_brief', 'tender_deadline', 'new_signal', 'system')),
  content_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add update triggers for updated_at columns
CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON public.briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_signals_updated_at
  BEFORE UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tenders_updated_at
  BEFORE UPDATE ON public.tenders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_educational_content_updated_at
  BEFORE UPDATE ON public.educational_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_key_contacts_updated_at
  BEFORE UPDATE ON public.key_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for content tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.briefs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.educational_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- File: 20251003180317_08083f6e-4cf0-4d4e-bc0d-9b92e3f1a6d8.sql

-- Fix security issues: Restrict public access to sensitive tables

-- Drop the overly permissive policy on key_contacts
DROP POLICY IF EXISTS "Anyone can view key contacts" ON public.key_contacts;

-- Create authenticated-only policy for key_contacts
CREATE POLICY "Authenticated users can view key contacts"
  ON public.key_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the overly permissive policy on signals
DROP POLICY IF EXISTS "Anyone can view active signals" ON public.signals;

-- Create authenticated-only policy for signals
CREATE POLICY "Authenticated users can view active signals"
  ON public.signals FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Similarly restrict tenders to authenticated users only
DROP POLICY IF EXISTS "Anyone can view open tenders" ON public.tenders;

CREATE POLICY "Authenticated users can view open tenders"
  ON public.tenders FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'open');

-- File: 20251003183222_99a5b5bb-61a7-44c4-b906-6335412736ba.sql

-- Add tags column to briefs table
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create junction table for briefs and signals
CREATE TABLE IF NOT EXISTS public.brief_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, signal_id)
);

-- Create junction table for briefs and tenders
CREATE TABLE IF NOT EXISTS public.brief_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, tender_id)
);

-- Enable RLS on junction tables
ALTER TABLE public.brief_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_tenders ENABLE ROW LEVEL SECURITY;

-- RLS policies for brief_signals
CREATE POLICY "Admins can manage brief signals" ON public.brief_signals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief signals" ON public.brief_signals
FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS policies for brief_tenders
CREATE POLICY "Admins can manage brief tenders" ON public.brief_tenders
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief tenders" ON public.brief_tenders
FOR SELECT USING (auth.uid() IS NOT NULL);

-- File: 20251004051016_8b0411d8-a652-46af-8467-e5cd922799e3.sql

-- Create templates_guides table
CREATE TABLE public.templates_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'published',
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates_guides ENABLE ROW LEVEL SECURITY;

-- Policies for templates_guides
CREATE POLICY "Admins can manage all templates/guides"
ON public.templates_guides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Create industry_reports table
CREATE TABLE public.industry_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_url TEXT,
  preview_content TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'published',
  views_count INTEGER DEFAULT 0,
  publication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_reports ENABLE ROW LEVEL SECURITY;

-- Policies for industry_reports
CREATE POLICY "Admins can manage all reports"
ON public.industry_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Add update triggers
CREATE TRIGGER update_templates_guides_updated_at
BEFORE UPDATE ON public.templates_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_industry_reports_updated_at
BEFORE UPDATE ON public.industry_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- File: 20251004154649_dcec6969-0bb2-4b7e-9505-14d25b45bed5.sql

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  event_type text NOT NULL DEFAULT 'manual', -- manual, tender, signal, reminder
  related_content_id uuid, -- Link to tender/signal ID
  related_content_type text, -- tender or signal
  location text,
  status text DEFAULT 'upcoming', -- upcoming, completed, cancelled
  reminder_sent boolean DEFAULT false,
  color text DEFAULT '#3b82f6',
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can manage their own calendar events
CREATE POLICY "Users can view their own calendar events"
ON public.calendar_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar events"
ON public.calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar events"
ON public.calendar_events
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- File: 20251004183532_0cf1a05b-2d5c-434e-b13f-ad67451a49b8.sql

-- Step 1: Add new enum values in their own transaction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'buyer'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'buyer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'seller'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'seller';
  END IF;
END $$;

-- File: 20251004183548_9043c5ae-8b9c-414b-b7cb-7290be95a4ea.sql

-- Step 2: Create policies allowing self-assign buyer/seller and optional profile insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_roles' 
      AND policyname = 'Users can set themselves as buyer or seller'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can set themselves as buyer or seller" 
      ON public.user_roles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = user_id AND role IN (''buyer'',''seller''))';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles' 
      AND policyname = 'Users can create their own profile'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can create their own profile" 
      ON public.profiles 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- File: 20251004185151_ba101786-a394-41c9-b932-c4730427cadc.sql

-- Create maintenance_requests table
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  service_type TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  location TEXT NOT NULL,
  facility_type TEXT,
  estimated_budget_min NUMERIC,
  estimated_budget_max NUMERIC,
  budget NUMERIC,
  project_duration_days INTEGER,
  scope_of_work TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  preferred_start_date TIMESTAMP WITH TIME ZONE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create quote_submissions table
CREATE TABLE IF NOT EXISTS public.quote_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  estimated_duration TEXT NOT NULL,
  proposal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create saved_requests table
CREATE TABLE IF NOT EXISTS public.saved_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(seller_id, request_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add missing columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS verified_seller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_rating NUMERIC DEFAULT 0;

-- Enable RLS on all tables
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_requests
CREATE POLICY "Buyers can manage their own requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view public open requests" 
  ON public.maintenance_requests 
  FOR SELECT 
  USING (visibility = 'public' AND status = 'open');

CREATE POLICY "Admins can manage all requests" 
  ON public.maintenance_requests 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for quote_submissions
CREATE POLICY "Sellers can create quotes" 
  ON public.quote_submissions 
  FOR INSERT 
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can view their own quotes" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can view quotes for their requests" 
  ON public.quote_submissions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Buyers can update quote status" 
  ON public.quote_submissions 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = quote_submissions.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    )
  );

-- RLS Policies for saved_requests
CREATE POLICY "Sellers can manage their saved requests" 
  ON public.saved_requests 
  FOR ALL 
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages for their requests" 
  ON public.messages 
  FOR SELECT 
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE maintenance_requests.id = messages.request_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.quote_submissions 
      WHERE quote_submissions.request_id = messages.request_id 
      AND quote_submissions.seller_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Add updated_at triggers
CREATE TRIGGER update_maintenance_requests_updated_at 
  BEFORE UPDATE ON public.maintenance_requests 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_quote_submissions_updated_at 
  BEFORE UPDATE ON public.quote_submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id ON public.maintenance_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id ON public.quote_submissions(request_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id ON public.quote_submissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_saved_requests_seller_id ON public.saved_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_request_id ON public.messages(request_id);

-- File: 20251006091341_4ddaaf13-99fe-4b04-8a27-5290d18c3790.sql

-- Create table for tracking signals and tenders
CREATE TABLE IF NOT EXISTS public.tracked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('signal', 'tender')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tracked items
CREATE POLICY "Users can view their own tracked items"
  ON public.tracked_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked items"
  ON public.tracked_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked items"
  ON public.tracked_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_tracked_items_user_id ON public.tracked_items(user_id);
CREATE INDEX idx_tracked_items_item_id ON public.tracked_items(item_id, item_type);

-- File: 20251006091406_d93ec8b5-0d18-4922-af12-f7b3b77b0bb2.sql

-- Add quote_id to messages table for quote-specific messaging
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quote_submissions(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_quote_id ON public.messages(quote_id);

-- Update RLS policies for quote-specific messages
DROP POLICY IF EXISTS "Users can view messages for their requests" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can view messages for their quotes"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    -- Seller can see messages for their quotes
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      WHERE quote_submissions.id = messages.quote_id 
      AND quote_submissions.seller_id = auth.uid()
    )) OR
    -- Buyer can see messages for quotes on their requests
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages for their quotes"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      -- Seller can message their own quotes
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        WHERE quote_submissions.id = quote_id 
        AND quote_submissions.seller_id = auth.uid()
      )) OR
      -- Buyer can message quotes on their requests
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
        WHERE quote_submissions.id = quote_id 
        AND maintenance_requests.buyer_id = auth.uid()
      ))
    )
  );

-- File: 20251006092704_41cee02d-4cc3-47d1-a925-d5d2e0337be2.sql

-- Make request_id nullable in messages table since we're using quote-specific messaging
ALTER TABLE public.messages ALTER COLUMN request_id DROP NOT NULL;

-- Update RLS policies for messages to work with quote-specific messaging
DROP POLICY IF EXISTS "Users can send messages for their quotes" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their quotes" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can send messages for their quotes"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  quote_id IS NOT NULL AND
  (
    -- Seller can send if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can send if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view messages for their quotes"
ON public.messages
FOR SELECT
TO authenticated
USING (
  quote_id IS NOT NULL AND
  (
    -- Seller can view if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can view if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);

-- File: 20251006092716_2511bf7e-4757-4128-8d7d-862b349e3ca7.sql

-- Add source_link field to signals table for primary source verification
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS source_link TEXT;

-- Add source_link field to tenders table for primary source verification
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS source_link TEXT;

-- File: 20251007153629_0627331a-8548-45fb-b4c4-db8a46a8abeb.sql

-- Add detailed fields to quote_submissions table
ALTER TABLE public.quote_submissions 
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS technical_approach TEXT,
ADD COLUMN IF NOT EXISTS team_experience TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS timeline_details TEXT,
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB,
ADD COLUMN IF NOT EXISTS client_references TEXT,
ADD COLUMN IF NOT EXISTS custom_sections JSONB;

-- Create request_quote_templates table for customizable quote forms
CREATE TABLE IF NOT EXISTS public.request_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on request_quote_templates
ALTER TABLE public.request_quote_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for request_quote_templates
CREATE POLICY "Buyers can manage templates for their requests"
ON public.request_quote_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view templates for open requests"
ON public.request_quote_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND status = 'open'
    AND visibility = 'public'
  )
);

-- Function to create notification when quote is submitted
CREATE OR REPLACE FUNCTION public.notify_quote_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_id UUID;
  request_title TEXT;
BEGIN
  -- Get buyer_id and request title
  SELECT mr.buyer_id, mr.title INTO buyer_id, request_title
  FROM maintenance_requests mr
  WHERE mr.id = NEW.request_id;

  -- Create notification for buyer
  IF buyer_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      buyer_id,
      'New Quote Received',
      'You received a new quote for "' || request_title || '"',
      'quote_received',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for quote submissions
DROP TRIGGER IF EXISTS on_quote_submission ON public.quote_submissions;
CREATE TRIGGER on_quote_submission
AFTER INSERT ON public.quote_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_submission();

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  buyer_id UUID;
  seller_id UUID;
  recipient_id UUID;
BEGIN
  -- Get quote details
  SELECT qs.seller_id, mr.buyer_id, mr.title
  INTO quote_record
  FROM quote_submissions qs
  JOIN maintenance_requests mr ON mr.id = qs.request_id
  WHERE qs.id = NEW.quote_id;

  seller_id := quote_record.seller_id;
  buyer_id := quote_record.buyer_id;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = buyer_id THEN
    recipient_id := seller_id;
  ELSE
    recipient_id := buyer_id;
  END IF;

  -- Create notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      recipient_id,
      'New Message',
      'You have a new message regarding "' || quote_record.title || '"',
      'new_message',
      NEW.quote_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- File: 20251007155928_2177ea91-d13c-4de0-ae86-09437b708113.sql

-- Ensure triggers are properly created
DROP TRIGGER IF EXISTS on_quote_submission ON quote_submissions;
CREATE TRIGGER on_quote_submission
  AFTER INSERT ON quote_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_submission();

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- File: 20251007161054_f12c7d89-097b-470e-968d-4c90dcf4ad79.sql

-- Update the notification_type check constraint to include quote and message types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text, 
  'tender_deadline'::text, 
  'new_signal'::text, 
  'system'::text,
  'quote_received'::text,
  'new_message'::text
]));

-- File: 20251007175851_ba7d0949-8140-4fe7-b8b1-7079b4e05313.sql

-- Create table to track negotiation offers per quote
CREATE TABLE IF NOT EXISTS public.quote_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quote_submissions(id) ON DELETE CASCADE,
  initiator_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  price_offer numeric,
  duration_offer text,
  message text,
  status text NOT NULL DEFAULT 'open', -- open | accepted | declined | countered | withdrawn
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quote_negotiations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid name conflicts
DROP POLICY IF EXISTS "Participants can view negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can insert negotiations" ON public.quote_negotiations;
DROP POLICY IF EXISTS "Participants can update negotiations" ON public.quote_negotiations;

-- Policy: Participants (buyer or seller) can view negotiation entries for their quotes
CREATE POLICY "Participants can view negotiations"
ON public.quote_negotiations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Policy: Participants can insert negotiation entries for their quotes
CREATE POLICY "Participants can insert negotiations"
ON public.quote_negotiations
FOR INSERT
WITH CHECK (
  initiator_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (
        -- Seller initiates to buyer
        (qs.seller_id = auth.uid() AND recipient_id = mr.buyer_id)
        OR
        -- Buyer initiates to seller
        (mr.buyer_id = auth.uid() AND recipient_id = qs.seller_id)
      )
  )
);

-- Policy: Participants can update negotiation entries (e.g., accept/decline/counter)
CREATE POLICY "Participants can update negotiations"
ON public.quote_negotiations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quote_submissions qs
    JOIN public.maintenance_requests mr ON mr.id = qs.request_id
    WHERE qs.id = quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
  )
);

-- Trigger to set quote_submissions.status = 'negotiating' when a negotiation entry is created
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status <> 'accepted' AND status <> 'declined';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
BEFORE INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

-- Generic updated_at trigger for quote_negotiations
DROP TRIGGER IF EXISTS trg_quote_negotiations_updated_at ON public.quote_negotiations;
CREATE TRIGGER trg_quote_negotiations_updated_at
BEFORE UPDATE ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Useful index for faster lookups by quote
CREATE INDEX IF NOT EXISTS idx_quote_negotiations_quote_id ON public.quote_negotiations(quote_id);


-- File: 20251007180333_e00c34a5-fbbe-4d97-a458-989ff6e94270.sql

-- Add buyer_type field to profiles table to distinguish between company and individual buyers
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS buyer_type text CHECK (buyer_type IN ('company', 'individual'));

-- Create index for faster queries filtering by buyer type
CREATE INDEX IF NOT EXISTS idx_profiles_buyer_type ON public.profiles(buyer_type);

-- Update existing buyers to have default buyer_type (company for backward compatibility)
-- Only update profiles that are buyers (have user_type = 'buyer' or have posted maintenance requests)
UPDATE public.profiles
SET buyer_type = 'company'
WHERE buyer_type IS NULL
  AND (
    user_type = 'buyer'
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests 
      WHERE buyer_id = profiles.id
    )
  );


-- File: 20251007182109_b8f6ee8b-a4d3-4688-baa9-94fc8e6d2226.sql

-- Fix quote_submissions status to include 'negotiating' and ensure negotiation insert updates quote status
BEGIN;

-- 1) Relax/Add status values to include 'negotiating'
ALTER TABLE public.quote_submissions
  DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

ALTER TABLE public.quote_submissions
  ADD CONSTRAINT quote_submissions_status_check
  CHECK (status IN (
    'pending',
    'submitted',
    'shortlisted',
    'negotiating',
    'accepted',
    'rejected',
    'withdrawn'
  ));

-- 2) Ensure trigger exists to set status to negotiating when a negotiation offer is created
-- Update function to avoid using nonexistent 'declined' status and instead use 'rejected'
CREATE OR REPLACE FUNCTION public.set_quote_negotiating_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.quote_submissions
  SET status = 'negotiating', updated_at = now()
  WHERE id = NEW.quote_id AND status NOT IN ('accepted','rejected');
  RETURN NEW;
END;
$$;

-- Recreate the trigger to be safe
DROP TRIGGER IF EXISTS trg_set_quote_negotiating_on_offer ON public.quote_negotiations;
CREATE TRIGGER trg_set_quote_negotiating_on_offer
AFTER INSERT ON public.quote_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.set_quote_negotiating_on_offer();

COMMIT;

-- File: 20251007185732_3ab21261-d20d-42bf-9534-ed60182819c8.sql

-- Step 1: add new enum value (must be committed alone)
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'buyer_individual';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- File: 20251007185808_364a71eb-844f-40ac-90ae-87a70d589626.sql

-- Step 2: policies, counters, view tracking, and triggers

-- Allow users to set buyer_individual role in user_roles
DROP POLICY IF EXISTS "Users can set themselves as buyer_individual" ON public.user_roles;
CREATE POLICY "Users can set themselves as buyer_individual"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (role = 'buyer_individual'));

-- Add counters to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quotes_count integer NOT NULL DEFAULT 0;

-- Table to track unique request views
CREATE TABLE IF NOT EXISTS public.request_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

ALTER TABLE public.request_views ENABLE ROW LEVEL SECURITY;

-- RLS: users can insert their own views
DROP POLICY IF EXISTS "Users can insert their own request views" ON public.request_views;
CREATE POLICY "Users can insert their own request views"
ON public.request_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Optional: users can view their own rows
DROP POLICY IF EXISTS "Users can view their own request views" ON public.request_views;
CREATE POLICY "Users can view their own request views"
ON public.request_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to increment views_count on insert into request_views
CREATE OR REPLACE FUNCTION public.increment_request_views_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET views_count = COALESCE(views_count, 0) + 1,
         updated_at = now()
   WHERE id = NEW.request_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_request_views ON public.request_views;
CREATE TRIGGER trg_increment_request_views
AFTER INSERT ON public.request_views
FOR EACH ROW EXECUTE FUNCTION public.increment_request_views_count();

-- Triggers to maintain quotes_count on quote_submissions
CREATE OR REPLACE FUNCTION public.increment_quotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET quotes_count = COALESCE(quotes_count, 0) + 1,
         updated_at = now()
   WHERE id = NEW.request_id;
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.decrement_quotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_requests
     SET quotes_count = GREATEST(COALESCE(quotes_count, 0) - 1, 0),
         updated_at = now()
   WHERE id = OLD.request_id;
  RETURN OLD;
END;$$;

DROP TRIGGER IF EXISTS trg_increment_quotes_count ON public.quote_submissions;
CREATE TRIGGER trg_increment_quotes_count
AFTER INSERT ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.increment_quotes_count();

DROP TRIGGER IF EXISTS trg_decrement_quotes_count ON public.quote_submissions;
CREATE TRIGGER trg_decrement_quotes_count
AFTER DELETE ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.decrement_quotes_count();

-- Close request when a quote is accepted
CREATE OR REPLACE FUNCTION public.close_request_on_quote_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.maintenance_requests
       SET status = 'awarded', updated_at = now()
     WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_close_request_on_quote_accepted ON public.quote_submissions;
CREATE TRIGGER trg_close_request_on_quote_accepted
AFTER UPDATE ON public.quote_submissions
FOR EACH ROW EXECUTE FUNCTION public.close_request_on_quote_accepted();

-- File: 20251007190417_8e0867e9-9272-443d-b946-d05e3f536ec0.sql

-- Add denormalized buyer fields to maintenance_requests
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS buyer_type text,
  ADD COLUMN IF NOT EXISTS buyer_company_name text;

-- Function to sync buyer info when request is created or updated
CREATE OR REPLACE FUNCTION public.sync_request_buyer_info()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_profile RECORD;
BEGIN
  SELECT buyer_type, company_name INTO buyer_profile
  FROM public.profiles
  WHERE id = NEW.buyer_id;
  
  NEW.buyer_type := buyer_profile.buyer_type;
  NEW.buyer_company_name := buyer_profile.company_name;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON public.maintenance_requests;
CREATE TRIGGER trg_sync_request_buyer_info
BEFORE INSERT OR UPDATE OF buyer_id ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_buyer_info();

-- Function to update requests when buyer profile changes
CREATE OR REPLACE FUNCTION public.sync_requests_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.buyer_type IS DISTINCT FROM OLD.buyer_type) OR 
     (NEW.company_name IS DISTINCT FROM OLD.company_name) THEN
    UPDATE public.maintenance_requests
    SET buyer_type = NEW.buyer_type,
        buyer_company_name = NEW.company_name,
        updated_at = now()
    WHERE buyer_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_requests_on_profile_update ON public.profiles;
CREATE TRIGGER trg_sync_requests_on_profile_update
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_requests_on_profile_update();

-- Backfill existing requests with buyer info
UPDATE public.maintenance_requests mr
SET buyer_type = p.buyer_type,
    buyer_company_name = p.company_name
FROM public.profiles p
WHERE mr.buyer_id = p.id
  AND (mr.buyer_type IS NULL OR mr.buyer_company_name IS NULL);

-- File: 20251007193121_86b33385-724c-4ad2-a9f4-37f962af5d26.sql

-- Add action_items field to signals table
ALTER TABLE public.signals
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Add action_items field to tenders table
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Comment describing the structure of action_items
COMMENT ON COLUMN public.signals.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';

COMMENT ON COLUMN public.tenders.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';

-- File: 20251010163026_04425d52-19b1-4e40-bdb8-904016a64fbc.sql

-- Create table to track per-user completion state of action items from signals/tenders
CREATE TABLE IF NOT EXISTS public.user_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('signal','tender')),
  source_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, action_key)
);

-- Enable RLS
ALTER TABLE public.user_action_items ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own records
CREATE POLICY "Users can view their own action items"
ON public.user_action_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action items"
ON public.user_action_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action items"
ON public.user_action_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action items"
ON public.user_action_items
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_items_user ON public.user_action_items (user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_items_source ON public.user_action_items (source_type, source_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_timestamp_user_action_items
BEFORE UPDATE ON public.user_action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- File: 20251011140415_be9625ec-a511-4efc-8f7e-8ab1b1b237e0.sql

-- Add currency preference to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_currency text NOT NULL DEFAULT 'USD' CHECK (preferred_currency IN ('USD', 'SAR'));

-- File: 20251018092410_5d7ce777-489e-45fa-bb11-e8fb292dbda4.sql

-- Create support_chats table for live chat sessions
CREATE TABLE public.support_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  user_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_form_submissions table
CREATE TABLE public.contact_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_chats
CREATE POLICY "Users can view their own chats"
  ON public.support_chats FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can create their own chats"
  ON public.support_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all chats"
  ON public.support_chats FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all chats"
  ON public.support_chats FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chats"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = chat_messages.chat_id
      AND (support_chats.user_id = auth.uid() OR support_chats.user_id IS NULL)
    ) OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can send messages in their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_chats
      WHERE support_chats.id = chat_messages.chat_id
      AND (support_chats.user_id = auth.uid() OR support_chats.user_id IS NULL)
    ) OR (has_role(auth.uid(), 'admin') AND sender_type = 'admin')
  );

CREATE POLICY "Admins can view all messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for contact_form_submissions
CREATE POLICY "Anyone can submit contact forms"
  ON public.contact_form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all contact submissions"
  ON public.contact_form_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update contact submissions"
  ON public.contact_form_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Create function to update last_message_at
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_chats
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating last_message_at
CREATE TRIGGER update_chat_last_message_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- Create function to notify admins of new chats
CREATE OR REPLACE FUNCTION notify_admins_new_chat()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      admin_record.user_id,
      'New Support Chat',
      'A new support chat has been started by ' || COALESCE(NEW.user_name, NEW.user_email),
      'new_chat',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for notifying admins
CREATE TRIGGER notify_admins_new_chat_trigger
AFTER INSERT ON public.support_chats
FOR EACH ROW
EXECUTE FUNCTION notify_admins_new_chat();

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for performance
CREATE INDEX idx_support_chats_user_id ON public.support_chats(user_id);
CREATE INDEX idx_support_chats_status ON public.support_chats(status);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_contact_submissions_status ON public.contact_form_submissions(status);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_form_submissions(created_at DESC);

-- File: 20251024204713_61ed5d34-3b00-4780-b5e7-6065276604c3.sql

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

-- File: 20251024210443_abe7c5a4-df0b-4fcd-a3af-a56c43a07223.sql

-- Add country and city columns to signals table
ALTER TABLE public.signals
ADD COLUMN country text,
ADD COLUMN city text;

-- Add country and city columns to tenders table
ALTER TABLE public.tenders
ADD COLUMN country text,
ADD COLUMN city text;

-- File: 20251025095052_4d41a47f-ae92-41b4-b5f1-ef857f11b1cd.sql

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view published briefs" ON public.briefs;

-- Create new policy allowing access to both published and archived briefs
CREATE POLICY "Users can view published and archived briefs" 
ON public.briefs 
FOR SELECT 
USING (status IN ('published', 'archived'));

-- File: 20251025101728_3cca864a-a738-4bf4-9529-2c380cc0225e.sql

-- Add read tracking columns to messages table
ALTER TABLE public.messages 
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy to allow users to mark messages as read
CREATE POLICY "Users can mark their received messages as read"
ON public.messages
FOR UPDATE
USING (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
)
WITH CHECK (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
);

-- Add RLS policy for sellers to update their own pending/negotiating quotes
CREATE POLICY "Sellers can update their own pending quotes"
ON public.quote_submissions
FOR UPDATE
USING (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
)
WITH CHECK (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
);

-- File: 20251025180204_362d549b-41bb-416f-87a9-5a7c5e74bf91.sql

-- Add tags column for flexible metadata (Home/Project, job size, timeline, site readiness)
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tags ON public.maintenance_requests USING GIN (tags);

-- Add service_focus column to profiles for vendors (array of 'home', 'project', 'both')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_focus TEXT[] DEFAULT ARRAY['both'];

-- Add crew_size_range column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_size_range TEXT;

-- File: 20251025184540_051495b2-eba1-42cf-a049-5dc4ac238dcd.sql

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

-- File: 20251025191022_bff52ba4-b945-4a1e-a2e5-b822d4334009.sql

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

-- File: 20251025191333_95fa7252-4759-4329-947c-7c925ee764da.sql

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

-- File: 20251025192043_da648b9e-f42f-4f13-aa0e-1e2bd4766677.sql

-- Fix RLS policies to allow viewing discoverable seller profiles
-- This allows the Explore page and seller profile views to work properly

-- Add policy to allow authenticated users to view discoverable seller profiles
CREATE POLICY "authenticated_users_view_discoverable_sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  discoverable = true 
  AND (user_type IN ('seller', 'both'))
);

-- The existing "Users can view their own profile" policy remains in place
-- This creates layered access: full access to own profile, read-only for discoverable sellers

-- File: 20251025194956_41329c92-c1eb-4a1e-b38c-9760e6acc1b7.sql

-- Step 1: Add new subscription tier enum values
-- Adding: starter, comfort, priority, elite

-- Step 1: Add new subscription tier enum values (only if type exists)
-- Adding: starter, comfort, priority, elite

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'comfort';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'priority';
    ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'elite';
  END IF;
END
$$;


-- File: 20251025195047_3fb35d2d-7fbd-4960-a274-217e1e40d99c.sql

-- Migrate existing subscription data and define has_subscription_access
-- Only if the subscriptions table and subscription_tier type actually exist

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'subscriptions'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'subscription_tier'
  ) THEN

    -- Migrate existing subscription data
    UPDATE subscriptions
    SET tier = 'comfort'::subscription_tier
    WHERE tier = 'basic'::subscription_tier;

    UPDATE subscriptions
    SET tier = 'elite'::subscription_tier
    WHERE tier = 'enterprise'::subscription_tier;

    -- Replace has_subscription_access function (not drop)
    CREATE OR REPLACE FUNCTION has_subscription_access(_user_id uuid, _required_tier subscription_tier)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    DECLARE
      user_tier subscription_tier;
      tier_hierarchy int;
      required_tier_hierarchy int;
    BEGIN
      SELECT tier INTO user_tier
      FROM subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
      LIMIT 1;

      IF user_tier IS NULL THEN
        user_tier := 'free';
      END IF;

      tier_hierarchy := CASE user_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      required_tier_hierarchy := CASE _required_tier
        WHEN 'free' THEN 0
        WHEN 'starter' THEN 0
        WHEN 'basic' THEN 1
        WHEN 'comfort' THEN 1
        WHEN 'priority' THEN 2
        WHEN 'professional' THEN 1
        WHEN 'enterprise' THEN 2
        WHEN 'elite' THEN 2
        ELSE 0
      END;

      RETURN tier_hierarchy >= required_tier_hierarchy;
    END;
    $fn$;

  END IF;
END
$do$;


-- File: 20251025210550_4d8c952d-03ea-4e31-acda-465e56c59066.sql

-- Drop the old constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Add updated constraint with all notification types including booking-related ones
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text,
  'tender_deadline'::text,
  'new_signal'::text,
  'system'::text,
  'quote_received'::text,
  'quote_accepted'::text,
  'quote_declined'::text,
  'new_message'::text,
  'booking_request'::text,
  'booking_received'::text,
  'booking_accepted'::text,
  'booking_declined'::text,
  'booking_updated'::text,
  'booking_cancelled'::text,
  'counter_proposal_received'::text,
  'counter_proposal_accepted'::text,
  'booking_message'::text,
  'new_chat'::text
]));

-- File: 20251025211630_a3d53b48-334b-489d-931e-80dabd4807db.sql

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

-- File: 20251025214114_066c124a-5a15-4b9f-a9d8-609857842b8c.sql

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

-- File: 20251026172551_87b7af6a-f6d1-42a3-bc7b-339ba34cb721.sql

-- Add translation columns to maintenance_requests
ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS title_ar TEXT,
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description_ar TEXT,
ADD COLUMN IF NOT EXISTS description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
ADD COLUMN IF NOT EXISTS full_name_en TEXT,
ADD COLUMN IF NOT EXISTS company_name_ar TEXT,
ADD COLUMN IF NOT EXISTS company_name_en TEXT,
ADD COLUMN IF NOT EXISTS bio_ar TEXT,
ADD COLUMN IF NOT EXISTS bio_en TEXT,
ADD COLUMN IF NOT EXISTS company_description_ar TEXT,
ADD COLUMN IF NOT EXISTS company_description_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Add translation columns to quote_submissions
ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS proposal_ar TEXT,
ADD COLUMN IF NOT EXISTS proposal_en TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_ar TEXT,
ADD COLUMN IF NOT EXISTS cover_letter_en TEXT,
ADD COLUMN IF NOT EXISTS original_language TEXT DEFAULT 'en';

-- Create index for faster language-based queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_original_language ON maintenance_requests(original_language);
CREATE INDEX IF NOT EXISTS idx_profiles_original_language ON profiles(original_language);

-- File: 20251026174315_5cb5c768-6546-4876-9c56-cf4132966739.sql

-- Strip "Request #" from titles and descriptions
UPDATE maintenance_requests 
SET title = regexp_replace(title, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE title ~* 'Request\s*#';

UPDATE maintenance_requests 
SET description = regexp_replace(description, 'Request\s*#\d*\s*[-:]?\s*', '', 'gi')
WHERE description ~* 'Request\s*#';

-- Normalize urgency from 'normal' to 'medium'
UPDATE maintenance_requests 
SET urgency = 'medium' 
WHERE urgency = 'normal';

-- Lower and round budgets for home services (many under 500 SAR)
UPDATE maintenance_requests
SET 
  estimated_budget_min = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100)::numeric
  END,
  estimated_budget_max = CASE 
    WHEN tags->>'audience' = 'home' THEN (floor(random() * 4 + 1) * 100 + floor(random() * 3) * 100)::numeric
    ELSE (floor(random() * 10 + 5) * 100 + floor(random() * 5 + 2) * 100)::numeric
  END
WHERE estimated_budget_min IS NOT NULL;

-- Update existing vendors for more diversity
UPDATE profiles SET
  discoverable = true,
  user_type = 'seller',
  availability_status = CASE 
    WHEN random() < 0.6 THEN 'accepting_requests'
    WHEN random() < 0.8 THEN 'busy'
    ELSE 'not_taking_work'
  END,
  verified_seller = random() < 0.4,
  seller_rating = CASE 
    WHEN random() < 0.3 THEN 0
    WHEN random() < 0.5 THEN NULL
    ELSE (random() * 2.4 + 2.5)::numeric(3,1)
  END,
  completed_projects = floor(random() * 41)::integer,
  full_name = CASE floor(random() * 15)
    WHEN 0 THEN 'Ahmed'
    WHEN 1 THEN 'Jomar'
    WHEN 2 THEN 'Anil'
    WHEN 3 THEN 'Mae'
    WHEN 4 THEN 'Priya'
    WHEN 5 THEN 'محمد'
    WHEN 6 THEN 'فاطمة'
    WHEN 7 THEN 'Ricardo'
    WHEN 8 THEN 'Joseph'
    WHEN 9 THEN 'Maria'
    WHEN 10 THEN 'Ali'
    WHEN 11 THEN 'Hassan'
    WHEN 12 THEN 'Omar'
    WHEN 13 THEN 'Yusuf'
    ELSE 'Khalid'
  END,
  company_name = CASE 
    WHEN random() < 0.4 THEN NULL
    WHEN random() < 0.6 THEN 'Service Co'
    WHEN random() < 0.8 THEN full_name || ' Services'
    ELSE NULL
  END,
  bio = CASE 
    WHEN random() < 0.3 THEN NULL
    ELSE 'Experienced professional'
  END,
  phone = CASE 
    WHEN random() < 0.2 THEN NULL
    ELSE '+966' || floor(random() * 900000000 + 500000000)::text
  END,
  response_time_hours = floor(random() * 48 + 1)::integer
WHERE user_type = 'seller' OR user_type = 'both';

-- Insert sample reviews for vendors with ratings > 0
INSERT INTO seller_reviews (seller_id, buyer_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM profiles WHERE user_type IN ('buyer', 'both') ORDER BY random() LIMIT 1),
  floor(random() * 2 + 4)::integer,
  CASE floor(random() * 8)
    WHEN 0 THEN 'Great service, very professional'
    WHEN 1 THEN 'Quick response and good quality work'
    WHEN 2 THEN 'Excellent work, highly recommend'
    WHEN 3 THEN 'Professional and efficient'
    WHEN 4 THEN 'Good value for money'
    WHEN 5 THEN 'Very satisfied with the service'
    WHEN 6 THEN 'Reliable and trustworthy'
    ELSE 'Would hire again'
  END,
  now() - (floor(random() * 180) || ' days')::interval
FROM profiles p
WHERE p.seller_rating > 0 
  AND p.seller_rating IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM seller_reviews WHERE seller_id = p.id)
LIMIT 20;

-- File: 20251026180555_b05e3c56-ba67-4d60-ac31-874545d52788.sql

-- Phase 1: Add system_generated flag to distinguish real users from mock data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_generated boolean DEFAULT false;

-- Phase 2A: Update existing 6 sellers with maximum diversity
-- First, let's identify and preserve real users by marking system_generated vendors

-- Vendor 1: Filipino freelancer - Mae
UPDATE public.profiles
SET 
  full_name = 'Mae',
  full_name_en = 'Mae',
  full_name_ar = 'ماي',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Experienced home helper for cleaning and small repairs',
  bio_en = 'Experienced home helper for cleaning and small repairs',
  bio_ar = 'عاملة منزلية ذات خبرة في التنظيف والإصلاحات الصغيرة',
  service_categories = ARRAY['cleaning', 'handyman'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 2,
  years_of_experience = 3,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 0);

-- Vendor 2: Indian technician - Anil Kumar
UPDATE public.profiles
SET 
  full_name = 'Anil Kumar',
  full_name_en = 'Anil Kumar',
  full_name_ar = 'أنيل كومار',
  company_name = 'Kumar Electrical Services',
  company_name_en = 'Kumar Electrical Services',
  company_name_ar = 'خدمات كومار الكهربائية',
  bio = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_en = 'Licensed electrician with 10 years experience in commercial and residential projects',
  bio_ar = 'كهربائي مرخص مع 10 سنوات خبرة في المشاريع التجارية والسكنية',
  service_categories = ARRAY['electrical', 'appliance_repair'],
  verified_seller = true,
  seller_rating = 4.2,
  completed_projects = 8,
  years_of_experience = 10,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966501234567',
  crew_size_range = '1-5',
  certifications = ARRAY['Licensed Electrician', 'Safety Certified'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 1);

-- Vendor 3: Arabic contractor - Khalid
UPDATE public.profiles
SET 
  full_name = 'خالد',
  full_name_en = 'Khalid',
  full_name_ar = 'خالد',
  company_name = 'شركة الصيانة السريعة',
  company_name_en = 'Fast Maintenance Company',
  company_name_ar = 'شركة الصيانة السريعة',
  bio = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  bio_en = 'Maintenance company specialized in all plumbing and electrical work',
  bio_ar = 'شركة صيانة متخصصة في جميع أعمال السباكة والكهرباء',
  service_categories = ARRAY['plumbing', 'electrical', 'hvac'],
  verified_seller = false,
  seller_rating = 3.8,
  completed_projects = 15,
  years_of_experience = 7,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966502345678',
  crew_size_range = '6-15',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 2);

-- Vendor 4: Filipino handyman - Jomar Santos
UPDATE public.profiles
SET 
  full_name = 'Jomar Santos',
  full_name_en = 'Jomar Santos',
  full_name_ar = 'جومار سانتوس',
  company_name = 'Santos Repairs',
  company_name_en = 'Santos Repairs',
  company_name_ar = 'إصلاحات سانتوس',
  bio = 'Family business providing handyman services for homes',
  bio_en = 'Family business providing handyman services for homes',
  bio_ar = 'شركة عائلية تقدم خدمات الصيانة المنزلية',
  service_categories = ARRAY['handyman', 'carpentry', 'painting'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 1,
  years_of_experience = 2,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = '+966503456789',
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 3);

-- Vendor 5: Indian electrician - Priya
UPDATE public.profiles
SET 
  full_name = 'Priya',
  full_name_en = 'Priya',
  full_name_ar = 'بريا',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = 'Specialist in home electrical repairs',
  bio_en = 'Specialist in home electrical repairs',
  bio_ar = 'متخصصة في إصلاحات الكهرباء المنزلية',
  service_categories = ARRAY['electrical'],
  verified_seller = true,
  seller_rating = 4.5,
  completed_projects = 23,
  years_of_experience = 6,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  certifications = ARRAY['Electrical License'],
  system_generated = true,
  original_language = 'en'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 4);

-- Vendor 6: Arabic plumber - Hassan
UPDATE public.profiles
SET 
  full_name = 'حسن',
  full_name_en = 'Hassan',
  full_name_ar = 'حسن',
  company_name = NULL,
  company_name_en = NULL,
  company_name_ar = NULL,
  bio = NULL,
  bio_en = NULL,
  bio_ar = NULL,
  service_categories = ARRAY['plumbing'],
  verified_seller = false,
  seller_rating = 0,
  completed_projects = 0,
  years_of_experience = 1,
  availability_status = 'accepting_requests',
  discoverable = true,
  user_type = 'seller',
  phone = NULL,
  crew_size_range = '1-5',
  system_generated = true,
  original_language = 'ar'
WHERE id = (SELECT id FROM public.profiles WHERE user_type IN ('seller', 'both') AND discoverable = true ORDER BY created_at LIMIT 1 OFFSET 5);

-- Insert sample reviews for vendors with ratings
INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 4
    WHEN p.full_name = 'خالد' THEN 4
    WHEN p.full_name = 'Priya' THEN 5
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Good work, professional service'
    WHEN p.full_name = 'خالد' THEN 'عمل جيد وسريع'
    WHEN p.full_name = 'Priya' THEN 'Excellent electrician, highly recommended'
  END,
  now() - (random() * interval '60 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;

INSERT INTO public.seller_reviews (seller_id, buyer_id, request_id, rating, review_text, created_at)
SELECT 
  p.id,
  (SELECT id FROM public.profiles WHERE user_type IN ('buyer', 'both', 'buyer_individual') LIMIT 1),
  NULL,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 5
    WHEN p.full_name = 'خالد' THEN 3
    WHEN p.full_name = 'Priya' THEN 4
  END,
  CASE 
    WHEN p.full_name = 'Anil Kumar' THEN 'Fixed our office electrical issues quickly'
    WHEN p.full_name = 'خالد' THEN 'خدمة جيدة لكن متأخر قليلاً'
    WHEN p.full_name = 'Priya' THEN 'Fast response and great work'
  END,
  now() - (random() * interval '30 days')
FROM public.profiles p
WHERE p.full_name IN ('Anil Kumar', 'خالد', 'Priya') AND p.system_generated = true
ON CONFLICT DO NOTHING;

-- File: 20251026183926_20c59f98-e5ac-4070-b705-219f2d287891.sql

-- Delete all existing system-generated vendors
DELETE FROM public.profiles WHERE system_generated = true;

-- Update the 6 existing real vendor profiles to be realistic for Arab community
-- Get the 6 oldest seller profiles by ID (these are likely the original sellers)
WITH oldest_sellers AS (
  SELECT id 
  FROM public.profiles 
  WHERE user_type IN ('seller', 'both') 
    AND (system_generated = false OR system_generated IS NULL)
  ORDER BY id ASC 
  LIMIT 6
),
vendor_updates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY id) as rn
  FROM oldest_sellers
)
UPDATE public.profiles p
SET
  full_name = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_ar = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  full_name_en = CASE v.rn
    WHEN 1 THEN 'محمد'
    WHEN 2 THEN 'أحمد السعيد'
    WHEN 3 THEN 'Jose'
    WHEN 4 THEN 'Anil'
    WHEN 5 THEN 'خالد'
    WHEN 6 THEN 'فاطمة'
  END,
  original_language = CASE v.rn
    WHEN 1 THEN 'ar'
    WHEN 2 THEN 'ar'
    WHEN 3 THEN 'en'
    WHEN 4 THEN 'en'
    WHEN 5 THEN 'ar'
    WHEN 6 THEN 'ar'
  END,
  company_name = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_ar = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  company_name_en = CASE v.rn
    WHEN 2 THEN 'ورشة أحمد'
    ELSE NULL
  END,
  bio = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_ar = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'فني كهرباء خبرة ١٥ سنة'
    WHEN 3 THEN 'عامل صيانة ذو خبرة'
    WHEN 4 THEN 'فني كهرباء مرخص بخبرة ١٠ سنوات'
    WHEN 5 THEN 'متخصص في التكييف والتبريد'
    WHEN 6 THEN NULL
  END,
  bio_en = CASE v.rn
    WHEN 1 THEN NULL
    WHEN 2 THEN 'Electrician with 15 years experience'
    WHEN 3 THEN 'Experienced handyman, quality work'
    WHEN 4 THEN 'Licensed electrician with 10 years experience'
    WHEN 5 THEN 'HVAC specialist'
    WHEN 6 THEN NULL
  END,
  service_categories = CASE v.rn
    WHEN 1 THEN ARRAY['plumbing']
    WHEN 2 THEN ARRAY['electrical']
    WHEN 3 THEN ARRAY['handyman', 'painting']
    WHEN 4 THEN ARRAY['electrical', 'appliance_repair']
    WHEN 5 THEN ARRAY['hvac']
    WHEN 6 THEN ARRAY['cleaning']
  END,
  verified_seller = CASE v.rn
    WHEN 2 THEN true
    WHEN 4 THEN true
    WHEN 6 THEN true
    ELSE false
  END,
  seller_rating = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 4.2
    WHEN 3 THEN 3.8
    WHEN 4 THEN 4.5
    WHEN 5 THEN 4.7
    WHEN 6 THEN 0
  END,
  completed_projects = CASE v.rn
    WHEN 1 THEN 0
    WHEN 2 THEN 8
    WHEN 3 THEN 5
    WHEN 4 THEN 23
    WHEN 5 THEN 15
    WHEN 6 THEN 0
  END,
  years_of_experience = CASE v.rn
    WHEN 1 THEN 3
    WHEN 2 THEN 15
    WHEN 3 THEN 7
    WHEN 4 THEN 10
    WHEN 5 THEN 12
    WHEN 6 THEN 2
  END,
  availability_status = 'accepting_requests',
  discoverable = true,
  system_generated = false
FROM vendor_updates v
WHERE p.id = v.id;

-- File: 20251026192545_a7b4e18e-fd5a-4b96-b19e-442af16381b5.sql

-- Update service_type based on category for legacy requests
UPDATE maintenance_requests
SET service_type = CASE
  WHEN category IN ('plumbing', 'electrical', 'hvac', 'painting', 'cleaning', 'handyman', 'appliances', 'landscaping_home', 'ac_repair') THEN 'home'
  WHEN category IN ('fitout', 'tiling', 'gypsum', 'carpentry', 'mep', 'waterproofing', 'landscaping_commercial', 'renovation') THEN 'project'
  ELSE service_type
END
WHERE service_type IS NULL;

-- Update tags.audience to match service_type
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{audience}',
  to_jsonb(service_type)
)
WHERE service_type IS NOT NULL 
  AND (tags->'audience' IS NULL OR tags->'audience'::text = 'null');

-- Update tags.service_category to match category
UPDATE maintenance_requests
SET tags = jsonb_set(
  COALESCE(tags, '{}'::jsonb),
  '{service_category}',
  to_jsonb(category)
)
WHERE category IS NOT NULL 
  AND (tags->'service_category' IS NULL OR tags->'service_category'::text = 'null');

-- File: 20251026194200_17025093-0f13-465d-a218-3d4a4e39b792.sql

-- Fix: Accepting a quote should transition the related maintenance request to a valid status
-- Update the trigger function to set status to 'in_progress' instead of invalid 'awarded'
CREATE OR REPLACE FUNCTION public.close_request_on_quote_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    UPDATE public.maintenance_requests
       SET status = 'in_progress', updated_at = now()
     WHERE id = NEW.request_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- File: 20251027164211_2f8202e0-7ff4-4641-9e45-1b31da7aaed7.sql

-- Create contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES maintenance_requests(id),
  quote_id UUID REFERENCES quote_submissions(id),
  booking_id UUID REFERENCES booking_requests(id),
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft | pending_buyer | pending_seller | pending_both | ready_to_sign | pending_signatures | fully_executed | completed | amended
  
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  buyer_accepted_version INTEGER,
  seller_accepted_version INTEGER,
  
  -- Language & content
  language_mode TEXT NOT NULL DEFAULT 'dual',
  -- dual | arabic_only | english_only
  html_snapshot TEXT,
  pdf_url TEXT,
  content_hash TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for contracts
CREATE INDEX idx_contracts_buyer ON contracts(buyer_id);
CREATE INDEX idx_contracts_seller ON contracts(seller_id);
CREATE INDEX idx_contracts_request ON contracts(request_id);
CREATE INDEX idx_contracts_quote ON contracts(quote_id);
CREATE INDEX idx_contracts_booking ON contracts(booking_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- RLS for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contracts"
  ON contracts FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create contracts"
  ON contracts FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Both parties can update their contracts"
  ON contracts FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create binding_terms table
CREATE TABLE public.binding_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  -- Payment terms
  payment_schedule JSONB NOT NULL DEFAULT '{"deposit": 30, "progress": 40, "completion": 30}'::jsonb,
  use_deposit_escrow BOOLEAN DEFAULT false,
  
  -- Timeline
  start_date DATE,
  completion_date DATE,
  warranty_days INTEGER DEFAULT 90,
  
  -- Penalties & materials
  penalty_rate_per_day NUMERIC(10, 2),
  materials_by TEXT,
  
  -- Access & cleanup
  access_hours TEXT,
  cleanup_disposal BOOLEAN DEFAULT true,
  
  -- Additional terms
  custom_terms JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for binding_terms
ALTER TABLE binding_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view terms for their contracts"
  ON binding_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Both parties can manage binding terms"
  ON binding_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = binding_terms.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_clauses table (Clause Library)
CREATE TABLE public.contract_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Clause identification
  clause_key TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  service_tags TEXT[] DEFAULT '{}',
  
  -- Bilingual content
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  
  -- Merge variables
  variables TEXT[] DEFAULT '{}',
  
  -- Metadata
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for contract_clauses
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active clauses"
  ON contract_clauses FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage clauses"
  ON contract_clauses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create contract_versions table
CREATE TABLE public.contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Version content
  html_snapshot TEXT NOT NULL,
  binding_terms_snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  
  -- Changes
  changed_by UUID REFERENCES profiles(id),
  change_summary TEXT,
  changes_diff JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, version)
);

-- RLS for contract_versions
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their contracts"
  ON contract_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_versions.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Create contract_signatures table
CREATE TABLE public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  version INTEGER NOT NULL,
  
  -- Signature details
  signature_method TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  otp_code TEXT,
  ip_address INET,
  user_agent TEXT,
  
  signed_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, user_id)
);

-- RLS for contract_signatures
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures on their contracts"
  ON contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_signatures.contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can sign their own contracts"
  ON contract_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create contract_amendments table
CREATE TABLE public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  amendment_number INTEGER NOT NULL,
  
  -- Change details
  scope_delta TEXT,
  cost_delta NUMERIC(10, 2),
  time_delta INTEGER,
  
  -- Amendment contract
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  html_snapshot TEXT,
  pdf_url TEXT,
  
  -- Signatures
  signed_at_buyer TIMESTAMPTZ,
  signed_at_seller TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(parent_contract_id, amendment_number)
);

-- RLS for contract_amendments
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendments to their contracts"
  ON contract_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts 
      WHERE contracts.id = contract_amendments.parent_contract_id 
      AND (contracts.buyer_id = auth.uid() OR contracts.seller_id = auth.uid())
    )
  );

-- Notification trigger for contract creation
CREATE OR REPLACE FUNCTION notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, notification_type, title, message, content_id)
  VALUES 
    (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id),
    (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_created
  AFTER INSERT ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_created();

-- Notification trigger for contract version updates
CREATE OR REPLACE FUNCTION notify_contract_version_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version > OLD.version THEN
    INSERT INTO notifications (user_id, notification_type, title, message, content_id)
    VALUES 
      (CASE WHEN NEW.status = 'pending_buyer' THEN NEW.buyer_id ELSE NEW.seller_id END,
       'contract_updated', 'Contract Updated', 'Contract has been updated to version ' || NEW.version, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_version_updated
  AFTER UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION notify_contract_version_updated();

-- File: 20251027171335_68e2d2cf-f7e0-4c7b-b809-9f5c5f1b2437.sql


-- Clean up orphaned data (Fix Plan Option A) - handling foreign keys
-- First, delete related messages for orphaned bookings and quotes
DELETE FROM messages 
WHERE booking_id IN (
  SELECT id FROM booking_requests 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

DELETE FROM messages 
WHERE quote_id IN (
  SELECT id FROM quote_submissions 
  WHERE seller_id NOT IN (SELECT id FROM profiles)
);

-- Now delete orphaned quotes and bookings
DELETE FROM quote_submissions 
WHERE seller_id NOT IN (SELECT id FROM profiles);

DELETE FROM booking_requests 
WHERE seller_id NOT IN (SELECT id FROM profiles);

-- Add comments documenting new status options for contract integration
COMMENT ON COLUMN quote_submissions.status IS 'Status: pending, accepted, rejected, negotiating, contract_pending, contract_accepted';
COMMENT ON COLUMN booking_requests.status IS 'Status: pending, accepted, declined, counter_proposed, cancelled, buyer_countered, completed, contract_pending, contract_accepted';


-- File: 20251027173423_0b67e25f-781e-4ff2-841f-b3b3dc7f0ea1.sql

-- Phase 1: Backfill missing profiles for all users referenced in the system
-- This creates profile records for any user IDs that exist in quotes, requests, bookings, or contracts
-- but don't have a profile entry yet

INSERT INTO public.profiles (id, system_generated, created_at, updated_at)
SELECT DISTINCT u_id, true, now(), now()
FROM (
  SELECT seller_id as u_id FROM public.quote_submissions WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.maintenance_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.booking_requests WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.booking_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.contracts WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.contracts WHERE seller_id IS NOT NULL
) x
LEFT JOIN public.profiles p ON p.id = x.u_id
WHERE p.id IS NULL;

-- File: 20251027174510_51bdc42b-c963-4192-98bc-0169183e8abb.sql

-- Phase 1: Fix RLS Policy for Contract Creation
-- Drop the existing restrictive policy that only allows buyers
DROP POLICY IF EXISTS "Buyers can create contracts" ON contracts;

-- Create a new policy that allows both buyers and sellers to create contracts
CREATE POLICY "Both parties can create contracts" 
ON contracts 
FOR INSERT 
WITH CHECK (
  auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- File: 20251027180153_27bdfbdf-ec74-4a31-844f-abed0a3906a5.sql

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

-- File: 20251029142618_81240ff7-7b58-4538-ad67-8b2754be683d.sql

-- Add signature_data column to profiles table for electronic signatures
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_data JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.signature_data IS 'Electronic signature data: {type: "drawn"|"typed"|"uploaded", data: base64_string, created_at: timestamp, full_name: string}';

-- Create index for faster signature lookups
CREATE INDEX IF NOT EXISTS idx_profiles_signature_data ON public.profiles USING GIN (signature_data) WHERE signature_data IS NOT NULL;

-- File: 20251030105750_1d680a6b-7e7c-4660-9328-710432f848da.sql

-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create blogs table
CREATE TABLE public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  excerpt_en TEXT NOT NULL,
  excerpt_ar TEXT,
  content_en TEXT NOT NULL,
  content_ar TEXT,
  featured_image_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_name TEXT NOT NULL DEFAULT 'MaintMENA Team',
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  views_count INTEGER NOT NULL DEFAULT 0,
  seo_title_en TEXT,
  seo_title_ar TEXT,
  seo_description_en TEXT,
  seo_description_ar TEXT,
  seo_keywords TEXT,
  reading_time_minutes INTEGER DEFAULT 5
);

-- Enable Row Level Security
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to published blogs
CREATE POLICY "Anyone can view published blogs" 
ON public.blogs 
FOR SELECT 
USING (status = 'published');

-- Create policy for admins to manage all blogs
CREATE POLICY "Admins can manage all blogs" 
ON public.blogs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_published_at ON public.blogs(published_at DESC);
CREATE INDEX idx_blogs_category ON public.blogs(category);
CREATE INDEX idx_blogs_status ON public.blogs(status);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blogs_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- File: 20251031162927_7c396555-3c90-444a-b69b-faee5aecb26e.sql

-- Drop and recreate handle_new_user function WITHOUT subscription logic
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Create or update profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- File: 20251031163016_dc554ec5-9321-43d1-8b0c-e600cc0c4aac.sql



-- File: 20251031163414_1dbca92b-9520-4e48-9cd9-b2a6857c2692.sql

-- Clean up legacy 'user' roles from user_roles table
-- Only keep buyer, buyer_individual, seller, and admin roles
DELETE FROM public.user_roles 
WHERE role NOT IN ('buyer', 'buyer_individual', 'seller', 'admin');

-- File: 20251101160911_40fb8082-d826-4447-912b-dcd678e3202d.sql

-- Add missing payment_method column
ALTER TABLE public.maintenance_requests 
ADD COLUMN payment_method text;

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Buyers can manage their own requests" ON public.maintenance_requests;

-- Create policy for INSERT
CREATE POLICY "Buyers can create their own requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for SELECT
CREATE POLICY "Buyers can view their own requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id);

-- Create policy for UPDATE
CREATE POLICY "Buyers can update their own requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Create policy for DELETE
CREATE POLICY "Buyers can delete their own requests"
ON public.maintenance_requests
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

-- File: 20251101174959_faa70904-e077-4b93-add8-6648fc86e65c.sql

-- Update handle_new_user function to handle all role assignments WITHOUT subscriptions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role app_role;
  buyer_account_type text;
BEGIN
  -- Get user type and buyer type from metadata
  user_role := (NEW.raw_user_meta_data->>'user_type')::app_role;
  buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';

  -- Create or update profile with data from metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      user_type    = EXCLUDED.user_type,
      phone        = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      buyer_type   = EXCLUDED.buyer_type;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assign the main user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If buyer with individual type, also add buyer_individual role
    IF user_role = 'buyer' AND buyer_account_type = 'individual' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'buyer_individual')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- File: 20251101182734_a63c9d0a-96d5-4212-8e47-4eaecbfdc022.sql

-- Ensure the trigger exists to call handle_new_user on auth.users insert
-- This trigger creates user profiles, roles, and trial subscriptions at signup

-- Drop existing trigger if it exists (to ensure clean recreation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- File: 20251102202645_9b50a35c-3e0b-41d6-ad93-d64c95994b6a.sql

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own tokens
CREATE POLICY "Users can view own verification tokens"
  ON public.email_verification_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role can manage all tokens"
  ON public.email_verification_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_email_verification_tokens_updated_at
  BEFORE UPDATE ON public.email_verification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update handle_new_user function WITHOUT subscription logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role app_role;
  buyer_account_type text;
BEGIN
  -- Get user type and buyer type from metadata
  user_role := (NEW.raw_user_meta_data->>'user_type')::app_role;
  buyer_account_type := NEW.raw_user_meta_data->>'buyer_type';

  -- Create or update profile with data from metadata
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    company_name,
    buyer_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    buyer_account_type
  )
  ON CONFLICT (id) DO UPDATE
  SET email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      user_type    = EXCLUDED.user_type,
      phone        = EXCLUDED.phone,
      company_name = EXCLUDED.company_name,
      buyer_type   = EXCLUDED.buyer_type;

  -- Ensure user has default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Assign the main user role if provided
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If buyer with individual type, also add buyer_individual role
    IF user_role = 'buyer' AND buyer_account_type = 'individual' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'buyer_individual')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- File: 20251112153933_34f30311-e66b-418c-9e10-26ef128fedd3.sql


-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_ar TEXT,
  excerpt TEXT NOT NULL,
  excerpt_ar TEXT,
  content TEXT NOT NULL,
  content_ar TEXT,
  category TEXT NOT NULL,
  category_ar TEXT,
  tags TEXT[] DEFAULT '{}',
  tags_ar TEXT[] DEFAULT '{}',
  author_name TEXT NOT NULL,
  author_name_ar TEXT,
  author_avatar TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reading_time INTEGER DEFAULT 5,
  featured_image TEXT,
  views INTEGER DEFAULT 0,
  meta_description TEXT,
  meta_description_ar TEXT,
  meta_keywords TEXT[] DEFAULT '{}',
  meta_keywords_ar TEXT[] DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Blog posts are viewable by everyone" 
ON public.blog_posts 
FOR SELECT 
USING (published = true);

-- Create policy for authenticated users to view all posts (including unpublished)
CREATE POLICY "Authenticated users can view all blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create index for faster queries
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- File: 20251113103855_a40802fd-1cc4-4f1f-ac9f-465815138755.sql

-- Add block-based editor fields to blogs table
ALTER TABLE public.blogs 
ADD COLUMN IF NOT EXISTS blocks_en JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blocks_ar JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN public.blogs.blocks_en IS 'JSON array of content blocks for English version';
COMMENT ON COLUMN public.blogs.blocks_ar IS 'JSON array of content blocks for Arabic version';
COMMENT ON COLUMN public.blogs.scheduled_at IS 'Scheduled publish date/time';


-- File: 20251126165003_d339195c-6afd-4a36-8a1c-61799d564355.sql

-- Create saved_vendors table for buyers to save their favorite service providers
CREATE TABLE IF NOT EXISTS public.saved_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.saved_vendors ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own saved vendors
CREATE POLICY "Buyers can view their saved vendors"
  ON public.saved_vendors
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Buyers can save vendors
CREATE POLICY "Buyers can save vendors"
  ON public.saved_vendors
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can unsave vendors
CREATE POLICY "Buyers can unsave vendors"
  ON public.saved_vendors
  FOR DELETE
  USING (auth.uid() = buyer_id);

-- Add index for performance
CREATE INDEX idx_saved_vendors_buyer_id ON public.saved_vendors(buyer_id);
CREATE INDEX idx_saved_vendors_seller_id ON public.saved_vendors(seller_id);

-- File: 20251126170624_6e32e479-df2f-4fc2-90fd-c9910381792a.sql

-- Create saved_buyers table for sellers to save buyers they want to work with
CREATE TABLE IF NOT EXISTS public.saved_buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.saved_buyers ENABLE ROW LEVEL SECURITY;

-- Sellers can save buyers
CREATE POLICY "Sellers can save buyers"
ON public.saved_buyers
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can unsave buyers
CREATE POLICY "Sellers can unsave buyers"
ON public.saved_buyers
FOR DELETE
USING (auth.uid() = seller_id);

-- Sellers can view their saved buyers
CREATE POLICY "Sellers can view their saved buyers"
ON public.saved_buyers
FOR SELECT
USING (auth.uid() = seller_id);

-- File: 20251126173159_0d3662ee-3e0d-43d1-8fef-f47878e2fa3b.sql

-- Add RLS policy to allow sellers to view buyer profiles in business contexts
-- This allows sellers to see buyer info for requests they're viewing/quoting on

CREATE POLICY "Sellers can view buyer profiles for public requests"
ON public.profiles
FOR SELECT
USING (
  -- Allow viewing profiles of buyers who have public maintenance requests
  EXISTS (
    SELECT 1 
    FROM maintenance_requests mr 
    WHERE mr.buyer_id = profiles.id 
    AND mr.visibility = 'public'
    AND mr.status = 'open'
  )
);

-- Add policy to allow buyers to view seller profiles that are discoverable
CREATE POLICY "Buyers can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  user_type = 'seller' 
  AND (discoverable = true OR discoverable IS NULL)
);

-- File: 20251126175633_63298916-f0b4-44ae-9f04-db0f32ea47a7.sql

-- Fix RLS policies for profiles table to allow viewing discoverable seller profiles
DROP POLICY IF EXISTS "Buyers can view discoverable seller profiles" ON public.profiles;
DROP POLICY IF EXISTS "Sellers can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view discoverable seller profiles" ON public.profiles;

-- Create comprehensive policy for viewing seller profiles
CREATE POLICY "Anyone can view discoverable seller profiles"
ON public.profiles
FOR SELECT
USING (
  (user_type IN ('seller', 'both')) 
  AND (discoverable = true OR discoverable IS NULL)
);

-- File: 20251126180042_87012318-c487-473c-af7d-daa2feb476ea.sql

-- Drop the previous policy
DROP POLICY IF EXISTS "Anyone can view discoverable seller profiles" ON public.profiles;

-- Create a comprehensive policy that works for both authenticated and anonymous users
CREATE POLICY "Authenticated users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable IS NOT FALSE)
);

-- Also allow anonymous users to view discoverable sellers
CREATE POLICY "Anonymous users can view discoverable sellers"
ON public.profiles
FOR SELECT
TO anon
USING (
  (user_type = 'seller' OR user_type = 'both') 
  AND (discoverable = true)
);

-- File: 20251126184602_fb8ba4c9-d46a-4f4d-9f67-66428d215d06.sql

-- Add avatar_seed column to profiles table for custom avatar selection
ALTER TABLE public.profiles 
ADD COLUMN avatar_seed TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.avatar_seed IS 'Custom avatar seed for DiceBear API (e.g., warrior, hero, explorer)';

-- Ensure user_preferences table has SAR as default currency
-- Check if table exists and add default if needed
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    -- Add default to preferred_currency if column exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences' 
      AND column_name = 'preferred_currency'
    ) THEN
      ALTER TABLE public.user_preferences 
      ALTER COLUMN preferred_currency SET DEFAULT 'SAR';
    END IF;
  END IF;
END $$;

-- File: 20251127092413_4bb5cf04-da82-4e1e-a906-b36eb55418de.sql

-- Add completion tracking fields to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add completion tracking fields to booking_requests
ALTER TABLE booking_requests
ADD COLUMN IF NOT EXISTS buyer_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_marked_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS seller_completion_date timestamptz,
ADD COLUMN IF NOT EXISTS work_started_at timestamptz,
ADD COLUMN IF NOT EXISTS seller_on_way_at timestamptz;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_seller ON maintenance_requests(assigned_seller_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_completion ON maintenance_requests(buyer_marked_complete, seller_marked_complete);
CREATE INDEX IF NOT EXISTS idx_booking_requests_completion ON booking_requests(buyer_marked_complete, seller_marked_complete);

-- File: 20251127142341_f3ca56fd-ce72-4fc1-95f8-0a0d7d66c99a.sql

-- Add halted status support to maintenance_requests
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Add halted status support to booking_requests
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS halted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS halted_at timestamptz,
ADD COLUMN IF NOT EXISTS halted_reason text,
ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- File: 20251128081623_83c0ed7a-67a7-47d0-a663-030a879168aa.sql

-- Add new columns to profiles table for services, cities, and user preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services_pricing jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_cities text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'SAR';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_date_format text DEFAULT 'gregorian';

COMMENT ON COLUMN profiles.services_pricing IS 'JSON array storing service pricing info: { category: string, price: number, duration: string, available: boolean }[]';
COMMENT ON COLUMN profiles.service_cities IS 'Array of city names the seller serves';
COMMENT ON COLUMN profiles.preferred_currency IS 'User preferred currency (SAR, USD, etc)';
COMMENT ON COLUMN profiles.push_notifications_enabled IS 'Whether user wants push notifications';
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether user wants email notifications';
COMMENT ON COLUMN profiles.preferred_date_format IS 'Date format preference: gregorian or hijri';

-- File: 20251128083522_77316f4f-541d-4388-89a2-9e59e167933b.sql

-- Phase 1: Critical RLS & Database Security (Fixed)

-- 1. Strengthen profiles RLS - only expose limited seller info publicly
CREATE POLICY "Public can view limited seller profiles"
ON profiles FOR SELECT
USING (
  user_type = 'seller' 
  AND discoverable = true
);

-- 2. Add transaction verification for reviews
CREATE POLICY "Reviews require completed transaction"
ON seller_reviews FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.buyer_id = auth.uid()
    AND contracts.seller_id = seller_reviews.seller_id
    AND contracts.status = 'executed'
  ) OR EXISTS (
    SELECT 1 FROM booking_requests
    WHERE booking_requests.buyer_id = auth.uid()
    AND booking_requests.seller_id = seller_reviews.seller_id
    AND booking_requests.status = 'completed'
    AND booking_requests.buyer_marked_complete = true
    AND booking_requests.seller_marked_complete = true
  )
);

-- 3. Prevent self-assignment of admin role
CREATE POLICY "Prevent self-assignment of admin role"
ON user_roles FOR INSERT
WITH CHECK (
  role != 'admin' OR 
  has_role(auth.uid(), 'admin')
);

-- 4. Add audit logging trigger for contracts (drop first if exists)
DROP TRIGGER IF EXISTS audit_contract_changes ON contracts;

CREATE OR REPLACE FUNCTION log_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    old_data, 
    new_data,
    ip_address
  ) VALUES (
    auth.uid(), 
    TG_OP, 
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    to_jsonb(OLD), 
    to_jsonb(NEW),
    inet_client_addr()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_contract_changes
AFTER INSERT OR UPDATE OR DELETE ON contracts
FOR EACH ROW
EXECUTE FUNCTION log_contract_changes();

-- 5. Add content hash verification column
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS content_hash_verified boolean DEFAULT false;

-- 6. Add profile visibility controls
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'limited'));

-- File: 20251128121130_dd2d6bd4-3efb-4d9d-bbf0-8b55be8da0c4.sql

-- ================================================
-- PRE-PUBLICATION SECURITY & PERFORMANCE FIXES
-- ================================================

-- 1. Fix Subscription RLS - Prevent Self-Upgrade


-- 2. Add Performance Indexes
-- Index for maintenance_requests queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_id 
ON maintenance_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status 
ON maintenance_requests(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_city 
ON maintenance_requests(city);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_category 
ON maintenance_requests(category);

-- Index for quote_submissions queries
CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_id 
ON quote_submissions(seller_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_request_id 
ON quote_submissions(request_id);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_status 
ON quote_submissions(status);

-- Index for booking_requests queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_id 
ON booking_requests(seller_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_buyer_id 
ON booking_requests(buyer_id);

CREATE INDEX IF NOT EXISTS idx_booking_requests_status 
ON booking_requests(status);

-- Index for messages queries
CREATE INDEX IF NOT EXISTS idx_messages_quote_id 
ON messages(quote_id);

CREATE INDEX IF NOT EXISTS idx_messages_booking_id 
ON messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

-- Index for contracts queries
CREATE INDEX IF NOT EXISTS idx_contracts_buyer_id 
ON contracts(buyer_id);

CREATE INDEX IF NOT EXISTS idx_contracts_seller_id 
ON contracts(seller_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status 
ON contracts(status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_status 
ON maintenance_requests(buyer_id, status);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_seller_status 
ON quote_submissions(seller_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_requests_seller_status 
ON booking_requests(seller_id, status);

-- File: 20251128150525_5216ffb0-6592-4214-8422-4edf4343c3da.sql

-- Update RLS policy to allow deletion of open and in_review requests
DROP POLICY IF EXISTS "Buyers can cancel their own requests" ON maintenance_requests;

CREATE POLICY "Buyers can delete their open or in-review requests"
ON maintenance_requests
FOR DELETE
USING (
  auth.uid() = buyer_id 
  AND status IN ('open', 'in_review')
);

-- File: 20251129080312_a34c2a18-2f96-4e76-a347-551947121e46.sql

-- Add contract negotiation columns
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS proposed_edits JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS edit_notes TEXT;

-- File: 20251129101537_a0652e0b-d2a1-4557-87e5-80b3e8d3e47d.sql

-- Drop the seller_public_profiles view to fix SECURITY DEFINER security issue
-- This view was not being used in the application code and bypasses RLS policies
DROP VIEW IF EXISTS public.seller_public_profiles;

-- File: 20251129102309_1196e2aa-0605-4847-8c0d-670c16f25e6f.sql

-- Add version column to booking_requests for optimistic locking
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index on version for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_version ON booking_requests(id, version);

-- Create function to update booking with optimistic locking
CREATE OR REPLACE FUNCTION update_booking_with_lock(
  p_booking_id UUID,
  p_new_status TEXT,
  p_expected_version INTEGER,
  p_updates JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(success BOOLEAN, current_version INTEGER) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows_updated INTEGER;
  v_current_version INTEGER;
BEGIN
  -- Attempt to update with version check
  UPDATE booking_requests
  SET 
    status = p_new_status,
    version = version + 1,
    updated_at = now(),
    -- Apply additional updates from JSONB if provided
    seller_response = COALESCE((p_updates->>'seller_response')::TEXT, seller_response),
    seller_counter_proposal = COALESCE((p_updates->>'seller_counter_proposal')::JSONB, seller_counter_proposal),
    buyer_counter_proposal = COALESCE((p_updates->>'buyer_counter_proposal')::JSONB, buyer_counter_proposal),
    responded_at = CASE WHEN p_new_status IN ('accepted', 'declined', 'counter_proposed') THEN now() ELSE responded_at END
  WHERE id = p_booking_id 
    AND version = p_expected_version
  RETURNING version INTO v_current_version;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated > 0 THEN
    RETURN QUERY SELECT true, v_current_version;
  ELSE
    -- Get current version to return to caller
    SELECT version INTO v_current_version FROM booking_requests WHERE id = p_booking_id;
    RETURN QUERY SELECT false, COALESCE(v_current_version, p_expected_version);
  END IF;
END;
$$;

-- File: 20251201174738_1fd5e097-7c06-4797-a07e-863f149f17c5.sql

-- Phase 1: Add unique constraints to prevent duplicate contracts
CREATE UNIQUE INDEX contracts_request_id_unique 
ON contracts (request_id) 
WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX contracts_booking_id_unique 
ON contracts (booking_id) 
WHERE booking_id IS NOT NULL;

-- File: 20251201181749_2707c516-9c5b-4c73-95f5-3a283b82b4e2.sql

-- Add RLS policy to allow sellers to view maintenance_requests for their executed contracts
-- This fixes the issue where sellers can't see active jobs because requests change status from 'open' to 'in_progress'

CREATE POLICY "Sellers can view requests for their executed contracts"
ON maintenance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.request_id = maintenance_requests.id
    AND contracts.seller_id = auth.uid()
    AND contracts.status = 'executed'
  )
);

-- File: 20251201185318_6dbe7b50-0aa3-4b5b-9270-8dbb04216e06.sql

-- Phase 1: Fix corrupted data - update requests where contract is executed but request isn't
UPDATE maintenance_requests mr
SET 
  status = 'in_progress',
  assigned_seller_id = c.seller_id
FROM contracts c
WHERE c.request_id = mr.id
  AND c.status = 'executed'
  AND (mr.status != 'in_progress' OR mr.assigned_seller_id IS NULL);

-- Phase 2: Trigger to automatically activate jobs when contract is executed
CREATE OR REPLACE FUNCTION activate_job_on_contract_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- When contract becomes executed, update the associated request/booking
  IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
    IF NEW.request_id IS NOT NULL THEN
      UPDATE maintenance_requests
      SET status = 'in_progress',
          assigned_seller_id = NEW.seller_id,
          updated_at = now()
      WHERE id = NEW.request_id;
    END IF;
    
    IF NEW.booking_id IS NOT NULL THEN
      UPDATE booking_requests
      SET status = 'accepted',
          updated_at = now()
      WHERE id = NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_contract_executed
  AFTER UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION activate_job_on_contract_execution();

-- Phase 3: Constraint to prevent invalid contract execution
CREATE OR REPLACE FUNCTION prevent_invalid_execution()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent setting status to 'executed' without both signatures
  IF NEW.status = 'executed' AND (NEW.signed_at_buyer IS NULL OR NEW.signed_at_seller IS NULL) THEN
    RAISE EXCEPTION 'Cannot execute contract without both signatures';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_contract_execution
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_invalid_execution();

-- File: 20251201193939_609515ff-686e-4e12-8cff-701a6fc81203.sql

-- Add RLS policy to allow assigned sellers to update their jobs
CREATE POLICY "Assigned sellers can update job status"
ON maintenance_requests
FOR UPDATE
USING (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
)
WITH CHECK (
  assigned_seller_id = auth.uid() AND status = 'in_progress'
);

-- File: 20251202192711_b833478c-ea36-45cc-949c-f8ec37305120.sql

-- Create message-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can view attachments in messages they have access to
CREATE POLICY "Users can view message attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);

-- RLS policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- File: 20251202193809_a0dfa166-4dd5-4786-802e-b0737807e643.sql

-- Add payload column to messages table for attachments (images, files, location)
ALTER TABLE public.messages 
ADD COLUMN payload jsonb DEFAULT NULL;

-- File: 20251203132244_7312dbb8-3cf0-4f9b-9f6e-301b7a015eb2.sql

-- Update message-attachments bucket to be public for file access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'message-attachments';

-- File: 20251206101033_2d6efc7f-12ba-4aa8-81a5-3942e9de7193.sql

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

-- File: 20251207165250_7921cfc3-7f9d-47ea-9f49-e447ae38c52a.sql

-- Add resolution approval columns for dual-party resolution
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS buyer_approved_resolution boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_approved_resolution boolean DEFAULT false;

-- Create user_addresses table for address management
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  full_address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own addresses
CREATE POLICY "Users can view own addresses" ON public.user_addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses" ON public.user_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses" ON public.user_addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses" ON public.user_addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-resolve halted jobs when both parties approve
CREATE OR REPLACE FUNCTION public.auto_resolve_halted_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.buyer_approved_resolution = true AND NEW.seller_approved_resolution = true AND NEW.halted = true THEN
    NEW.halted := false;
    NEW.resolved_at := now();
    NEW.buyer_approved_resolution := false;
    NEW.seller_approved_resolution := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for auto-resolution
DROP TRIGGER IF EXISTS auto_resolve_booking_halted ON booking_requests;
CREATE TRIGGER auto_resolve_booking_halted
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();

DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
CREATE TRIGGER auto_resolve_request_halted
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_halted_job();

-- File: 20251211152731_6cec84e3-b7d9-42a0-9778-ddec20b79a60.sql

-- Create function to increment seller completed projects when both parties confirm
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- For maintenance_requests, use assigned_seller_id
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    -- For booking_requests, use seller_id
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Create trigger for booking_requests
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;
CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Also update verified_reviews_count when a review is added
CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  -- Check if seller reached 10 reviews - award founding member badge
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for seller_reviews
DROP TRIGGER IF EXISTS increment_reviews_count ON seller_reviews;
CREATE TRIGGER increment_reviews_count
  AFTER INSERT ON seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_reviews_count();

-- File: 20251211152744_dbe52de7-6573-436b-bc1d-582ab34af964.sql

-- Fix search_path for functions
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
BEGIN
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    IF TG_TABLE_NAME = 'maintenance_requests' AND NEW.assigned_seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.assigned_seller_id;
    END IF;
    
    IF TG_TABLE_NAME = 'booking_requests' AND NEW.seller_id IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = NEW.seller_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_seller_reviews_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles 
  SET verified_reviews_count = COALESCE(verified_reviews_count, 0) + 1,
      updated_at = now()
  WHERE id = NEW.seller_id;
  
  IF (SELECT COALESCE(verified_reviews_count, 0) FROM public.profiles WHERE id = NEW.seller_id) >= 10 THEN
    UPDATE public.profiles
    SET founding_member = true,
        badges = COALESCE(badges, '[]'::jsonb) || '["founding_member", "elite_pro"]'::jsonb,
        elite_badge_expiry = NOW() + INTERVAL '1 year'
    WHERE id = NEW.seller_id
      AND (founding_member IS NULL OR founding_member = false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- File: 20251213142301_19b6b51f-f11a-406f-a2e8-ad1d3360d4cc.sql

-- Add RLS policy for buyers to mark their maintenance_requests as complete
CREATE POLICY "Buyers can mark their requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND status = 'in_progress')
WITH CHECK (auth.uid() = buyer_id AND status = 'in_progress');

-- Also add a policy for updating status to completed when buyer_marked_complete is true
CREATE POLICY "Buyers can complete their in_progress requests"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = buyer_id AND assigned_seller_id IS NOT NULL)
WITH CHECK (auth.uid() = buyer_id);

-- File: 20251213144851_c0a1e06b-8bef-4d2d-b1fc-099a4bebbf43.sql

-- RLS policy to allow buyers to mark their in_progress requests as complete
CREATE POLICY "Buyers can mark their in_progress requests complete"
ON public.maintenance_requests
FOR UPDATE
USING (
  auth.uid() = buyer_id 
  AND status = 'in_progress'
  AND assigned_seller_id IS NOT NULL
)
WITH CHECK (
  auth.uid() = buyer_id
);

-- File: 20251213151210_10ad7bcd-3093-4f61-9e6c-66a305046a5a.sql

-- Allow sellers to delete their own pending quotes
CREATE POLICY "Sellers can delete their own pending quotes"
ON public.quote_submissions
FOR DELETE
USING (auth.uid() = seller_id AND status = 'pending');

-- File: 20251220175800_add_revision_request_columns.sql

-- Add revision request columns to quote_submissions table
-- These columns support the simplified "Ask for Revision" flow

ALTER TABLE quote_submissions
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;

-- Add 'revision_requested' to the valid status values
-- First, check if the status column is using an enum type
-- If using text, this comment documents the valid values:
-- Valid statuses: 'pending', 'revision_requested', 'accepted', 'rejected'

COMMENT ON COLUMN quote_submissions.revision_message IS 'Message from buyer explaining what changes they want to the quote';
COMMENT ON COLUMN quote_submissions.revision_requested_at IS 'Timestamp when buyer requested a revision';


-- File: 20251222120000_add_journey_stage_tracking.sql

-- Add stage tracking columns to track what stage each user has last seen
-- This enables the "dopamine timeline" feature that shows progress animations
-- only when users reach NEW stages they haven't seen before

-- Track buyer and seller progress visibility for booking flows
ALTER TABLE booking_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Track buyer and seller progress visibility for request/quote flows
ALTER TABLE maintenance_requests 
  ADD COLUMN IF NOT EXISTS buyer_last_seen_stage INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS seller_last_seen_stage INTEGER DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN booking_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN booking_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.buyer_last_seen_stage IS 'Last stage index the buyer has seen (0-3), used for journey timeline overlay';
COMMENT ON COLUMN maintenance_requests.seller_last_seen_stage IS 'Last stage index the seller has seen (0-3), used for journey timeline overlay';


-- File: 20251222230000_reload_schema.sql

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';


-- File: 20251222_update_quote_submissions.sql

-- Add start_date and attachments columns to quote_submissions table
ALTER TABLE "public"."quote_submissions" 
ADD COLUMN IF NOT EXISTS "start_date" date,
ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;

-- Create a storage bucket for quote attachments if it doesn't exist
INSERT INTO "storage"."buckets" ("id", "name", "public")
VALUES ('quote-attachments', 'quote-attachments', true)
ON CONFLICT ("id") DO NOTHING;

-- Set up security policies for the storage bucket (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Quote attachments are publicly accessible" ON "storage"."objects";
CREATE POLICY "Quote attachments are publicly accessible" ON "storage"."objects"
  FOR SELECT USING (bucket_id = 'quote-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload quote attachments" ON "storage"."objects";
CREATE POLICY "Authenticated users can upload quote attachments" ON "storage"."objects"
  FOR INSERT WITH CHECK (bucket_id = 'quote-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can update their own quote attachments" ON "storage"."objects"
  FOR UPDATE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own quote attachments" ON "storage"."objects";
CREATE POLICY "Users can delete their own quote attachments" ON "storage"."objects"
  FOR DELETE USING (bucket_id = 'quote-attachments' AND auth.uid() = owner);


-- File: 20251223120000_enable_public_profiles.sql

-- Enable read access for all authenticated users to view profiles
-- This is necessary for buyers to see seller information (name, avatar, rating) in quotes.

create policy "Profiles are viewable by everyone"
on "public"."profiles"
for select
to authenticated
using ( true );

-- Also allow public access if needed for unauthenticated views (optional, but sticking to authenticated for now)
-- If the app allows unauthenticated browsing of requests/quotes, we might need 'public' role too.


-- File: 20251223130000_auto_confirm_users.sql

-- Create a function to auto-confirm users
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$;

-- Create a trigger that runs before the user is inserted
drop trigger if exists on_auth_user_created_auto_confirm on auth.users;
create trigger on_auth_user_created_auto_confirm
  before insert on auth.users
  for each row execute procedure public.auto_confirm_user();


-- File: 20251223230000_fix_audit_logs.sql

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON audit_logs(table_name);

-- RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to admins
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Allow system/triggers to insert (auth.uid() might be null for system actions, but usually triggers run as user)
-- Since the function is SECURITY DEFINER, we don't strictly need a policy for the trigger if it bypasses RLS,
-- but standard insert policy for safety:
CREATE POLICY "Users can insert their own audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);


-- File: 20251224_fix_booking_status_check_v2.sql

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


-- File: 20251225_add_request_photos.sql

-- Create storage bucket for request photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-photos',
  'request-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for quote attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quote_attachments',
  'quote_attachments', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Users can upload request photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own request photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for quote attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own quote attachments" ON storage.objects;

-- Allow authenticated users to upload to their own folder (request-photos)
CREATE POLICY "Users can upload request photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (request-photos)
CREATE POLICY "Public read access for request photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'request-photos');

-- Allow users to delete their own photos (request-photos)
CREATE POLICY "Users can delete own request photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'request-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to upload to their own folder (quote_attachments)
CREATE POLICY "Users can upload quote attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (quote_attachments)
CREATE POLICY "Public read access for quote attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'quote_attachments');

-- Allow users to delete their own attachments (quote_attachments)
CREATE POLICY "Users can delete own quote attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote_attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add photos column to maintenance_requests if it doesn't exist
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;

-- Add attachments column to quote_submissions if it doesn't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT NULL;


-- File: 20251226_add_booking_photos.sql

-- Add photos column to booking_requests if it doesn't exist
ALTER TABLE booking_requests 
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT NULL;


-- File: 20251226_add_revision_requested_status.sql

-- Add 'revision_requested' to quote_submissions status check constraint
-- This allows buyers to request revisions to seller quotes

-- Drop the existing constraint
ALTER TABLE quote_submissions DROP CONSTRAINT IF EXISTS quote_submissions_status_check;

-- Add the updated constraint with revision_requested
ALTER TABLE quote_submissions ADD CONSTRAINT quote_submissions_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'revision_requested', 'expired', 'withdrawn'));

-- Also add the revision_message and revision_requested_at columns if they don't exist
ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS revision_message TEXT,
ADD COLUMN IF NOT EXISTS revision_requested_at TIMESTAMPTZ;


-- File: 20251226_quote_previous_values.sql

-- Add columns to store previous quote values before revision
-- This allows showing the difference when seller updates the quote

ALTER TABLE quote_submissions 
ADD COLUMN IF NOT EXISTS previous_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS previous_duration TEXT,
ADD COLUMN IF NOT EXISTS previous_proposal TEXT;


-- File: 20251226_quote_update_policy.sql

-- Add RLS policy for sellers to update their own quotes
-- This allows sellers to update quote_submissions where they are the seller

-- First, ensure RLS is enabled on the table
ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing update policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Sellers can update their own quotes" ON quote_submissions;

-- Create update policy for sellers
CREATE POLICY "Sellers can update their own quotes" ON quote_submissions
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

-- Also add select policy for sellers if not exists
DROP POLICY IF EXISTS "Sellers can view their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can view their own quotes" ON quote_submissions
FOR SELECT
USING (seller_id = auth.uid());

-- Buyers should also be able to view quotes for their requests
DROP POLICY IF EXISTS "Buyers can view quotes for their requests" ON quote_submissions;
CREATE POLICY "Buyers can view quotes for their requests" ON quote_submissions
FOR SELECT
USING (
  request_id IN (
    SELECT id FROM maintenance_requests WHERE buyer_id = auth.uid()
  )
);

-- Add DELETE policy for sellers to delete their own quotes
DROP POLICY IF EXISTS "Sellers can delete their own quotes" ON quote_submissions;
CREATE POLICY "Sellers can delete their own quotes" ON quote_submissions
FOR DELETE
USING (seller_id = auth.uid());


-- File: 20251227_buyer_completion_policy.sql

-- DIAGNOSTIC: Find and fix ALL triggers on maintenance_requests that reference seller_id
-- The error is: 'record "new" has no field "seller_id"'

-- Step 1: List all triggers on maintenance_requests (run this first to see what exists)
-- SELECT trigger_name, event_manipulation, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'maintenance_requests';

-- Step 2: Drop ALL potential problematic triggers on maintenance_requests
DROP TRIGGER IF EXISTS increment_completed_projects_request ON maintenance_requests;
DROP TRIGGER IF EXISTS activate_request_warranty ON maintenance_requests;
DROP TRIGGER IF EXISTS auto_resolve_request_halted ON maintenance_requests;
DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_sync_request_buyer_info ON maintenance_requests;
DROP TRIGGER IF EXISTS trg_update_seller_stats ON maintenance_requests;
DROP TRIGGER IF EXISTS update_seller_stats_trigger ON maintenance_requests;
DROP TRIGGER IF EXISTS update_completed_projects_trigger ON maintenance_requests;

-- Also drop triggers on booking_requests for consistency  
DROP TRIGGER IF EXISTS increment_completed_projects_booking ON booking_requests;

-- Step 3: Drop ALL functions that might reference seller_id incorrectly
DROP FUNCTION IF EXISTS increment_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS update_seller_completed_projects() CASCADE;
DROP FUNCTION IF EXISTS increment_completed_projects() CASCADE;

-- Step 4: Recreate the function with CORRECT column references
CREATE OR REPLACE FUNCTION increment_seller_completed_projects()
RETURNS trigger AS $$
DECLARE
  seller_id_val uuid;
BEGIN
  -- Only trigger when both parties have marked complete for the first time
  IF NEW.buyer_marked_complete = true 
     AND NEW.seller_marked_complete = true 
     AND (OLD.buyer_marked_complete = false OR OLD.buyer_marked_complete IS NULL 
          OR OLD.seller_marked_complete = false OR OLD.seller_marked_complete IS NULL) THEN
    
    -- Determine the seller ID based on table name
    IF TG_TABLE_NAME = 'maintenance_requests' THEN
      seller_id_val := NEW.assigned_seller_id;
    ELSIF TG_TABLE_NAME = 'booking_requests' THEN
      seller_id_val := NEW.seller_id;
    ELSE
      seller_id_val := NULL;
    END IF;
    
    -- Update seller's completed projects count
    IF seller_id_val IS NOT NULL THEN
      UPDATE public.profiles 
      SET completed_projects = COALESCE(completed_projects, 0) + 1,
          updated_at = now()
      WHERE id = seller_id_val;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Recreate triggers
CREATE TRIGGER increment_completed_projects_request
  AFTER UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

CREATE TRIGGER increment_completed_projects_booking
  AFTER UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_seller_completed_projects();

-- Step 6: Fix the activate_warranty_on_completion function if it exists
DROP FUNCTION IF EXISTS activate_warranty_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION activate_warranty_on_completion()
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

-- Recreate warranty triggers
CREATE TRIGGER activate_request_warranty
  BEFORE UPDATE ON maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

CREATE TRIGGER activate_booking_warranty
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION activate_warranty_on_completion();

-- Step 7: Add RLS policies for buyer completion updates
DROP POLICY IF EXISTS "Buyers can mark requests complete" ON maintenance_requests;
DROP POLICY IF EXISTS "Buyers can mark bookings complete" ON booking_requests;

CREATE POLICY "Buyers can mark requests complete"
ON maintenance_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Buyers can mark bookings complete"
ON booking_requests
FOR UPDATE
USING (buyer_id = auth.uid())
WITH CHECK (buyer_id = auth.uid());


-- File: 20251227_contract_withdraw_policy.sql

-- Migration: Allow buyers to delete contracts in pending_seller status
-- This enables the "Withdraw Signature" feature

-- Drop existing delete policy if any
DROP POLICY IF EXISTS "Buyers can delete pending_seller contracts" ON contracts;

-- Allow buyers to delete their own contracts when status is pending_seller
CREATE POLICY "Buyers can delete pending_seller contracts"
ON contracts
FOR DELETE
TO authenticated
USING (
  buyer_id = auth.uid() 
  AND status = 'pending_seller'
);

-- Also allow deleting binding_terms for contracts being withdrawn
DROP POLICY IF EXISTS "Users can delete binding_terms for their contracts" ON binding_terms;

CREATE POLICY "Users can delete binding_terms for their contracts"
ON binding_terms
FOR DELETE
TO authenticated
USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE buyer_id = auth.uid() 
    OR seller_id = auth.uid()
  )
);

-- Allow users to insert notifications for other parties in their contracts
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;

CREATE POLICY "Users can notify other parties in contracts"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- Can insert notifications for sellers in contracts where user is the buyer
  user_id IN (
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
  )
);


-- File: 20251227_create_reviews.sql

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    reviewed_id UUID NOT NULL REFERENCES public.profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reviews_contract_id ON public.reviews(contract_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON public.reviews(reviewed_id);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert reviews for their contracts" ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM public.contracts c
            WHERE c.id = contract_id
            AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        )
    );

CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT TO public
    USING (true);


-- File: 20251227_fix_duplicate_notifications.sql

-- Drop duplicate triggers found in previous migrations
DROP TRIGGER IF EXISTS on_contract_created ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated ON public.contracts;
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Improved notification function that checks auth.uid()
CREATE OR REPLACE FUNCTION public.notify_contract_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify seller if they didn't create it (prevent self-notification)
  IF NEW.seller_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.seller_id, 'contract_created', 'New Contract', 'A service contract has been created', NEW.id);
  END IF;

  -- Notify buyer if they didn't create it (prevent self-notification)
  IF NEW.buyer_id != auth.uid() THEN
      INSERT INTO notifications (user_id, notification_type, title, message, content_id)
      VALUES (NEW.buyer_id, 'contract_created', 'New Contract', 'Your service contract is ready for review', NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate single trigger for creation
CREATE TRIGGER on_contract_created_notify
  AFTER INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_created();

-- Recreate single trigger for updates (ensuring no duplicates there either)
CREATE TRIGGER on_contract_version_updated_notify
  AFTER UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.notify_contract_version_updated();


-- File: 20251229_comprehensive_notification_policy.sql

-- Migration: Comprehensive notification insert policy for all users
-- Fixes 403 Forbidden error when trying to send notifications

-- Drop all existing insert policies for notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

-- Create a comprehensive policy that allows authenticated users to insert notifications
-- for parties they have legitimate business relationships with
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create notification for anyone they have a relationship with:
  user_id IN (
    -- Sellers in contracts where user is buyer
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in contracts where user is seller
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
    UNION
    -- Sellers in bookings where user is buyer
    SELECT seller_id FROM booking_requests WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in bookings where user is seller
    SELECT buyer_id FROM booking_requests WHERE seller_id = auth.uid()
    UNION
    -- Buyers who made requests the user quoted
    SELECT mr.buyer_id FROM maintenance_requests mr
    JOIN quote_submissions qs ON qs.request_id = mr.id
    WHERE qs.seller_id = auth.uid()
    UNION
    -- Sellers who quoted on user's requests
    SELECT qs.seller_id FROM quote_submissions qs
    JOIN maintenance_requests mr ON qs.request_id = mr.id
    WHERE mr.buyer_id = auth.uid()
    UNION
    -- User can also create notifications for themselves
    SELECT auth.uid()
  )
);


-- File: 20251229_disable_contract_notification_triggers.sql

-- Migration: Disable contract creation notification triggers to prevent duplicates
-- The front-end handles contract notifications now with duplicate prevention

-- Drop the contract creation notification trigger
DROP TRIGGER IF EXISTS on_contract_created_notify ON public.contracts;

-- Drop the contract version updated notification trigger
DROP TRIGGER IF EXISTS on_contract_version_updated_notify ON public.contracts;

-- Optional: Keep the functions but they won't be triggered
-- This allows re-enabling if needed later


-- File: 20251230_contract_completion_policy.sql

-- Allow buyers and sellers to update contract status to 'completed'
-- This is necessary for the contract progress tracker to show the correct completion state

-- Policy for updating contracts
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;

CREATE POLICY "Users can update their own contracts"
ON contracts
FOR UPDATE
USING (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
)
WITH CHECK (
  auth.uid() = buyer_id OR 
  auth.uid() = seller_id
);


-- File: 20251230_fix_calendar_event_trigger.sql

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


-- File: 20251231_fix_contract_status.sql

-- Fix contract statuses based on signature timestamps
-- This normalizes contracts where the status doesn't match the signature state
-- Contracts where buyer signed but seller hasn't -> should be pending_seller
UPDATE contracts
SET status = 'pending_seller'
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NULL
    AND status NOT IN (
        'pending_seller',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where seller signed but buyer hasn't -> should be pending_buyer
UPDATE contracts
SET status = 'pending_buyer'
WHERE signed_at_seller IS NOT NULL
    AND signed_at_buyer IS NULL
    AND status NOT IN (
        'pending_buyer',
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );
-- Contracts where both signed but not executed -> should be executed
UPDATE contracts
SET status = 'executed',
    executed_at = COALESCE(
        executed_at,
        GREATEST(signed_at_buyer, signed_at_seller)
    )
WHERE signed_at_buyer IS NOT NULL
    AND signed_at_seller IS NOT NULL
    AND status NOT IN (
        'executed',
        'completed',
        'cancelled',
        'rejected',
        'terminated'
    );

-- File: 20251231_normalize_contract_status.sql

-- Migration: Update old 'active' contracts to 'executed'
-- This migration normalizes all contract statuses to use the modern 'executed' value
-- Step 1: Update all contracts with status='active' to status='executed'
UPDATE contracts
SET status = 'executed',
    updated_at = NOW()
WHERE status = 'active';
-- Verify the update (optional, for logging)
-- SELECT COUNT(*) as updated_count FROM contracts WHERE status = 'executed';

-- File: 20260102_add_contract_id_to_reviews.sql

-- Add contract_id column to seller_reviews for better duplicate prevention
ALTER TABLE public.seller_reviews
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE
SET NULL;
-- Create unique constraint to prevent duplicate reviews per contract
-- This ensures only one review per contract
CREATE UNIQUE INDEX IF NOT EXISTS seller_reviews_contract_id_unique ON public.seller_reviews (contract_id)
WHERE contract_id IS NOT NULL;
-- Also create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_seller_reviews_contract_id ON public.seller_reviews(contract_id);

-- File: 20260103_fix_booking_notifications.sql

-- Comprehensive cleanup of booking notification triggers
DO $$ BEGIN -- Drop all known variations of booking status triggers
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_booking_status_change_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_seller_booking_request_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_notification_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_request_updated ON public.booking_requests';
END $$;
-- Redefine the notification function to use valid keys and cleaner logic
CREATE OR REPLACE FUNCTION public.notify_booking_status_change() RETURNS TRIGGER AS $$ BEGIN -- New booking created
    IF TG_OP = 'INSERT' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_received',
        'booking_received',
        'booking_received',
        NEW.id
    );
RETURN NEW;
END IF;
-- Status changed
IF OLD.status IS DISTINCT
FROM NEW.status THEN -- Only notify on specific status changes
    IF NEW.status = 'accepted' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_accepted',
        'booking_accepted',
        'booking_accepted',
        NEW.id
    );
ELSIF NEW.status = 'declined' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_declined',
        'booking_declined',
        'booking_declined',
        NEW.id
    );
ELSIF NEW.status = 'cancelled' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_cancelled',
        'booking_cancelled',
        'booking_cancelled',
        NEW.id
    );
ELSIF NEW.status = 'counter_proposed' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'counter_proposal_received',
        'counter_proposal_received',
        'counter_proposal_received',
        NEW.id
    );
ELSIF NEW.status = 'buyer_countered' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'buyer_counter_received',
        'buyer_counter_received',
        'buyer_counter_received',
        NEW.id
    );
ELSIF OLD.status = 'pending'
AND NEW.status != 'pending' THEN -- Catch-all for other updates from pending (e.g. detailed updates)
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_updated',
        'booking_updated',
        'booking_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Recreate Single Trigger with V2 name to ensure uniqueness
CREATE TRIGGER on_booking_status_change_v2
AFTER
INSERT
    OR
UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();

-- File: 20260103_quote_update_notification.sql

-- Create notification trigger for quote updates (seller updates a quote)
-- This notifies the buyer when their quote has been modified
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_quote_update ON public.quote_submissions;
-- Function to create notification when quote is updated
CREATE OR REPLACE FUNCTION public.notify_quote_update() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE buyer_id UUID;
request_title TEXT;
BEGIN -- Only trigger if meaningful fields changed (price, description, duration, status)
IF (
    OLD.price IS DISTINCT
    FROM NEW.price
        OR OLD.description IS DISTINCT
    FROM NEW.description
        OR OLD.proposal IS DISTINCT
    FROM NEW.proposal
        OR OLD.estimated_duration IS DISTINCT
    FROM NEW.estimated_duration
        OR OLD.start_date IS DISTINCT
    FROM NEW.start_date
        OR (
            OLD.status = 'revision_requested'
            AND NEW.status = 'pending'
        )
) THEN -- Get buyer_id and request title
SELECT mr.buyer_id,
    COALESCE(mr.title, 'your request') INTO buyer_id,
    request_title
FROM maintenance_requests mr
WHERE mr.id = NEW.request_id;
-- Create notification for buyer using localization keys
IF buyer_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        content_id
    )
VALUES (
        buyer_id,
        'quote_updated',
        -- Use type as title for client-side translation
        'quote_updated',
        -- Use type as message for client-side translation
        'quote_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Create trigger for quote updates
CREATE TRIGGER on_quote_update
AFTER
UPDATE ON public.quote_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_quote_update();

-- File: 20260106_user_reports.sql

-- Create user_reports table for content moderation
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        content_type TEXT NOT NULL,
        -- 'profile', 'message', 'quote', 'request', 'booking', 'image'
        content_id UUID NOT NULL,
        -- ID of the reported item
        reported_user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        -- Who is being reported
        reason TEXT NOT NULL,
        -- 'inappropriate_image', 'harassment', 'spam', 'scam', 'other'
        details TEXT,
        -- User's additional context
        evidence_urls TEXT [],
        -- Optional screenshot URLs
        status TEXT DEFAULT 'pending' CHECK (
            status IN ('pending', 'reviewed', 'resolved', 'dismissed')
        ),
        resolution_notes TEXT,
        resolved_by UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
-- Policy: Any authenticated user can insert a report
CREATE POLICY "Users can create reports" ON public.user_reports FOR
INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports" ON public.user_reports FOR
SELECT TO authenticated USING (auth.uid() = reporter_id);
-- Policy: Admins can view all reports
CREATE POLICY "Admins can view all reports" ON public.user_reports FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- Policy: Admins can update reports
CREATE POLICY "Admins can update reports" ON public.user_reports FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_roles
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
-- Trigger for updated_at
CREATE TRIGGER update_user_reports_updated_at BEFORE
UPDATE ON public.user_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- File: 20260108_rollback_job_issues.sql

-- ROLLBACK SCRIPT 
-- Run this in Supabase SQL Editor to undo all changes from the Job Issue Resolution System
-- 1. Drop Tables (Cascade to remove policies and indexes)
DROP TABLE IF EXISTS job_issues CASCADE;
DROP TABLE IF EXISTS job_events CASCADE;
-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS raise_issue;
DROP FUNCTION IF EXISTS respond_to_issue;
DROP FUNCTION IF EXISTS close_issue;
DROP FUNCTION IF EXISTS reopen_issue;
-- 3. Drop Helper Functions
DROP FUNCTION IF EXISTS map_outcome_to_type;
DROP FUNCTION IF EXISTS calculate_issue_deadline;
DROP FUNCTION IF EXISTS capture_context_snapshot;
DROP FUNCTION IF EXISTS is_issue_counterparty;
DROP FUNCTION IF EXISTS is_job_participant;
-- 4. Drop Processing Functions
DROP FUNCTION IF EXISTS process_issue_timeouts;
DROP FUNCTION IF EXISTS update_seller_reliability;
-- 5. Remove Columns from Profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS reliability_rate,
    DROP COLUMN IF EXISTS total_jobs_30d,
    DROP COLUMN IF EXISTS incidents_30d,
    DROP COLUMN IF EXISTS on_time_rate,
    DROP COLUMN IF EXISTS first_issue_raised_at,
    DROP COLUMN IF EXISTS first_issue_received_at;
-- Confirmation
SELECT 'Rollback successful: Job Issue System removed' as result;

-- File: 20260208_seller_online_status.sql

-- Migration: Add seller online status tracking fields
-- Required for the seller home state-machine (online toggle and time tracking)
-- Add is_online field to track seller availability
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
-- Add went_online_at to track when seller went online (for time tracking)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS went_online_at TIMESTAMPTZ;
-- Add service_radius to track seller's coverage area (in km)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 5;
-- Create index for finding online sellers efficiently  
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles (is_online)
WHERE is_online = true;
-- Add comment for documentation
COMMENT ON COLUMN profiles.is_online IS 'Whether the seller is currently active and accepting job opportunities';
COMMENT ON COLUMN profiles.went_online_at IS 'Timestamp when the seller last went online, used for calculating time online';
COMMENT ON COLUMN profiles.service_radius IS 'Service radius in kilometers for opportunity matching';

-- File: 20260227_matching_pricing_tables.sql

-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
-- 1. Pricing & Financial Data Models
CREATE TABLE IF NOT EXISTS fee_policy_versions (
    id text PRIMARY KEY,
    fee_mode text NOT NULL,
    -- 'free_intro', 'flat_fee', 'performance_fee'
    flat_fee_amount numeric,
    performance_model_key text,
    is_active boolean DEFAULT false,
    starts_at timestamptz DEFAULT now(),
    ends_at timestamptz,
    notes text
);
CREATE TABLE IF NOT EXISTS category_pricing_bands (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id text NOT NULL,
    subcategory_id text,
    city_id text,
    display_mode text NOT NULL DEFAULT 'range',
    -- 'range', 'inspection', 'starts_from'
    min_amount numeric,
    max_amount numeric,
    starts_from_amount numeric,
    uncertainty_level text DEFAULT 'medium',
    -- 'low', 'medium', 'high'
    buyer_note text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_financials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL UNIQUE,
    seller_id uuid REFERENCES auth.users(id),
    -- Price inputs
    seller_estimate_accept_amount numeric,
    seller_final_claim_amount numeric,
    buyer_confirmed_paid_amount numeric,
    -- Fee outputs
    fee_model_version text REFERENCES fee_policy_versions(id),
    fee_mode text,
    fee_trigger text,
    actual_fee_amount numeric DEFAULT 0,
    simulated_fee_amount numeric,
    provider_net_amount numeric,
    -- Derived metrics
    est_to_buyer_gap_amount numeric,
    est_to_buyer_gap_pct numeric,
    seller_to_buyer_gap_amount numeric,
    seller_to_buyer_gap_pct numeric,
    pricing_outcome_status text,
    calculated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- 2. Dispatch Data Models
CREATE TABLE IF NOT EXISTS job_dispatch_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    -- 'booking' or 'request'
    dispatch_status text DEFAULT 'pending_match',
    -- 'pending_match', 'dispatching_wave_1', 'awaiting_seller_response', 'assignment_confirmed', 'no_seller_found', 'dispatch_cancelled'
    current_wave_number int DEFAULT 0,
    eligible_count_initial int DEFAULT 0,
    accepted_seller_id uuid REFERENCES auth.users(id),
    started_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    failure_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(job_id, job_type)
);
CREATE TABLE IF NOT EXISTS job_dispatch_offers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_session_id uuid REFERENCES job_dispatch_sessions(id) ON DELETE CASCADE,
    job_id uuid NOT NULL,
    job_type text NOT NULL,
    seller_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    wave_number int NOT NULL,
    rank_position_at_send int,
    match_score_at_send numeric,
    offer_status text DEFAULT 'sent',
    -- 'sent', 'delivered', 'seen', 'declined', 'expired', 'accepted', 'auto_closed'
    sent_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    responded_at timestamptz,
    response_type text,
    decline_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(dispatch_session_id, seller_id)
);
-- RLS Policies
ALTER TABLE fee_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_pricing_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dispatch_offers ENABLE ROW LEVEL SECURITY;
-- Allow read access for category pricing to everyone
CREATE POLICY "Pricing bands are readable by everyone" ON category_pricing_bands FOR
SELECT USING (true);
-- Allow authenticated users to view dispatch offers sent to them
CREATE POLICY "Sellers can view their own dispatch offers" ON job_dispatch_offers FOR
SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Sellers can update their own dispatch offers" ON job_dispatch_offers FOR
UPDATE TO authenticated USING (seller_id = auth.uid());
-- Buyers can view dispatch sessions they initiated (checked via accepted_seller_id or auth)
CREATE POLICY "Authenticated users can view dispatch sessions" ON job_dispatch_sessions FOR
SELECT TO authenticated USING (true);
-- Function to handle atomic job acceptance (Race Condition Lock)
-- NOTE: The job status update (maintenance_requests/booking_requests) is handled in app code
CREATE OR REPLACE FUNCTION accept_job_offer(p_offer_id uuid, p_seller_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_job_id uuid;
v_job_type text;
v_offer_status text;
v_session_status text;
BEGIN -- 1. Lock the offer row and check its status
SELECT dispatch_session_id,
    job_id,
    job_type,
    offer_status INTO v_session_id,
    v_job_id,
    v_job_type,
    v_offer_status
FROM job_dispatch_offers
WHERE id = p_offer_id
    AND seller_id = p_seller_id FOR
UPDATE;
IF v_offer_status IS NULL THEN RAISE EXCEPTION 'Offer not found';
END IF;
IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN RAISE EXCEPTION 'Offer is no longer available (status: %)',
v_offer_status;
END IF;
-- 2. Lock the session row to prevent race conditions
SELECT dispatch_status INTO v_session_status
FROM job_dispatch_sessions
WHERE id = v_session_id FOR
UPDATE;
IF v_session_status = 'assignment_confirmed' THEN -- Another seller already accepted this job
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE id = p_offer_id;
RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
END IF;
-- 3. We are the winner! Update the session
UPDATE job_dispatch_sessions
SET dispatch_status = 'assignment_confirmed',
    accepted_seller_id = p_seller_id,
    ended_at = now(),
    updated_at = now()
WHERE id = v_session_id;
-- 4. Update the winning offer
UPDATE job_dispatch_offers
SET offer_status = 'accepted',
    responded_at = now(),
    response_type = 'accept',
    updated_at = now()
WHERE id = p_offer_id;
-- 5. Auto-close all other offers for this session
UPDATE job_dispatch_offers
SET offer_status = 'auto_closed',
    updated_at = now()
WHERE dispatch_session_id = v_session_id
    AND id != p_offer_id
    AND offer_status IN ('sent', 'delivered', 'seen');
-- Return job info so app code can update the job record
RETURN jsonb_build_object(
    'accepted',
    true,
    'job_id',
    v_job_id,
    'job_type',
    v_job_type,
    'session_id',
    v_session_id
);
END;
$$;
-- Function to create a dispatch session and insert offers for given seller IDs
-- Seller ranking/filtering is done in app code; this just records the dispatch
CREATE OR REPLACE FUNCTION start_job_dispatch(
        p_job_id uuid,
        p_job_type text,
        p_seller_ids uuid [],
        p_wave_size int DEFAULT 3
    ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_session_id uuid;
v_seller_id uuid;
v_rank int := 0;
v_eligible_count int;
BEGIN -- 1. Create Dispatch Session
INSERT INTO job_dispatch_sessions (
        job_id,
        job_type,
        dispatch_status,
        current_wave_number
    )
VALUES (p_job_id, p_job_type, 'dispatching_wave_1', 1)
RETURNING id INTO v_session_id;
-- 2. Insert offers for each seller (up to wave_size)
FOREACH v_seller_id IN ARRAY p_seller_ids LOOP v_rank := v_rank + 1;
EXIT
WHEN v_rank > p_wave_size;
INSERT INTO job_dispatch_offers (
        dispatch_session_id,
        job_id,
        job_type,
        seller_id,
        wave_number,
        rank_position_at_send,
        offer_status,
        expires_at
    )
VALUES (
        v_session_id,
        p_job_id,
        p_job_type,
        v_seller_id,
        1,
        v_rank,
        'sent',
        now() + interval '3 minutes'
    );
END LOOP;
-- 3. Update eligible count
SELECT count(*) INTO v_eligible_count
FROM job_dispatch_offers
WHERE dispatch_session_id = v_session_id;
UPDATE job_dispatch_sessions
SET eligible_count_initial = v_eligible_count
WHERE id = v_session_id;
IF v_eligible_count = 0 THEN
UPDATE job_dispatch_sessions
SET dispatch_status = 'no_seller_found',
    ended_at = now()
WHERE id = v_session_id;
END IF;
RETURN v_session_id;
END;
$$;
-- 3. Insert Initial Bootstrapping Data for Pricing Bands
INSERT INTO category_pricing_bands (
        category_id,
        display_mode,
        min_amount,
        max_amount,
        starts_from_amount,
        uncertainty_level
    )
VALUES ('Plumbing', 'range', 100, 300, 100, 'medium'),
    ('Electrical', 'range', 150, 400, 150, 'medium'),
    (
        'Cleaning',
        'starts_from',
        null,
        null,
        150,
        'low'
    ),
    (
        'AC Maintenance',
        'starts_from',
        null,
        null,
        120,
        'low'
    );
-- Seed Phase 0 Fee Policy
INSERT INTO fee_policy_versions (id, fee_mode, is_active, notes)
VALUES (
        'v1_free_intro',
        'free_intro',
        true,
        'Introductory period, no actual fees charged'
    );