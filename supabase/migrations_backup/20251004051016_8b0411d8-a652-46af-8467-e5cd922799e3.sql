-- Create templates_guides table
CREATE TABLE public.templates_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'published',
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.templates_guides ENABLE ROW LEVEL SECURITY;

-- Policies for templates_guides
CREATE POLICY "Admins can manage all templates/guides"
ON public.templates_guides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Create industry_reports table
CREATE TABLE public.industry_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  report_type TEXT NOT NULL,
  file_url TEXT,
  preview_content TEXT,
  thumbnail_url TEXT,
  access_tier TEXT NOT NULL DEFAULT 'professional',
  status TEXT NOT NULL DEFAULT 'published',
  views_count INTEGER DEFAULT 0,
  publication_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.industry_reports ENABLE ROW LEVEL SECURITY;

-- Policies for industry_reports
CREATE POLICY "Admins can manage all reports"
ON public.industry_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));


-- Add update triggers
CREATE TRIGGER update_templates_guides_updated_at
BEFORE UPDATE ON public.templates_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_industry_reports_updated_at
BEFORE UPDATE ON public.industry_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();