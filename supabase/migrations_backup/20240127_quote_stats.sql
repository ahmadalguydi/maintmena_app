-- Function to get quote statistics for a request
CREATE OR REPLACE FUNCTION public.get_quote_stats(request_uuid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE avg_price numeric;
min_price numeric;
max_price numeric;
quote_count int;
BEGIN
SELECT AVG(price),
    MIN(price),
    MAX(price),
    COUNT(*) INTO avg_price,
    min_price,
    max_price,
    quote_count
FROM public.quote_submissions
WHERE request_id = request_uuid
    AND status != 'rejected';
RETURN jsonb_build_object(
    'average_price',
    COALESCE(avg_price, 0),
    'min_price',
    COALESCE(min_price, 0),
    'max_price',
    COALESCE(max_price, 0),
    'count',
    quote_count
);
END;
$$;