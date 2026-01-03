-- Fix security issues: Restrict public access to sensitive tables

-- Drop the overly permissive policy on key_contacts
DROP POLICY IF EXISTS "Anyone can view key contacts" ON public.key_contacts;

-- Create authenticated-only policy for key_contacts
CREATE POLICY "Authenticated users can view key contacts"
  ON public.key_contacts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the overly permissive policy on signals
DROP POLICY IF EXISTS "Anyone can view active signals" ON public.signals;

-- Create authenticated-only policy for signals
CREATE POLICY "Authenticated users can view active signals"
  ON public.signals FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'active');

-- Similarly restrict tenders to authenticated users only
DROP POLICY IF EXISTS "Anyone can view open tenders" ON public.tenders;

CREATE POLICY "Authenticated users can view open tenders"
  ON public.tenders FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'open');