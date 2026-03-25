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