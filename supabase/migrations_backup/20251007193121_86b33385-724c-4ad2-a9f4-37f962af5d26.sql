-- Add action_items field to signals table
ALTER TABLE public.signals
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Add action_items field to tenders table
ALTER TABLE public.tenders
ADD COLUMN IF NOT EXISTS action_items jsonb DEFAULT '[]'::jsonb;

-- Comment describing the structure of action_items
COMMENT ON COLUMN public.signals.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';

COMMENT ON COLUMN public.tenders.action_items IS 'Array of action items: [{"id": "uuid", "title": "string", "description": "string", "priority": "low|medium|high|critical", "completed": boolean, "order": number}]';