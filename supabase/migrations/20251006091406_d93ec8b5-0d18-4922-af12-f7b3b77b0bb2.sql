-- Add quote_id to messages table for quote-specific messaging
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS quote_id uuid REFERENCES public.quote_submissions(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_quote_id ON public.messages(quote_id);

-- Update RLS policies for quote-specific messages
DROP POLICY IF EXISTS "Users can view messages for their requests" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can view messages for their quotes"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    -- Seller can see messages for their quotes
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      WHERE quote_submissions.id = messages.quote_id 
      AND quote_submissions.seller_id = auth.uid()
    )) OR
    -- Buyer can see messages for quotes on their requests
    (quote_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM quote_submissions 
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id 
      AND maintenance_requests.buyer_id = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages for their quotes"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND (
      -- Seller can message their own quotes
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        WHERE quote_submissions.id = quote_id 
        AND quote_submissions.seller_id = auth.uid()
      )) OR
      -- Buyer can message quotes on their requests
      (quote_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM quote_submissions 
        JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
        WHERE quote_submissions.id = quote_id 
        AND maintenance_requests.buyer_id = auth.uid()
      ))
    )
  );