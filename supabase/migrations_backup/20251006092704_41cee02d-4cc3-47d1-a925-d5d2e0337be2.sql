-- Make request_id nullable in messages table since we're using quote-specific messaging
ALTER TABLE public.messages ALTER COLUMN request_id DROP NOT NULL;

-- Update RLS policies for messages to work with quote-specific messaging
DROP POLICY IF EXISTS "Users can send messages for their quotes" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their quotes" ON public.messages;

-- New policies for quote-specific messaging
CREATE POLICY "Users can send messages for their quotes"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  quote_id IS NOT NULL AND
  (
    -- Seller can send if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can send if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can view messages for their quotes"
ON public.messages
FOR SELECT
TO authenticated
USING (
  quote_id IS NOT NULL AND
  (
    -- Seller can view if they own the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      WHERE quote_submissions.id = messages.quote_id
      AND quote_submissions.seller_id = auth.uid()
    )
    OR
    -- Buyer can view if they own the request linked to the quote
    EXISTS (
      SELECT 1 FROM quote_submissions
      JOIN maintenance_requests ON maintenance_requests.id = quote_submissions.request_id
      WHERE quote_submissions.id = messages.quote_id
      AND maintenance_requests.buyer_id = auth.uid()
    )
  )
);