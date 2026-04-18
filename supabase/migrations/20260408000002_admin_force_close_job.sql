-- ============================================================
-- Migration: Admin force-close / force-cancel jobs
-- SECURITY DEFINER so it bypasses RLS — but validates the
-- caller is an admin via the user_roles table.
-- ============================================================

-- Force complete a job (admin only)
CREATE OR REPLACE FUNCTION public.admin_force_complete_job(
    p_request_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Not authorized — admin role required';
    END IF;

    UPDATE public.maintenance_requests
       SET status = 'completed',
           seller_marked_complete = true,
           buyer_marked_complete = true,
           seller_completion_date = COALESCE(seller_completion_date, now()),
           buyer_completion_date = now(),
           updated_at = now()
     WHERE id = p_request_id;

    -- Expire any pending dispatch offers
    UPDATE public.job_dispatch_offers
       SET offer_status = 'expired',
           updated_at = now()
     WHERE job_id = p_request_id
       AND offer_status IN ('sent', 'delivered', 'seen');

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_complete_job(uuid) TO authenticated;

-- Force cancel a job (admin only)
CREATE OR REPLACE FUNCTION public.admin_force_cancel_job(
    p_request_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Not authorized — admin role required';
    END IF;

    UPDATE public.maintenance_requests
       SET status = 'cancelled',
           updated_at = now()
     WHERE id = p_request_id;

    -- Expire any pending dispatch offers
    UPDATE public.job_dispatch_offers
       SET offer_status = 'expired',
           updated_at = now()
     WHERE job_id = p_request_id
       AND offer_status IN ('sent', 'delivered', 'seen');

    -- Mark dispatch sessions as cancelled
    UPDATE public.job_dispatch_sessions
       SET dispatch_status = 'cancelled',
           ended_at = now(),
           updated_at = now()
     WHERE job_id = p_request_id
       AND dispatch_status LIKE 'dispatching%';

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_force_cancel_job(uuid) TO authenticated;
