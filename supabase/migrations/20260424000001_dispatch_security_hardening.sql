-- ============================================================
-- Dispatch and completion security hardening
--
-- Active product model:
--   buyer maintenance request -> dispatch offers -> seller accepts
--   with an estimate -> seller enters final paid amount -> buyer
--   confirms and shares a completion code.
--
-- Deprecated marketplace quote/book-specific-vendor flows are not
-- trusted entry points.
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('admin'::public.app_role);
$$;

GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Profiles include email and phone. Public profile browsing belonged to the
-- old marketplace model, so profile reads are now limited to the account
-- owner, admins, and the counterpart on an assigned maintenance request.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Request participants can view counterpart profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Request participants can view counterpart profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.maintenance_requests mr
       WHERE (
         mr.buyer_id = auth.uid()
         AND mr.assigned_seller_id = profiles.id
       )
       OR (
         mr.assigned_seller_id = auth.uid()
         AND mr.buyer_id = profiles.id
       )
    )
  );

-- Only service providers should see dispatchable requests. The old policy
-- allowed every authenticated account to read every open public request row.
DROP POLICY IF EXISTS "Sellers can view open requests" ON public.maintenance_requests;
CREATE POLICY "Service providers can view dispatchable requests"
  ON public.maintenance_requests
  FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    AND assigned_seller_id IS NULL
    AND status IN ('open', 'submitted', 'dispatching')
    AND (
      public.has_role('seller'::public.app_role)
      OR public.is_admin()
    )
  );

-- Dispatch sessions should not be globally readable by every logged-in user.
DROP POLICY IF EXISTS "Authenticated users can view dispatch sessions" ON public.job_dispatch_sessions;
CREATE POLICY "Participants can view dispatch sessions"
  ON public.job_dispatch_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
        FROM public.maintenance_requests mr
       WHERE mr.id = job_dispatch_sessions.job_id
         AND job_dispatch_sessions.job_type = 'request'
         AND (mr.buyer_id = auth.uid() OR mr.assigned_seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
        FROM public.job_dispatch_offers offer
       WHERE offer.dispatch_session_id = job_dispatch_sessions.id
         AND offer.seller_id = auth.uid()
    )
  );

-- Prevent clients from mutating immutable dispatch-offer identity fields.
CREATE OR REPLACE FUNCTION public.prevent_dispatch_offer_identity_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.dispatch_session_id <> OLD.dispatch_session_id
     OR NEW.job_id <> OLD.job_id
     OR NEW.job_type <> OLD.job_type
     OR NEW.seller_id <> OLD.seller_id
     OR NEW.wave_number <> OLD.wave_number
     OR COALESCE(NEW.rank_position_at_send, -1) <> COALESCE(OLD.rank_position_at_send, -1)
  THEN
    RAISE EXCEPTION 'dispatch offer identity fields are immutable';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_dispatch_offer_identity_update ON public.job_dispatch_offers;
CREATE TRIGGER prevent_dispatch_offer_identity_update
BEFORE UPDATE ON public.job_dispatch_offers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_dispatch_offer_identity_update();

DROP POLICY IF EXISTS "Sellers can update their own dispatch offers" ON public.job_dispatch_offers;
CREATE POLICY "Sellers can decline or mark own dispatch offers seen"
  ON public.job_dispatch_offers
  FOR UPDATE
  TO authenticated
  USING (
    seller_id = auth.uid()
    AND offer_status IN ('sent', 'delivered', 'seen')
  )
  WITH CHECK (
    seller_id = auth.uid()
    AND (
      (offer_status = 'seen' AND response_type IS NULL)
      OR (offer_status = 'declined' AND response_type = 'decline')
    )
  );

-- Old marketplace self-acceptance is deprecated and accepted arbitrary seller IDs.
DO $$
BEGIN
  REVOKE EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.accept_marketplace_job(uuid, uuid) FROM authenticated;
EXCEPTION
  WHEN undefined_function THEN
    NULL;
END $$;
DROP FUNCTION IF EXISTS public.accept_marketplace_job(uuid, uuid);

CREATE OR REPLACE FUNCTION public.validate_seller_pricing(p_pricing jsonb)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_type text;
  v_min numeric;
  v_max numeric;
  v_fee numeric;
