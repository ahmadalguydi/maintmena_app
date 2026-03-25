CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

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

CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('brief_read', 'signal_view', 'tender_view', 'content_watch', 'signal_bookmark', 'tender_bookmark')),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('brief', 'signal', 'tender', 'educational_content')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_interests TEXT[],
  notification_settings JSONB DEFAULT '{"email": true, "push": false, "new_briefs": true, "tender_deadlines": true, "new_signals": true}'::jsonb,
  content_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.brief_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, signal_id)
);

CREATE TABLE IF NOT EXISTS public.brief_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, tender_id)
);

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

CREATE TABLE IF NOT EXISTS public.saved_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(seller_id, request_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

Create table for tracking signals and tenders
CREATE TABLE IF NOT EXISTS public.tracked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('signal', 'tender')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

CREATE TABLE IF NOT EXISTS public.request_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

Create table to track negotiation offers per quote
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

CREATE TABLE IF NOT EXISTS public.request_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

Create table to track per-user completion state of action items from signals/tenders
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

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.saved_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.saved_buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, buyer_id)
);

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

CREATE TABLE IF NOT EXISTS public.seller_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

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

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    reviewed_id UUID NOT NULL REFERENCES public.profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

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

CREATE TABLE public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('brief_read', 'signal_view', 'tender_view', 'content_watch', 'signal_bookmark', 'tender_bookmark')),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('brief', 'signal', 'tender', 'educational_content')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  industry_interests TEXT[],
  notification_settings JSONB DEFAULT '{"email": true, "push": false, "new_briefs": true, "tender_deadlines": true, "new_signals": true}'::jsonb,
  content_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.brief_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, signal_id)
);

CREATE TABLE IF NOT EXISTS public.brief_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, tender_id)
);

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

CREATE TABLE IF NOT EXISTS public.saved_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(seller_id, request_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

Create table for tracking signals and tenders
CREATE TABLE IF NOT EXISTS public.tracked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('signal', 'tender')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

CREATE TABLE IF NOT EXISTS public.request_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

Create table to track negotiation offers per quote
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

CREATE TABLE IF NOT EXISTS public.request_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

Create table to track per-user completion state of action items from signals/tenders
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

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.saved_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.saved_buyers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(seller_id, buyer_id)
);

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

CREATE TABLE IF NOT EXISTS public.seller_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id),
  achievement_type text NOT NULL,
  achievement_name text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

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

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
    reviewed_id UUID NOT NULL REFERENCES public.profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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