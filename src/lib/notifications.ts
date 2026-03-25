import { supabase } from '@/integrations/supabase/client';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

export type NotificationLanguage = 'en' | 'ar';
export type NotificationUserType = 'buyer' | 'seller';

export type AppNotificationType =
  | 'new_message'
  | 'job_dispatched'
  | 'job_accepted'
  | 'job_status_updated'
  | 'seller_on_way'
  | 'seller_arrived'
  | 'job_completed'
  | 'price_approval_needed'
  | 'job_halted'
  | 'job_resolution_progress'
  | 'job_resolved';

export interface AppNotification {
  id: string;
  title: string | null;
  message: string | null;
  notification_type: string;
  created_at: string;
  read: boolean;
  content_id?: string | null;
}

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  content_id?: string | null;
}

interface NotificationPresentation {
  title: string;
  message: string;
  icon: string;
}

const NOTIFICATION_SELECT =
  'id,title,message,notification_type,created_at,read,content_id';

const NOTIFICATION_COPY: Record<
  string,
  { icon: string; en: { title: string; message: string }; ar: { title: string; message: string } }
> = {
  new_message: {
    icon: '💬',
    en: { title: 'New message', message: 'You have a new conversation update.' },
    ar: { title: 'رسالة جديدة', message: 'وصلك تحديث جديد في المحادثة.' },
  },
  job_dispatched: {
    icon: '🚀',
    en: { title: 'New request available', message: 'A new request is ready for action.' },
    ar: { title: 'طلب جديد متاح', message: 'فيه طلب جديد جاهز لك.' },
  },
  job_accepted: {
    icon: '✅',
    en: { title: 'Provider assigned', message: 'A provider accepted your request.' },
    ar: { title: 'تم تعيين الفني', message: 'الفني وافق على طلبك.' },
  },
  job_status_updated: {
    icon: '📍',
    en: { title: 'Request updated', message: 'Your request moved to the next step.' },
    ar: { title: 'تم تحديث الطلب', message: 'طلبك انتقل للمرحلة التالية.' },
  },
  seller_on_way: {
    icon: '🚗',
    en: { title: 'Provider on the way', message: 'The provider is heading to you now.' },
    ar: { title: 'الفني في الطريق', message: 'الفني في طريقه لك الآن.' },
  },
  seller_arrived: {
    icon: '📍',
    en: { title: 'Provider arrived', message: 'The provider has arrived at the location.' },
    ar: { title: 'الفني وصل', message: 'الفني وصل للموقع.' },
  },
  job_completed: {
    icon: '🏁',
    en: { title: 'Work completed', message: 'The provider marked the request as completed.' },
    ar: { title: 'اكتمل العمل', message: 'الفني علّم الطلب كمكتمل.' },
  },
  price_approval_needed: {
    icon: '💰',
    en: { title: 'Final amount pending', message: 'Review and approve the final amount.' },
    ar: { title: 'السعر النهائي بانتظارك', message: 'راجع السعر النهائي ووافق عليه.' },
  },
  job_halted: {
    icon: '⚠️',
    en: { title: 'Request needs attention', message: 'An issue was reported on this request.' },
    ar: { title: 'الطلب يحتاج انتباهك', message: 'صار فيه إشكال في هذا الطلب.' },
  },
  job_resolution_progress: {
    icon: '🛠️',
    en: { title: 'Issue update', message: 'There is a new update on the request issue.' },
    ar: { title: 'تحديث على المشكلة', message: 'فيه تحديث جديد على مشكلة الطلب.' },
  },
  job_resolved: {
    icon: '✅',
    en: { title: 'Issue resolved', message: 'The request issue has been resolved.' },
    ar: { title: 'انحلت المشكلة', message: 'تم حل مشكلة الطلب.' },
  },
};

export const notificationQueryKeys = {
  list: (userId?: string | null) => ['notifications', userId ?? 'guest'] as const,
  unreadCount: (userId?: string | null) => ['unread-notifications-count', userId ?? 'guest'] as const,
};

export const isMessageNotification = (notification: Pick<AppNotification, 'notification_type'>) =>
  notification.notification_type === 'new_message';

export const getNotificationPresentation = (
  notification: Pick<AppNotification, 'notification_type' | 'title' | 'message'>,
  language: NotificationLanguage,
): NotificationPresentation => {
  const copy = NOTIFICATION_COPY[notification.notification_type];
  if (!copy) {
    return {
      title: notification.title || (language === 'ar' ? 'إشعار جديد' : 'New notification'),
      message: notification.message || (language === 'ar' ? 'يوجد تحديث جديد.' : 'There is a new update.'),
      icon: '🔔',
    };
  }

  return {
    title: notification.title || copy[language].title,
    message: notification.message || copy[language].message,
    icon: copy.icon,
  };
};

export const getNotificationTarget = (
  notification: Pick<AppNotification, 'notification_type' | 'content_id'>,
  userType: NotificationUserType,
) => {
  if (isMessageNotification(notification)) {
    return userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages';
  }

  if (notification.notification_type === 'job_dispatched') {
    return '/app/seller/home';
  }

  if (notification.content_id) {
    return userType === 'buyer'
      ? `/app/buyer/request/${notification.content_id}`
      : `/app/seller/job/${notification.content_id}`;
  }

  return userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';
};

export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  if (!userId) return [];

  return executeSupabaseQuery<AppNotification[]>(
    () =>
      supabase
        .from('notifications')
        .select(NOTIFICATION_SELECT)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    {
      context: 'fetch-user-notifications',
      fallbackData: [],
      relationName: 'notifications',
      retries: 1,
    },
  );
}

export async function fetchUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[fetch-unread-notification-count]', error);
    }
    return 0;
  }

  return count || 0;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    throw error;
  }
}

/**
 * Insert a notification with duplicate prevention.
 * Checks if a similar notification was sent in the last 5 minutes to prevent duplicates.
 */
export async function sendNotification(data: NotificationData): Promise<boolean> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let query = supabase
      .from('notifications')
      .select('id')
      .eq('user_id', data.user_id)
      .eq('notification_type', data.notification_type)
      .gte('created_at', fiveMinutesAgo);

    if (data.content_id) {
      query = query.eq('content_id', data.content_id);
    } else {
      query = query.is('content_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      if (import.meta.env.DEV) {
        console.log('[Notification] Skipping duplicate:', data.notification_type, data.content_id);
      }
      return false;
    }

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

export async function sendNotifications(notifications: NotificationData[]): Promise<number> {
  let sent = 0;
  for (const notification of notifications) {
    const success = await sendNotification(notification);
    if (success) sent += 1;
  }
  return sent;
}
