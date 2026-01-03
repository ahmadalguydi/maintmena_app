-- Drop the old constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Add updated constraint with all notification types including booking-related ones
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text,
  'tender_deadline'::text,
  'new_signal'::text,
  'system'::text,
  'quote_received'::text,
  'quote_accepted'::text,
  'quote_declined'::text,
  'new_message'::text,
  'booking_request'::text,
  'booking_received'::text,
  'booking_accepted'::text,
  'booking_declined'::text,
  'booking_updated'::text,
  'booking_cancelled'::text,
  'counter_proposal_received'::text,
  'counter_proposal_accepted'::text,
  'booking_message'::text,
  'new_chat'::text
]));