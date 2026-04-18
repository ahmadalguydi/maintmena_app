-- ============================================================
-- Migration: Enforce valid status transitions at DB level
-- Prevents backward or invalid state jumps via a trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_allowed text[];
BEGIN
    -- Only enforce when status actually changes
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Define allowed transitions
    CASE OLD.status
        WHEN 'open'                  THEN v_allowed := ARRAY['submitted', 'dispatching', 'cancelled'];
        WHEN 'submitted'             THEN v_allowed := ARRAY['dispatching', 'no_seller_found', 'cancelled'];
        WHEN 'dispatching'           THEN v_allowed := ARRAY['accepted', 'no_seller_found', 'cancelled'];
        WHEN 'no_seller_found'       THEN v_allowed := ARRAY['dispatching', 'cancelled'];
        WHEN 'accepted'              THEN v_allowed := ARRAY['en_route', 'cancelled'];
        WHEN 'en_route'              THEN v_allowed := ARRAY['arrived', 'cancelled'];
        WHEN 'arrived'               THEN v_allowed := ARRAY['in_progress', 'cancelled'];
        WHEN 'in_progress'           THEN v_allowed := ARRAY['seller_marked_complete', 'disputed'];
        WHEN 'seller_marked_complete' THEN v_allowed := ARRAY['completed', 'disputed'];
        WHEN 'completed'             THEN v_allowed := ARRAY['closed'];
        WHEN 'closed'                THEN v_allowed := ARRAY[]::text[]; -- terminal
        WHEN 'cancelled'             THEN v_allowed := ARRAY[]::text[]; -- terminal
        WHEN 'disputed'              THEN v_allowed := ARRAY['in_progress', 'cancelled', 'closed'];
        ELSE
            -- Unknown status — allow the change (forward-compatible)
            RETURN NEW;
    END CASE;

    IF NOT (NEW.status = ANY(v_allowed)) THEN
        RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_enforce_status_transition ON public.maintenance_requests;

CREATE TRIGGER trg_enforce_status_transition
    BEFORE UPDATE OF status ON public.maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_status_transition();
