-- Migration: Add portfolio_items and certifications columns to profiles
-- These are used by PortfolioGallery.tsx and Certifications.tsx seller profile screens.
--
-- portfolio_items: JSONB array of { id, url, caption, uploadedAt }
-- certifications:  TEXT array of JSON-stringified Certification objects
--                  (kept as TEXT[] to match existing app serialisation)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications  TEXT[] DEFAULT '{}';
