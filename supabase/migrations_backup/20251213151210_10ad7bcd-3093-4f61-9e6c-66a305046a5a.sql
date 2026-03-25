-- Allow sellers to delete their own pending quotes
CREATE POLICY "Sellers can delete their own pending quotes"
ON public.quote_submissions
FOR DELETE
USING (auth.uid() = seller_id AND status = 'pending');