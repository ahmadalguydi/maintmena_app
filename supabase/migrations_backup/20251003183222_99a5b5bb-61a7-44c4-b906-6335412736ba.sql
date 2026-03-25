-- Add tags column to briefs table
ALTER TABLE public.briefs ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create junction table for briefs and signals
CREATE TABLE IF NOT EXISTS public.brief_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, signal_id)
);

-- Create junction table for briefs and tenders
CREATE TABLE IF NOT EXISTS public.brief_tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID NOT NULL REFERENCES public.briefs(id) ON DELETE CASCADE,
  tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(brief_id, tender_id)
);

-- Enable RLS on junction tables
ALTER TABLE public.brief_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_tenders ENABLE ROW LEVEL SECURITY;

-- RLS policies for brief_signals
CREATE POLICY "Admins can manage brief signals" ON public.brief_signals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief signals" ON public.brief_signals
FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS policies for brief_tenders
CREATE POLICY "Admins can manage brief tenders" ON public.brief_tenders
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view brief tenders" ON public.brief_tenders
FOR SELECT USING (auth.uid() IS NOT NULL);