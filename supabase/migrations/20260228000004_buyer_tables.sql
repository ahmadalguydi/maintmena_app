-- ============================================================
-- Migration: Buyer-Side Tables
-- Creates: maintenance_requests, notifications, user_preferences
-- Safe to run: tables use IF NOT EXISTS; policies are idempotent
-- because tables are new (policies can't already exist).
-- ============================================================
-- ─── maintenance_requests ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    service_type TEXT,
    urgency TEXT NOT NULL DEFAULT 'medium' CHECK (
        urgency IN (
            'low',
            'medium',
            'high',
            'critical',
            'asap',
            'urgent',
            'emergency',
            'flexible',
            'normal',
            'scheduled'
        )
    ),
    location TEXT NOT NULL DEFAULT '',
    city TEXT,
    budget NUMERIC,
    estimated_budget_min NUMERIC,
    estimated_budget_max NUMERIC,
    preferred_start_date TIMESTAMPTZ,
    project_duration_days INTEGER,
    deadline TIMESTAMPTZ,
    photos JSONB DEFAULT '[]'::jsonb,
    visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (
        status IN ('open', 'in_progress', 'completed', 'cancelled')
    ),
    facility_type TEXT,
    scope_of_work TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mr_status ON public.maintenance_requests (status);
CREATE INDEX IF NOT EXISTS idx_mr_category ON public.maintenance_requests (category);
CREATE INDEX IF NOT EXISTS idx_mr_buyer ON public.maintenance_requests (buyer_id);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can insert own requests" ON public.maintenance_requests FOR
INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can view own requests" ON public.maintenance_requests FOR
SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own requests" ON public.maintenance_requests FOR
UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view open requests" ON public.maintenance_requests FOR
SELECT TO authenticated USING (
        status = 'open'
        AND visibility = 'public'
    );
-- ─── notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'system' CHECK (
        notification_type IN (
            'new_brief',
            'tender_deadline',
            'new_signal',
            'system',
            'job_offer',
            'job_accepted',
            'job_completed',
            'new_message'
        )
    ),
    content_id UUID,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, read);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR
UPDATE USING (auth.uid() = user_id);
-- ─── user_preferences ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_currency TEXT DEFAULT 'SAR',
    preferred_language TEXT DEFAULT 'ar',
    industry_interests TEXT [],
    notification_settings JSONB DEFAULT '{
    "email": true,
    "push": true,
    "new_briefs": true,
    "tender_deadlines": true,
    "new_signals": true,
    "job_offers": true
  }'::jsonb,
    content_preferences JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Backfill default preferences for all existing users
INSERT INTO public.user_preferences (user_id, preferred_currency, preferred_language)
SELECT id,
    'SAR',
    'ar'
FROM auth.users
WHERE NOT EXISTS (
        SELECT 1
        FROM public.user_preferences p
        WHERE p.user_id = auth.users.id
    ) ON CONFLICT (user_id) DO NOTHING;