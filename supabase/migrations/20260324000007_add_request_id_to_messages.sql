-- ============================================================
-- Add request_id to messages table
-- Dispatch-flow jobs have no quote_submissions row, so the
-- previous code couldn't link a message thread to a request.
-- This column lets MessageThread work with direct requests.
--
-- This migration may run before the later request-only hardening
-- migration that creates public.messages. Create the canonical table
-- here as well so fresh database rebuilds do not fail on ALTER TABLE.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text,
  payload jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS request_id uuid
        REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;

-- Index for fast lookup by request
CREATE INDEX IF NOT EXISTS idx_messages_request_id
    ON public.messages (request_id)
    WHERE request_id IS NOT NULL;

COMMENT ON COLUMN public.messages.request_id IS
    'Links message thread directly to a maintenance_request (dispatch flow, no quote)';
