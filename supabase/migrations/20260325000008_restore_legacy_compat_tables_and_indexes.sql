-- ============================================================
-- Request-only schema hardening for MaintMENA mobile app.
-- The active app uses maintenance_requests, request messages,
-- seller_reviews, notifications, and dispatch offers.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_request_only_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  payload jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_reviews
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rating integer,
  ADD COLUMN IF NOT EXISTS review_text text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view request messages" ON public.messages;
CREATE POLICY "Participants can view request messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = messages.request_id
      AND (mr.buyer_id = auth.uid() OR mr.assigned_seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants can insert request messages" ON public.messages;
CREATE POLICY "Participants can insert request messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = messages.request_id
      AND (mr.buyer_id = auth.uid() OR mr.assigned_seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants can update request messages" ON public.messages;
CREATE POLICY "Participants can update request messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  OR auth.uid() = recipient_id
  OR EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = messages.request_id
      AND (mr.buyer_id = auth.uid() OR mr.assigned_seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Anyone can view seller reviews" ON public.seller_reviews;
CREATE POLICY "Anyone can view seller reviews"
ON public.seller_reviews
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Buyers can create seller reviews for their requests" ON public.seller_reviews;
CREATE POLICY "Buyers can create seller reviews for their requests"
ON public.seller_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND (
    request_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = seller_reviews.request_id
        AND mr.buyer_id = auth.uid()
        AND mr.assigned_seller_id = seller_reviews.seller_id
    )
  )
);

DROP POLICY IF EXISTS "Buyers can update their own seller reviews" ON public.seller_reviews;
CREATE POLICY "Buyers can update their own seller reviews"
ON public.seller_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can delete their own seller reviews" ON public.seller_reviews;
CREATE POLICY "Buyers can delete their own seller reviews"
ON public.seller_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = buyer_id);

DROP TRIGGER IF EXISTS set_messages_updated_at ON public.messages;
CREATE TRIGGER set_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_request_only_updated_at();

DROP TRIGGER IF EXISTS set_seller_reviews_updated_at ON public.seller_reviews;
CREATE TRIGGER set_seller_reviews_updated_at
BEFORE UPDATE ON public.seller_reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_request_only_updated_at();

CREATE INDEX IF NOT EXISTS idx_messages_request_created_at
ON public.messages(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_request_unread
ON public.messages(request_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
ON public.messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_created_at
ON public.seller_reviews(seller_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_reviews_buyer_seller_request_unique
ON public.seller_reviews(buyer_id, seller_id, request_id)
WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_status_created_at
ON public.maintenance_requests(buyer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_status_start
ON public.maintenance_requests(assigned_seller_id, status, preferred_start_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_buyer_complete
ON public.maintenance_requests(buyer_id, buyer_marked_complete, buyer_completion_date DESC);

CREATE INDEX IF NOT EXISTS idx_job_dispatch_offers_seller_status_sent_at
ON public.job_dispatch_offers(seller_id, job_type, offer_status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
ON public.notifications(user_id, created_at DESC);
