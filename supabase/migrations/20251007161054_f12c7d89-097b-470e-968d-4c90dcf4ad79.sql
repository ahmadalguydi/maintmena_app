-- Update the notification_type check constraint to include quote and message types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'new_brief'::text, 
  'tender_deadline'::text, 
  'new_signal'::text, 
  'system'::text,
  'quote_received'::text,
  'new_message'::text
]));