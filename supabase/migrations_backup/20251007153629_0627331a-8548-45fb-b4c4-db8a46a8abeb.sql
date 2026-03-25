-- Add detailed fields to quote_submissions table
ALTER TABLE public.quote_submissions 
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS technical_approach TEXT,
ADD COLUMN IF NOT EXISTS team_experience TEXT,
ADD COLUMN IF NOT EXISTS certifications TEXT,
ADD COLUMN IF NOT EXISTS timeline_details TEXT,
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB,
ADD COLUMN IF NOT EXISTS client_references TEXT,
ADD COLUMN IF NOT EXISTS custom_sections JSONB;

-- Create request_quote_templates table for customizable quote forms
CREATE TABLE IF NOT EXISTS public.request_quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on request_quote_templates
ALTER TABLE public.request_quote_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for request_quote_templates
CREATE POLICY "Buyers can manage templates for their requests"
ON public.request_quote_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view templates for open requests"
ON public.request_quote_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_requests
    WHERE id = request_quote_templates.request_id
    AND status = 'open'
    AND visibility = 'public'
  )
);

-- Function to create notification when quote is submitted
CREATE OR REPLACE FUNCTION public.notify_quote_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  buyer_id UUID;
  request_title TEXT;
BEGIN
  -- Get buyer_id and request title
  SELECT mr.buyer_id, mr.title INTO buyer_id, request_title
  FROM maintenance_requests mr
  WHERE mr.id = NEW.request_id;

  -- Create notification for buyer
  IF buyer_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      buyer_id,
      'New Quote Received',
      'You received a new quote for "' || request_title || '"',
      'quote_received',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for quote submissions
DROP TRIGGER IF EXISTS on_quote_submission ON public.quote_submissions;
CREATE TRIGGER on_quote_submission
AFTER INSERT ON public.quote_submissions
FOR EACH ROW
EXECUTE FUNCTION public.notify_quote_submission();

-- Function to create notification when message is sent
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  quote_record RECORD;
  buyer_id UUID;
  seller_id UUID;
  recipient_id UUID;
BEGIN
  -- Get quote details
  SELECT qs.seller_id, mr.buyer_id, mr.title
  INTO quote_record
  FROM quote_submissions qs
  JOIN maintenance_requests mr ON mr.id = qs.request_id
  WHERE qs.id = NEW.quote_id;

  seller_id := quote_record.seller_id;
  buyer_id := quote_record.buyer_id;

  -- Determine recipient (opposite of sender)
  IF NEW.sender_id = buyer_id THEN
    recipient_id := seller_id;
  ELSE
    recipient_id := buyer_id;
  END IF;

  -- Create notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      notification_type,
      content_id
    ) VALUES (
      recipient_id,
      'New Message',
      'You have a new message regarding "' || quote_record.title || '"',
      'new_message',
      NEW.quote_id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();