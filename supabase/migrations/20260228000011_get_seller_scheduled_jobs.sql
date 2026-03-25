-- ============================================================
-- Migration: get_seller_scheduled_jobs RPC
-- Returns jobs assigned to a seller. Uses SECURITY DEFINER to
-- bypass RLS and avoid schema cache issues.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_seller_scheduled_jobs(p_seller_id uuid) RETURNS TABLE(
        id uuid,
        category text,
        title text,
        description text,
        location text,
        status text,
        urgency text,
        preferred_start_date timestamptz,
        created_at timestamptz,
        buyer_id uuid
    ) LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN QUERY
SELECT mr.id,
    mr.category,
    mr.title,
    mr.description,
    mr.location,
    mr.status,
    mr.urgency,
    mr.preferred_start_date,
    mr.created_at,
    mr.buyer_id
FROM public.maintenance_requests mr
WHERE mr.assigned_seller_id = p_seller_id
    AND mr.status = 'in_progress'
ORDER BY COALESCE(mr.preferred_start_date, mr.created_at) ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_seller_scheduled_jobs(uuid) TO authenticated;