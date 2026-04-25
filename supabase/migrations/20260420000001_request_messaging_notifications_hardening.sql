-- ============================================================
-- Request-only messaging and notifications hardening
--
-- Product contract:
--   buyer submits request -> dispatch -> seller accepts with an
--   estimated price -> assigned request/job messaging.
-- No quote, booking negotiation, contract, explore, or subscription
-- messaging model is part of the active app flow.
-- ============================================================

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

UPDATE public.messages
SET content = trim(coalesce(content, ''))
WHERE content IS NULL OR content <> trim(content);

ALTER TABLE public.messages
  ALTER COLUMN is_read SET DEFAULT false,
  ALTER COLUMN is_read SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view request messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert request messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update request messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can mark received request messages read" ON public.messages;

CREATE POLICY "Participants can view request messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = messages.request_id
      AND (mr.buyer_id = auth.uid() OR mr.assigned_seller_id = auth.uid())
  )
);

CREATE POLICY "Participants can insert request messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.maintenance_requests mr
    WHERE mr.id = request_id
      AND (
        mr.assigned_seller_id IS NOT NULL
        AND (
          mr.buyer_id = auth.uid()
          OR mr.assigned_seller_id = auth.uid()
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.set_request_message_recipient()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id uuid;
  v_seller_id uuid;
BEGIN
  NEW.content := trim(coalesce(NEW.content, ''));

  IF NEW.request_id IS NULL THEN
    RAISE EXCEPTION 'request_id is required for messages';
  END IF;

  IF NEW.sender_id IS NULL OR NEW.sender_id <> auth.uid() THEN
    RAISE EXCEPTION 'sender_id must match the authenticated user';
  END IF;

  IF char_length(NEW.content) = 0 OR char_length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'message content must be between 1 and 5000 characters';
  END IF;

  IF NEW.payload IS NOT NULL AND jsonb_typeof(NEW.payload) <> 'object' THEN
    RAISE EXCEPTION 'message payload must be a JSON object';
  END IF;

  SELECT buyer_id, assigned_seller_id
    INTO v_buyer_id, v_seller_id
    FROM public.maintenance_requests
   WHERE id = NEW.request_id;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'request not found';
  END IF;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'request has no assigned seller yet';
  END IF;

  IF NEW.sender_id = v_buyer_id THEN
    NEW.recipient_id := v_seller_id;
  ELSIF NEW.sender_id = v_seller_id THEN
    NEW.recipient_id := v_buyer_id;
  ELSE
    RAISE EXCEPTION 'only request participants can message';
  END IF;

  NEW.is_read := false;
  NEW.read_at := NULL;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_request_message_recipient ON public.messages;
CREATE TRIGGER set_request_message_recipient
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_request_message_recipient();

CREATE OR REPLACE FUNCTION public.notify_new_request_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = NEW.recipient_id
      AND n.notification_type = 'new_message'
      AND n.content_id = NEW.request_id
      AND n.created_at > now() - interval '30 seconds'
  ) THEN
    INSERT INTO public.notifications (
      user_id,
      notification_type,
      title,
      message,
      content_id
    )
    VALUES (
      NEW.recipient_id,
      'new_message',
      'New message',
      left(NEW.content, 240),
      NEW.request_id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_request_message ON public.messages;
CREATE TRIGGER notify_new_request_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_request_message();

CREATE OR REPLACE FUNCTION public.mark_request_messages_read(p_request_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.messages
     SET is_read = true,
         read_at = coalesce(read_at, now()),
         updated_at = now()
   WHERE request_id = p_request_id
     AND recipient_id = auth.uid()
     AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE public.notifications
     SET read = true
   WHERE user_id = auth.uid()
     AND notification_type = 'new_message'
     AND content_id = p_request_id
     AND read = false;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_request_messages_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  UPDATE public.messages
     SET is_read = true,
         read_at = coalesce(read_at, now()),
         updated_at = now()
   WHERE recipient_id = auth.uid()
     AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE public.notifications
     SET read = true
   WHERE user_id = auth.uid()
     AND notification_type = 'new_message'
     AND read = false;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_conversations(user_uuid uuid)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  last_message text,
  last_message_at timestamptz,
  unread_count integer,
  other_user_name text,
  other_user_avatar text,
  other_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_uuid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH visible_messages AS (
    SELECT
      m.*,
      row_number() OVER (PARTITION BY m.request_id ORDER BY m.created_at DESC) AS rn,
      count(*) FILTER (
        WHERE m.recipient_id = user_uuid AND m.is_read = false
      ) OVER (PARTITION BY m.request_id) AS unread_count
    FROM public.messages m
    JOIN public.maintenance_requests mr ON mr.id = m.request_id
    WHERE mr.buyer_id = user_uuid OR mr.assigned_seller_id = user_uuid
  ),
  last_messages AS (
    SELECT *
    FROM visible_messages
    WHERE rn = 1
  )
  SELECT
    lm.request_id AS id,
    lm.request_id,
    lm.content AS last_message,
    lm.created_at AS last_message_at,
    lm.unread_count::integer AS unread_count,
    coalesce(
      nullif(p.full_name, ''),
      nullif(p.company_name, ''),
      'MaintMENA user'
    ) AS other_user_name,
    p.avatar_url AS other_user_avatar,
    p.id AS other_user_id
  FROM last_messages lm
  JOIN public.maintenance_requests mr ON mr.id = lm.request_id
  LEFT JOIN public.profiles p
    ON p.id = CASE
      WHEN mr.buyer_id = user_uuid THEN mr.assigned_seller_id
      ELSE mr.buyer_id
    END
  ORDER BY lm.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_request_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_request_messages_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_conversations(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_messages_request_created_at
ON public.messages(request_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread_created_at
ON public.messages(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created_at
ON public.messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_content_created_at
ON public.notifications(user_id, notification_type, content_id, created_at DESC);

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (
    notification_type = ANY (
      ARRAY[
        'system',
        'new_message',
        'job_dispatched',
        'job_accepted',
        'job_status_updated',
        'seller_on_way',
        'seller_arrived',
        'price_approval_needed',
        'job_halted',
        'job_resolution_progress',
        'job_resolved',
        'job_completed',
        'job_cancelled',
        'review_received',
        'scheduled_job_reminder',
        'earnings_milestone',
        'first_job_completed',
        'profile_incomplete_reminder',
        'review_prompt_reminder',
        'warranty_nudge',
        'auto_close'
      ]
    )
  ) NOT VALID;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.job_dispatch_offers;
EXCEPTION
  WHEN duplicate_object OR undefined_object THEN NULL;
END $$;
