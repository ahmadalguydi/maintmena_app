-- Create notification trigger for quote updates (seller updates a quote)
-- This notifies the buyer when their quote has been modified
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_quote_update ON public.quote_submissions;
-- Function to create notification when quote is updated
CREATE OR REPLACE FUNCTION public.notify_quote_update() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE buyer_id UUID;
request_title TEXT;
BEGIN -- Only trigger if meaningful fields changed (price, description, duration, status)
IF (
    OLD.price IS DISTINCT
    FROM NEW.price
        OR OLD.description IS DISTINCT
    FROM NEW.description
        OR OLD.proposal IS DISTINCT
    FROM NEW.proposal
        OR OLD.estimated_duration IS DISTINCT
    FROM NEW.estimated_duration
        OR OLD.start_date IS DISTINCT
    FROM NEW.start_date
        OR (
            OLD.status = 'revision_requested'
            AND NEW.status = 'pending'
        )
) THEN -- Get buyer_id and request title
SELECT mr.buyer_id,
    COALESCE(mr.title, 'your request') INTO buyer_id,
    request_title
FROM maintenance_requests mr
WHERE mr.id = NEW.request_id;
-- Create notification for buyer using localization keys
IF buyer_id IS NOT NULL THEN
INSERT INTO notifications (
        user_id,
        title,
        message,
        notification_type,
        content_id
    )
VALUES (
        buyer_id,
        'quote_updated',
        -- Use type as title for client-side translation
        'quote_updated',
        -- Use type as message for client-side translation
        'quote_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$;
-- Create trigger for quote updates
CREATE TRIGGER on_quote_update
AFTER
UPDATE ON public.quote_submissions FOR EACH ROW EXECUTE FUNCTION public.notify_quote_update();