-- Add read tracking columns to messages table
ALTER TABLE public.messages 
ADD COLUMN is_read BOOLEAN DEFAULT false,
ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;

-- Add RLS policy to allow users to mark messages as read
CREATE POLICY "Users can mark their received messages as read"
ON public.messages
FOR UPDATE
USING (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
)
WITH CHECK (
  auth.uid() != sender_id AND (
    EXISTS (
      SELECT 1 FROM quote_submissions qs
      JOIN maintenance_requests mr ON mr.id = qs.request_id
      WHERE qs.id = messages.quote_id
      AND (qs.seller_id = auth.uid() OR mr.buyer_id = auth.uid())
    )
  )
);

-- Add RLS policy for sellers to update their own pending/negotiating quotes
CREATE POLICY "Sellers can update their own pending quotes"
ON public.quote_submissions
FOR UPDATE
USING (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
)
WITH CHECK (
  auth.uid() = seller_id 
  AND status IN ('pending', 'negotiating')
);