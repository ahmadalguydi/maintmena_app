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