BEGIN
  IF p_pricing IS NULL THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_pricing) <> 'object' THEN
    RAISE EXCEPTION 'Pricing payload must be an object';
  END IF;

  v_type := p_pricing->>'type';

  IF v_type = 'fixed' THEN
    IF COALESCE(p_pricing->>'fixedPrice', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
      RAISE EXCEPTION 'Invalid fixed price';
    END IF;
    v_fee := (p_pricing->>'fixedPrice')::numeric;
    IF v_fee <= 0 OR v_fee > 100000 THEN
      RAISE EXCEPTION 'Fixed price out of range';
    END IF;
  ELSIF v_type = 'range' THEN
    IF COALESCE(p_pricing->>'minPrice', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
       OR COALESCE(p_pricing->>'maxPrice', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
    THEN
      RAISE EXCEPTION 'Invalid price range';
    END IF;
    v_min := (p_pricing->>'minPrice')::numeric;
    v_max := (p_pricing->>'maxPrice')::numeric;
    IF v_min <= 0 OR v_max <= v_min OR v_max > 100000 THEN
      RAISE EXCEPTION 'Price range out of range';
    END IF;
  ELSIF v_type = 'inspection' THEN
    IF COALESCE(p_pricing->>'freeInspection', '') NOT IN ('true', 'false') THEN
      RAISE EXCEPTION 'Invalid inspection pricing';
    END IF;

    IF p_pricing->>'freeInspection' = 'false' THEN
      IF COALESCE(p_pricing->>'inspectionFee', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
        RAISE EXCEPTION 'Invalid inspection fee';
      END IF;
      v_fee := (p_pricing->>'inspectionFee')::numeric;
      IF v_fee <= 0 OR v_fee > 100000 THEN
        RAISE EXCEPTION 'Inspection fee out of range';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown pricing type';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_job_dispatch(
  p_job_id uuid,
  p_job_type text,
  p_seller_ids uuid[],
  p_wave_size int DEFAULT 3,
  p_is_scheduled boolean DEFAULT false,
  p_scheduled_for timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_wave_sellers uuid[];
  v_seller_id uuid;
  v_rank int := 1;
  v_expires_at timestamptz;
  v_current_status text;
  v_buyer_id uuid;
  v_eligible_sellers uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_job_type <> 'request' THEN
    RAISE EXCEPTION 'Only maintenance request dispatch is supported';
  END IF;

  IF p_wave_size IS NULL OR p_wave_size < 1 OR p_wave_size > 20 THEN
    RAISE EXCEPTION 'Invalid dispatch wave size';
  END IF;

  SELECT buyer_id, status
    INTO v_buyer_id, v_current_status
    FROM public.maintenance_requests
   WHERE id = p_job_id
   FOR UPDATE;

  IF v_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_buyer_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the request owner or an admin can dispatch this request';
  END IF;

  IF v_current_status NOT IN ('open', 'submitted', 'no_seller_found', 'accepted') THEN
    RAISE EXCEPTION 'Request cannot be dispatched from its current status';
  END IF;

  SELECT COALESCE(array_agg(p.id ORDER BY array_position(p_seller_ids, p.id)), ARRAY[]::uuid[])
    INTO v_eligible_sellers
    FROM public.profiles p
   WHERE p.id = ANY(COALESCE(p_seller_ids, ARRAY[]::uuid[]))
     AND p.user_type = 'seller'
     AND COALESCE(p.is_online, false) = true;

  IF v_current_status IN ('open', 'submitted', 'no_seller_found', 'accepted') THEN
    UPDATE public.maintenance_requests
       SET status = 'dispatching',
           assigned_seller_id = CASE WHEN v_current_status = 'accepted' THEN NULL ELSE assigned_seller_id END,
           updated_at = now()
     WHERE id = p_job_id;
  END IF;

  INSERT INTO public.job_dispatch_sessions (
    job_id, job_type, dispatch_status, current_wave_number,
    eligible_count_initial, started_at, created_at, updated_at
  ) VALUES (
    p_job_id, p_job_type, 'dispatching_wave_1', 1,
    COALESCE(array_length(v_eligible_sellers, 1), 0), now(), now(), now()
  ) ON CONFLICT (job_id, job_type) DO UPDATE
  SET dispatch_status = 'dispatching_wave_1',
      current_wave_number = 1,
      eligible_count_initial = COALESCE(array_length(v_eligible_sellers, 1), 0),
      started_at = now(),
      updated_at = now()
  RETURNING id INTO v_session_id;

  IF array_length(v_eligible_sellers, 1) IS NULL THEN
    RETURN v_session_id;
  END IF;

  v_wave_sellers := v_eligible_sellers[1:LEAST(p_wave_size, array_length(v_eligible_sellers, 1))];
  v_expires_at := now() + CASE WHEN p_is_scheduled THEN interval '15 minutes' ELSE interval '5 minutes' END;

  FOREACH v_seller_id IN ARRAY v_wave_sellers LOOP
    INSERT INTO public.job_dispatch_offers (
      dispatch_session_id, job_id, job_type, seller_id,
      wave_number, rank_position_at_send, offer_status,
      sent_at, expires_at, created_at, updated_at
    ) VALUES (
      v_session_id, p_job_id, p_job_type, v_seller_id,
      1, v_rank, 'sent', now(), v_expires_at, now(), now()
    ) ON CONFLICT (dispatch_session_id, seller_id) DO NOTHING;
    v_rank := v_rank + 1;
  END LOOP;

  RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_job_dispatch(uuid, text, uuid[], int, boolean, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_job_offer(
  p_offer_id uuid,
  p_seller_id uuid,
  p_pricing jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_job_id uuid;
  v_job_type text;
  v_offer_status text;
  v_session_status text;
  v_current_status text;
  v_updated int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Seller ID must match authenticated user';
  END IF;

  IF NOT public.has_role('seller'::public.app_role) THEN
    RAISE EXCEPTION 'Only service providers can accept dispatch offers';
  END IF;

  PERFORM public.validate_seller_pricing(p_pricing);

  SELECT dispatch_session_id, job_id, job_type, offer_status
    INTO v_session_id, v_job_id, v_job_type, v_offer_status
    FROM public.job_dispatch_offers
   WHERE id = p_offer_id
     AND seller_id = auth.uid()
   FOR UPDATE;

  IF v_offer_status IS NULL THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_offer_status NOT IN ('sent', 'delivered', 'seen') THEN
    RAISE EXCEPTION 'Offer is no longer available';
  END IF;

  SELECT dispatch_status
    INTO v_session_status
    FROM public.job_dispatch_sessions
   WHERE id = v_session_id
   FOR UPDATE;

  IF v_session_status = 'assignment_confirmed' THEN
    UPDATE public.job_dispatch_offers
       SET offer_status = 'auto_closed', updated_at = now()
     WHERE id = p_offer_id;
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
  END IF;

  IF v_job_type <> 'request' THEN
    RAISE EXCEPTION 'Only maintenance request offers can be accepted';
  END IF;

  SELECT status
    INTO v_current_status
    FROM public.maintenance_requests
   WHERE id = v_job_id
   FOR UPDATE;

  IF v_current_status NOT IN ('dispatching', 'open', 'submitted') THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_dispatchable');
  END IF;

  IF v_current_status IN ('open', 'submitted') THEN
    UPDATE public.maintenance_requests
       SET status = 'dispatching', updated_at = now()
     WHERE id = v_job_id;
  END IF;

  UPDATE public.maintenance_requests
     SET assigned_seller_id = auth.uid(),
         status = 'accepted',
         seller_pricing = COALESCE(p_pricing, seller_pricing),
         updated_at = now()
   WHERE id = v_job_id
     AND assigned_seller_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_taken');
  END IF;

  UPDATE public.job_dispatch_sessions
     SET dispatch_status = 'assignment_confirmed',
         accepted_seller_id = auth.uid(),
         ended_at = now(),
         updated_at = now()
   WHERE id = v_session_id;

  UPDATE public.job_dispatch_offers
     SET offer_status = 'accepted',
         responded_at = now(),
         response_type = 'accept',
         updated_at = now()
   WHERE id = p_offer_id;

  UPDATE public.job_dispatch_offers
     SET offer_status = 'auto_closed', updated_at = now()
   WHERE dispatch_session_id = v_session_id
     AND id <> p_offer_id
     AND offer_status IN ('sent', 'delivered', 'seen');

  RETURN jsonb_build_object(
    'accepted', true,
    'job_id', v_job_id,
    'job_type', v_job_type,
    'session_id', v_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid, uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_six_digit_completion_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT lpad(
    (mod(
      ('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint,
      1000000
    ))::text,
    6,
    '0'
  );
$$;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS completion_code_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_code_locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.generate_completion_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_marked_complete = true
     AND (OLD.seller_marked_complete IS NULL OR OLD.seller_marked_complete = false)
     AND (NEW.job_completion_code IS NULL OR NEW.job_completion_code = '')
  THEN
    NEW.job_completion_code := public.generate_six_digit_completion_code();
    NEW.seller_completion_date := COALESCE(NEW.seller_completion_date, now());
    NEW.completion_code_attempts := 0;
    NEW.completion_code_locked_until := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_job_completion_code(
  p_request_id uuid,
  p_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_code text;
  v_status text;
  v_seller_id uuid;
  v_attempts integer;
  v_locked_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
    RETURN false;
  END IF;

  SELECT job_completion_code, status, assigned_seller_id,
         completion_code_attempts, completion_code_locked_until
    INTO v_stored_code, v_status, v_seller_id, v_attempts, v_locked_until
    FROM public.maintenance_requests
   WHERE id = p_request_id
   FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF v_status <> 'seller_marked_complete' THEN
    RAISE EXCEPTION 'Job is not awaiting buyer completion verification';
  END IF;

  IF v_seller_id IS NULL OR v_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to complete this job';
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RETURN false;
  END IF;

  IF v_stored_code IS NULL OR v_stored_code = '' THEN
    UPDATE public.maintenance_requests
       SET job_completion_code = public.generate_six_digit_completion_code(),
           completion_code_attempts = 0,
           completion_code_locked_until = NULL,
           updated_at = now()
     WHERE id = p_request_id;
    RETURN false;
  END IF;

  IF trim(v_stored_code) <> trim(p_code) THEN
    UPDATE public.maintenance_requests
       SET completion_code_attempts = COALESCE(v_attempts, 0) + 1,
           completion_code_locked_until = CASE
             WHEN COALESCE(v_attempts, 0) + 1 >= 5 THEN now() + interval '15 minutes'
             ELSE NULL
           END,
           updated_at = now()
     WHERE id = p_request_id;
    RETURN false;
  END IF;

  UPDATE public.maintenance_requests
     SET status = 'completed',
         buyer_marked_complete = true,
         buyer_completion_date = now(),
         completion_code_attempts = 0,
         completion_code_locked_until = NULL,
         job_completion_code = NULL,
         updated_at = now()
   WHERE id = p_request_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_job_completion_code(uuid, text) TO authenticated;
