-- ============================================================
-- Add request_id to messages table
-- Dispatch-flow jobs have no quote_submissions row, so the
-- previous code couldn't link a message thread to a request.
-- This column lets MessageThread work with direct requests.
-- ============================================================

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS request_id uuid
        REFERENCES public.maintenance_requests(id) ON DELETE CASCADE;

-- Index for fast lookup by request
CREATE INDEX IF NOT EXISTS idx_messages_request_id
    ON public.messages (request_id)
    WHERE request_id IS NOT NULL;

COMMENT ON COLUMN public.messages.request_id IS
    'Links message thread directly to a maintenance_request (dispatch flow, no quote)';
