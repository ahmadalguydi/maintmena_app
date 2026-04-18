-- Push notification support:
-- 1. Add push_tokens table used by native/web registration flows
-- 2. Expand notifications.notification_type constraint to match active app code

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'median')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token
  ON public.push_tokens (token);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
  ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'push_tokens'
      AND policyname = 'Users manage own push tokens'
  ) THEN
    CREATE POLICY "Users manage own push tokens"
      ON public.push_tokens
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (
    notification_type = ANY (
      ARRAY[
        'new_brief',
        'tender_deadline',
        'new_signal',
        'system',
        'job_offer',
        'job_accepted',
        'job_completed',
        'new_message',
        'job_dispatched',
        'job_status_updated',
        'seller_on_way',
        'seller_arrived',
        'price_approval_needed',
        'job_halted',
        'job_resolution_progress',
        'job_resolved',
        'job_cancelled',
        'review_received',
        'scheduled_job_reminder',
        'earnings_milestone',
        'first_job_completed',
        'profile_incomplete_reminder',
        'review_prompt_reminder',
        'booking_response',
        'quote_revision_requested',
        'warranty_nudge',
        'auto_close'
      ]
    )
  );
