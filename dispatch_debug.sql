-- ============================================================
-- DISPATCH DEBUG SCRIPT
-- Run each section in Supabase Dashboard → SQL Editor
-- to diagnose why sellers are not receiving offers.
-- ============================================================
-- SECTION 1: Check your seller profile
-- Replace 'YOUR_SELLER_USER_ID' with your actual seller UUID
-- (find it: Dashboard → Authentication → Users)
SELECT id,
    user_type,
    is_online,
    services_pricing,
    service_categories,
    location_lat,
    location_lng
FROM public.profiles
WHERE user_type = 'seller';
-- SECTION 2: Check most recent maintenance_requests (buyer jobs)
SELECT id,
    buyer_id,
    category,
    status,
    created_at
FROM public.maintenance_requests
ORDER BY created_at DESC
LIMIT 5;
-- SECTION 3: Check dispatch sessions (were any created?)
SELECT *
FROM public.job_dispatch_sessions
ORDER BY created_at DESC
LIMIT 5;
-- SECTION 4: Check dispatch offers (were any sent to you?)
SELECT o.id,
    o.seller_id,
    o.job_id,
    o.offer_status,
    o.wave_number,
    o.sent_at,
    o.expires_at
FROM public.job_dispatch_offers o
ORDER BY o.sent_at DESC
LIMIT 10;
-- SECTION 5: Verify start_job_dispatch function exists
SELECT proname,
    pronargs
FROM pg_proc
WHERE proname = 'start_job_dispatch';