-- Create table to track per-user completion state of action items from signals/tenders
CREATE TABLE IF NOT EXISTS public.user_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('signal','tender')),
  source_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, source_id, action_key)
);

-- Enable RLS
ALTER TABLE public.user_action_items ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own records
CREATE POLICY "Users can view their own action items"
ON public.user_action_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own action items"
ON public.user_action_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own action items"
ON public.user_action_items
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own action items"
ON public.user_action_items
FOR DELETE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_action_items_user ON public.user_action_items (user_id);
CREATE INDEX IF NOT EXISTS idx_user_action_items_source ON public.user_action_items (source_type, source_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER set_timestamp_user_action_items
BEFORE UPDATE ON public.user_action_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();