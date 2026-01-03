-- Create table for tracking signals and tenders
CREATE TABLE IF NOT EXISTS public.tracked_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('signal', 'tender')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tracked items
CREATE POLICY "Users can view their own tracked items"
  ON public.tracked_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tracked items"
  ON public.tracked_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tracked items"
  ON public.tracked_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for better performance
CREATE INDEX idx_tracked_items_user_id ON public.tracked_items(user_id);
CREATE INDEX idx_tracked_items_item_id ON public.tracked_items(item_id, item_type);