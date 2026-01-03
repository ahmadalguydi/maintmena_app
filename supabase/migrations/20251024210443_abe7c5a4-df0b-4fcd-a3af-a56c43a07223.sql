-- Add country and city columns to signals table
ALTER TABLE public.signals
ADD COLUMN country text,
ADD COLUMN city text;

-- Add country and city columns to tenders table
ALTER TABLE public.tenders
ADD COLUMN country text,
ADD COLUMN city text;