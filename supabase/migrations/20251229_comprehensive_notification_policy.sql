-- Migration: Comprehensive notification insert policy for all users
-- Fixes 403 Forbidden error when trying to send notifications

-- Drop all existing insert policies for notifications
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can notify other parties in contracts" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;

-- Create a comprehensive policy that allows authenticated users to insert notifications
-- for parties they have legitimate business relationships with
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create notification for anyone they have a relationship with:
  user_id IN (
    -- Sellers in contracts where user is buyer
    SELECT seller_id FROM contracts WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in contracts where user is seller
    SELECT buyer_id FROM contracts WHERE seller_id = auth.uid()
    UNION
    -- Sellers in bookings where user is buyer
    SELECT seller_id FROM booking_requests WHERE buyer_id = auth.uid()
    UNION
    -- Buyers in bookings where user is seller
    SELECT buyer_id FROM booking_requests WHERE seller_id = auth.uid()
    UNION
    -- Buyers who made requests the user quoted
    SELECT mr.buyer_id FROM maintenance_requests mr
    JOIN quote_submissions qs ON qs.request_id = mr.id
    WHERE qs.seller_id = auth.uid()
    UNION
    -- Sellers who quoted on user's requests
    SELECT qs.seller_id FROM quote_submissions qs
    JOIN maintenance_requests mr ON qs.request_id = mr.id
    WHERE mr.buyer_id = auth.uid()
    UNION
    -- User can also create notifications for themselves
    SELECT auth.uid()
  )
);
