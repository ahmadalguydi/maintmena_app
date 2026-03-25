-- Phase 1: Backfill missing profiles for all users referenced in the system
-- This creates profile records for any user IDs that exist in quotes, requests, bookings, or contracts
-- but don't have a profile entry yet

INSERT INTO public.profiles (id, system_generated, created_at, updated_at)
SELECT DISTINCT u_id, true, now(), now()
FROM (
  SELECT seller_id as u_id FROM public.quote_submissions WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.maintenance_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.booking_requests WHERE seller_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.booking_requests WHERE buyer_id IS NOT NULL
  UNION
  SELECT buyer_id FROM public.contracts WHERE buyer_id IS NOT NULL
  UNION
  SELECT seller_id FROM public.contracts WHERE seller_id IS NOT NULL
) x
LEFT JOIN public.profiles p ON p.id = x.u_id
WHERE p.id IS NULL;