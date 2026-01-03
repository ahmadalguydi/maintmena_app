import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
    user_id: string;
    title: string;
    message: string;
    notification_type: string;
    content_id?: string;
}

/**
 * Insert a notification with duplicate prevention.
 * Checks if a similar notification was sent in the last 5 minutes to prevent duplicates.
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
    try {
        // Check for recent duplicate (same user, type, and content_id within last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

        let query = supabase
            .from('notifications')
            .select('id')
            .eq('user_id', data.user_id)
            .eq('notification_type', data.notification_type)
            .gte('created_at', fiveMinutesAgo);

        // Handle content_id matching - use is.null if no content_id provided
        if (data.content_id) {
            query = query.eq('content_id', data.content_id);
        } else {
            query = query.is('content_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            console.log('[Notification] Skipping duplicate:', data.notification_type, data.content_id);
            return false; // Duplicate exists, skip
        }

        // Insert new notification
        const { error } = await supabase.from('notifications').insert({
            user_id: data.user_id,
            title: data.title,
            message: data.message,
            notification_type: data.notification_type,
            content_id: data.content_id,
        });

        if (error) {
            console.error('[Notification] Insert error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[Notification] Error:', err);
        return false;
    }
}

/**
 * Batch insert notifications with duplicate prevention.
 */
export async function sendNotifications(notifications: NotificationData[]): Promise<number> {
    let sent = 0;
    for (const notif of notifications) {
        const success = await sendNotification(notif);
        if (success) sent++;
    }
    return sent;
}
