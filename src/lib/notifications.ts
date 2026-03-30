import { supabase } from '@/integrations/supabase/client';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';

export type NotificationLanguage = 'en' | 'ar';
export type NotificationUserType = 'buyer' | 'seller';

export type AppNotificationType =
  // ── Core job lifecycle ──────────────────────────────────────────────
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
  | 'job_resolved'
  | 'job_cancelled'
  // ── Seller engagement ───────────────────────────────────────────────
  | 'review_received'
  | 'scheduled_job_reminder'
  | 'earnings_milestone'
  | 'first_job_completed'
  | 'profile_incomplete_reminder'
  // ── Buyer engagement ────────────────────────────────────────────────
  | 'review_prompt_reminder';

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

// ── Bilingual copy (Saudi dialect for Arabic) ───────────────────────────────
export const NOTIFICATION_COPY: Record<
  string,
  { icon: string; en: { title: string; message: string }; ar: { title: string; message: string } }
> = {
  // ── Core lifecycle ──────────────────────────────────────────────────────
  new_message: {
    icon: '💬',
    en: { title: 'New message', message: 'You have a new conversation update.' },
    ar: { title: 'رسالة جديدة', message: 'وصلك تحديث جديد في المحادثة.' },
  },
  job_dispatched: {
    icon: '🚀',
    en: { title: 'New request available!', message: "A job just dropped near you. Be the first to grab it 💨" },
    ar: { title: 'طلب جديد متاح!', message: 'نزل طلب قريب منك. كن أول من يقبله 💨' },
  },
  job_accepted: {
    icon: '✅',
    en: { title: 'Provider assigned!', message: "A pro accepted your request and is on it." },
    ar: { title: 'تم تعيين الفني!', message: 'الفني وافق على طلبك وعم يستعد.' },
  },
  job_status_updated: {
    icon: '📍',
    en: { title: 'Request updated', message: 'Your request moved to the next step.' },
    ar: { title: 'تم تحديث الطلب', message: 'طلبك انتقل للمرحلة التالية.' },
  },
  seller_on_way: {
    icon: '🚗',
    en: { title: "Provider's on the way!", message: "They're heading to you now. Shouldn't be long 📍" },
    ar: { title: 'الفني بالطريق!', message: 'في طريقه لك الحين. ما يطول 📍' },
  },
  seller_arrived: {
    icon: '📍',
    en: { title: 'Provider arrived!', message: "They're at the door. Go let them in 🙌" },
    ar: { title: 'الفني وصل!', message: 'وصل الموقع. يلا استقبله 🙌' },
  },
  job_completed: {
    icon: '🏁',
    en: { title: 'Work done!', message: "The provider marked the job complete. How'd it go?" },
    ar: { title: 'انتهى الشغل!', message: 'الفني علّم الطلب كمكتمل. كيف كانت التجربة؟' },
  },
  price_approval_needed: {
    icon: '💰',
    en: { title: 'Final amount waiting!', message: "Review the total and approve it to close the job ✅" },
    ar: { title: 'السعر النهائي بانتظارك!', message: 'راجع المبلغ وافقه عشان نقفل الطلب ✅' },
  },
  job_halted: {
    icon: '⚠️',
    en: { title: 'Request needs attention', message: 'An issue was reported. Check it out so we can sort it.' },
    ar: { title: 'الطلب يحتاج انتباهك', message: 'صار فيه إشكال. شوف التفاصيل عشان نحله.' },
  },
  job_resolution_progress: {
    icon: '🛠️',
    en: { title: 'Issue update', message: "There's movement on the reported issue. Check the latest." },
    ar: { title: 'تحديث على المشكلة', message: 'فيه تحديث جديد على الإشكال. شوف وش صار.' },
  },
  job_resolved: {
    icon: '✅',
    en: { title: "Issue sorted!", message: "The reported issue has been fully resolved. All good 👍" },
    ar: { title: 'انحلت المشكلة!', message: 'تم حل الإشكال بالكامل. كل شيء تمام 👍' },
  },

  // ── Cancellation ────────────────────────────────────────────────────────
  job_cancelled: {
    icon: '😔',
    en: { title: 'Request cancelled', message: "The request was cancelled. No worries — start a new one whenever you're ready." },
    ar: { title: 'اتلغى الطلب', message: 'الطلب اتلغى. ما عليه، تقدر تفتح طلب جديد وقت ما تبي.' },
  },

  // ── Seller engagement ───────────────────────────────────────────────────
  review_received: {
    icon: '⭐',
    en: { title: 'You got a new review!', message: "A client just rated your work. Go see what they said 👀" },
    ar: { title: 'وصلك تقييم جديد!', message: 'أحد قيّم شغلك للتو. شوف وش قالوا عنك 👀' },
  },
  scheduled_job_reminder: {
    icon: '⏰',
    en: { title: "Job in 2 hours — heads up!", message: "Your scheduled job is coming up soon. Time to gear up 🛠️" },
    ar: { title: 'عندك شغل بعد ساعتين!', message: 'موعدك قريب. خل الأدوات جاهزة وانطلق 🛠️' },
  },
  earnings_milestone: {
    icon: '💸',
    en: { title: "New milestone unlocked 🎯", message: "You just hit a new earnings milestone. Keep the momentum going — you're on a roll!" },
    ar: { title: 'وصلت مرحلة جديدة 🎯', message: 'ما شاء الله، وصلت هدف جديد في أرباحك. كمّل شغلك وزد!' },
  },
  first_job_completed: {
    icon: '🎉',
    en: { title: "First job done — congrats!", message: "You nailed it! Your first job is in the books. The journey starts here 💪" },
    ar: { title: 'أول طلب خلّصناه — مبروك!', message: 'ما شاء الله! أكملت أول طلب. هذي البداية بس، كمّل 💪' },
  },
  profile_incomplete_reminder: {
    icon: '📋',
    en: { title: 'Your profile needs a touch-up', message: "A complete profile gets 3× more job matches. Finish it in 2 minutes 🔑" },
    ar: { title: 'ملفك ما اكتمل بعد', message: 'الملفات المكتملة تاخذ طلبات أكثر بكثير. اكمله في دقيقتين 🔑' },
  },

  // ── Buyer engagement ────────────────────────────────────────────────────
  review_prompt_reminder: {
    icon: '✍️',
    en: { title: 'How was the service?', message: "Your honest review helps others find great pros. Takes 10 seconds ⚡" },
    ar: { title: 'كيف كانت الخدمة؟', message: 'تقييمك الصادق يساعد غيرك يختار الفني الصح. ما يأخذ إلا ثواني ⚡' },
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

// ── Deep-link routing per notification type ──────────────────────────────────
export const getNotificationTarget = (
  notification: Pick<AppNotification, 'notification_type' | 'content_id'>,
  userType: NotificationUserType,
): string => {
  const type = notification.notification_type;
  const id   = notification.content_id;

  if (type === 'new_message') {
    return userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages';
  }
  if (type === 'job_dispatched') return '/app/seller/home';

  // Seller-specific destinations
  if (type === 'review_received')              return '/app/seller/reviews';
  if (type === 'earnings_milestone')           return '/app/seller/earnings';
  if (type === 'profile_incomplete_reminder')  return '/app/seller/profile/edit';

  if (type === 'scheduled_job_reminder') {
    return userType === 'seller'
      ? (id ? `/app/seller/job/${id}` : '/app/seller/home')
      : (id ? `/app/buyer/request/${id}` : '/app/buyer/home');
  }

  if (type === 'first_job_completed') {
    return userType === 'seller'
      ? (id ? `/app/seller/job/${id}` : '/app/seller/home')
      : '/app/buyer/activity';
  }

  // Buyer-specific destinations
  if (type === 'review_prompt_reminder') {
    return id ? `/app/buyer/request/${id}` : '/app/buyer/activity';
  }

  // Generic: route to content if available
  if (id) {
    return userType === 'buyer' ? `/app/buyer/request/${id}` : `/app/seller/job/${id}`;
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
      if (import.meta.env.DEV) console.error('[Notification] Insert error:', error);
      return false;
    }

    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[Notification] Error:', err);
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
