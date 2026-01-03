-- Add tags column for flexible metadata (Home/Project, job size, timeline, site readiness)
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb;

-- Add GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tags ON public.maintenance_requests USING GIN (tags);

-- Add service_focus column to profiles for vendors (array of 'home', 'project', 'both')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_focus TEXT[] DEFAULT ARRAY['both'];

-- Add crew_size_range column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crew_size_range TEXT;