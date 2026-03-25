-- Comprehensive cleanup of booking notification triggers
DO $$ BEGIN -- Drop all known variations of booking status triggers
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_status_notification ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_booking_status_change_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS notify_seller_booking_request_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS booking_notification_trigger ON public.booking_requests';
EXECUTE 'DROP TRIGGER IF EXISTS on_booking_request_updated ON public.booking_requests';
END $$;
-- Redefine the notification function to use valid keys and cleaner logic
CREATE OR REPLACE FUNCTION public.notify_booking_status_change() RETURNS TRIGGER AS $$ BEGIN -- New booking created
    IF TG_OP = 'INSERT' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_received',
        'booking_received',
        'booking_received',
        NEW.id
    );
RETURN NEW;
END IF;
-- Status changed
IF OLD.status IS DISTINCT
FROM NEW.status THEN -- Only notify on specific status changes
    IF NEW.status = 'accepted' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_accepted',
        'booking_accepted',
        'booking_accepted',
        NEW.id
    );
ELSIF NEW.status = 'declined' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_declined',
        'booking_declined',
        'booking_declined',
        NEW.id
    );
ELSIF NEW.status = 'cancelled' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'booking_cancelled',
        'booking_cancelled',
        'booking_cancelled',
        NEW.id
    );
ELSIF NEW.status = 'counter_proposed' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'counter_proposal_received',
        'counter_proposal_received',
        'counter_proposal_received',
        NEW.id
    );
ELSIF NEW.status = 'buyer_countered' THEN
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.seller_id,
        'buyer_counter_received',
        'buyer_counter_received',
        'buyer_counter_received',
        NEW.id
    );
ELSIF OLD.status = 'pending'
AND NEW.status != 'pending' THEN -- Catch-all for other updates from pending (e.g. detailed updates)
INSERT INTO public.notifications (
        user_id,
        notification_type,
        title,
        message,
        content_id
    )
VALUES (
        NEW.buyer_id,
        'booking_updated',
        'booking_updated',
        'booking_updated',
        NEW.id
    );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
-- Recreate Single Trigger with V2 name to ensure uniqueness
CREATE TRIGGER on_booking_status_change_v2
AFTER
INSERT
    OR
UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();