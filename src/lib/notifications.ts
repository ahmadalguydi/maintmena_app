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
  | 'booking_response'
  | 'quote_revision_requested'
  | 'warranty_nudge'
  | 'auto_close'
  // ── Seller engagement ───────────────────────────────────────────────
  | 'review_received'
  | 'scheduled_job_reminder'
  | 'earnings_milestone'
  | 'first_job_completed'
  | 'profile_incomplete_reminder'
  // ── Buyer engagement ────────────────────────────────────────────────
  | 'review_prompt_reminder';

/** Visual category for grouping notification styling */
export type NotificationCategory = 'job' | 'message' | 'engagement' | 'alert' | 'milestone';

export interface AppNotification {
  id: string;
  title: string | null;
  message: string | null;
  notification_type: string;
  created_at: string;
  read: boolean;
  content_id?: string | null;
}

export interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  content_id?: string | null;
}

export interface NotificationPresentation {
  title: string;
  message: string;
  icon: string;
  category: NotificationCategory;
  /** CSS color class for icon background (e.g. 'bg-primary/10') */
  bgColor: string;
  /** CSS color class for icon text (e.g. 'text-primary') */
  iconColor: string;
  /** Whether the notification has a CTA the user should act on */
  isActionable: boolean;
  /** Localized CTA label if actionable */
  actionLabel?: string;
}

const NOTIFICATION_SELECT =
  'id,title,message,notification_type,created_at,read,content_id';

// ── Bilingual copy (Saudi dialect for Arabic) ───────────────────────────────
interface NotificationCopyEntry {
  icon: string;
  category: NotificationCategory;
  bgColor: string;
  iconColor: string;
  isActionable: boolean;
  actionLabel?: { en: string; ar: string };
  en: { title: string; message: string };
  ar: { title: string; message: string };
}

export const NOTIFICATION_COPY: Record<string, NotificationCopyEntry> = {
  // ── Core lifecycle ──────────────────────────────────────────────────────
  new_message: {
    icon: '💬',
    category: 'message',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    isActionable: false,
    en: { title: 'New message', message: 'You have a new conversation update.' },
    ar: { title: 'رسالة جديدة', message: 'وصلك تحديث جديد في المحادثة.' },
  },
  job_dispatched: {
    icon: '🚀',
    category: 'job',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: true,
    actionLabel: { en: 'View', ar: 'عرض' },
    en: { title: 'New request available!', message: "A job just dropped near you. Be the first to grab it 💨" },
    ar: { title: 'طلب جديد وصلك!', message: 'نزل طلب قريب منك، لا يفوتك — كن أول واحد يشيله 💨' },
  },
  job_accepted: {
    icon: '✅',
    category: 'job',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    isActionable: false,
    en: { title: 'Provider assigned!', message: 'A pro accepted your request and is prepping now.' },
    ar: { title: 'تم تعيين الفني!', message: 'فني محترف وافق على طلبك وبيجهّز نفسه الحين.' },
  },
  job_status_updated: {
    icon: '📍',
    category: 'job',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: false,
    en: { title: 'Request updated', message: 'Your request moved to the next step.' },
    ar: { title: 'تم تحديث الطلب', message: 'طلبك انتقل للمرحلة التالية.' },
  },
  seller_on_way: {
    icon: '🚗',
    category: 'job',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'Track', ar: 'تتبّع' },
    en: { title: "Provider's on the way!", message: "They're heading to you now. Shouldn't be long 📍" },
    ar: { title: 'الفني بالطريق!', message: 'في طريقه لك الحين، ما يطول 📍' },
  },
  seller_arrived: {
    icon: '🏠',
    category: 'job',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    isActionable: false,
    en: { title: 'Provider arrived!', message: "They're at the door — go let them in 🙌" },
    ar: { title: 'الفني وصل!', message: 'وصل عندك، يلا استقبله 🙌' },
  },
  job_completed: {
    icon: '🏁',
    category: 'job',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    isActionable: true,
    actionLabel: { en: 'Review', ar: 'قيّم' },
    en: { title: 'Work done!', message: "The provider finished the job. How'd it go?" },
    ar: { title: 'انتهى الشغل!', message: 'الفني خلّص الشغل. كيف كانت التجربة؟' },
  },
  price_approval_needed: {
    icon: '💰',
    category: 'alert',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'Approve', ar: 'وافق' },
    en: { title: 'Final amount waiting!', message: 'Review the total and approve it to close the job ✅' },
    ar: { title: 'السعر النهائي بانتظارك!', message: 'راجع المبلغ ووافق عليه عشان نقفل الطلب ✅' },
  },
  job_halted: {
    icon: '⚠️',
    category: 'alert',
    bgColor: 'bg-red-500/10',
    iconColor: 'text-red-600',
    isActionable: true,
    actionLabel: { en: 'Review', ar: 'شوف' },
    en: { title: 'Request needs attention', message: 'An issue was reported. Check it so we can sort it out.' },
    ar: { title: 'الطلب يحتاج انتباهك', message: 'صار فيه إشكال، شوف التفاصيل عشان نحله.' },
  },
  job_resolution_progress: {
    icon: '🛠️',
    category: 'job',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: false,
    en: { title: 'Issue update', message: "There's movement on the reported issue. Check the latest." },
    ar: { title: 'تحديث على المشكلة', message: 'فيه تحديث جديد على الإشكال. شوف وش صار.' },
  },
  job_resolved: {
    icon: '✅',
    category: 'job',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    isActionable: false,
    en: { title: 'Issue sorted!', message: 'The reported issue has been fully resolved. All good 👍' },
    ar: { title: 'انحلّت المشكلة!', message: 'تم حل الإشكال بالكامل. كل شيء تمام 👍' },
  },

  // ── Cancellation ────────────────────────────────────────────────────────
  job_cancelled: {
    icon: '😔',
    category: 'job',
    bgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
    isActionable: false,
    en: { title: 'Request cancelled', message: "The request was cancelled. No worries — start a new one whenever you're ready." },
    ar: { title: 'اتلغى الطلب', message: 'الطلب اتلغى. ما عليه، تقدر تفتح طلب جديد وقت ما تبي.' },
  },

  // ── Seller engagement ───────────────────────────────────────────────────
  review_received: {
    icon: '⭐',
    category: 'milestone',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'See review', ar: 'شوف التقييم' },
    en: { title: 'You got a new review!', message: "A client just rated your work. Go see what they said 👀" },
    ar: { title: 'وصلك تقييم جديد!', message: 'أحد قيّم شغلك للتو. شوف وش قالوا عنك 👀' },
  },
  scheduled_job_reminder: {
    icon: '⏰',
    category: 'alert',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'View job', ar: 'شوف الطلب' },
    en: { title: 'Job in 2 hours — heads up!', message: 'Your scheduled job is coming up soon. Time to gear up 🛠️' },
    ar: { title: 'عندك شغل بعد ساعتين!', message: 'موعدك قريب. خل الأدوات جاهزة وانطلق 🛠️' },
  },
  earnings_milestone: {
    icon: '💸',
    category: 'milestone',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    isActionable: false,
    en: { title: 'New milestone unlocked 🎯', message: "You just hit a new earnings milestone. Keep the momentum going!" },
    ar: { title: 'وصلت مرحلة جديدة 🎯', message: 'ما شاء الله، وصلت هدف جديد في أرباحك. كمّل وزد!' },
  },
  first_job_completed: {
    icon: '🎉',
    category: 'milestone',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: false,
    en: { title: 'First job done — congrats!', message: 'You nailed it! Your first job is in the books. The journey starts here 💪' },
    ar: { title: 'أول طلب خلّصناه — مبروك!', message: 'ما شاء الله! أكملت أول طلب. هذي البداية بس، كمّل 💪' },
  },
  profile_incomplete_reminder: {
    icon: '📋',
    category: 'engagement',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: true,
    actionLabel: { en: 'Complete', ar: 'أكمل' },
    en: { title: 'Your profile needs a touch-up', message: 'A complete profile gets 3× more job matches. Finish it in 2 minutes 🔑' },
    ar: { title: 'ملفك ما اكتمل بعد', message: 'الملفات المكتملة تاخذ طلبات أكثر بكثير. اكمله في دقيقتين 🔑' },
  },

  // ── Buyer engagement ────────────────────────────────────────────────────
  review_prompt_reminder: {
    icon: '✍️',
    category: 'engagement',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'Rate now', ar: 'قيّم الآن' },
    en: { title: 'How was the service?', message: "Your honest review helps others find great pros. Takes 10 seconds ⚡" },
    ar: { title: 'كيف كانت الخدمة؟', message: 'تقييمك الصادق يساعد غيرك يختار الفني الصح. ما يأخذ إلا ثواني ⚡' },
  },
  booking_response: {
    icon: '📋',
    category: 'job',
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    isActionable: true,
    actionLabel: { en: 'View', ar: 'عرض' },
    en: { title: 'Booking update', message: 'A provider responded to your booking. See the latest.' },
    ar: { title: 'تحديث حجزك', message: 'مقدم الخدمة رد على حجزك. شوف وش صار.' },
  },
  quote_revision_requested: {
    icon: '📝',
    category: 'alert',
    bgColor: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    isActionable: true,
    actionLabel: { en: 'Revise', ar: 'عدّل' },
    en: { title: 'Quote revision requested', message: 'The buyer wants a change to your quote. Update it to keep the deal moving.' },
    ar: { title: 'طلب تعديل على العرض', message: 'العميل طلب تعديل على عرضك. عدّله عشان ما يفوتك.' },
  },
  warranty_nudge: {
    icon: '🛡️',
    category: 'alert',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
    isActionable: true,
    actionLabel: { en: 'Check', ar: 'تحقق' },
    en: { title: 'Warranty reminder', message: 'You have a pending action on a warranted job. Take a look.' },
    ar: { title: 'تذكير بالضمان', message: 'عندك إجراء معلّق على طلب مضمون. الق نظرة.' },
  },
  auto_close: {
    icon: '🔒',
    category: 'job',
    bgColor: 'bg-muted',
    iconColor: 'text-muted-foreground',
    isActionable: false,
    en: { title: 'Request auto-closed', message: 'This request was closed automatically after the waiting period.' },
    ar: { title: 'تم إغلاق الطلب تلقائياً', message: 'اتقفل الطلب تلقائياً بعد انتهاء المدة.' },
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
      category: 'job',
      bgColor: 'bg-muted',
      iconColor: 'text-muted-foreground',
      isActionable: false,
    };
  }

  // Always prefer the localized copy — the DB may store English even for Arabic users
  return {
    title: copy[language].title,
    message: copy[language].message,
    icon: copy.icon,
    category: copy.category,
    bgColor: copy.bgColor,
    iconColor: copy.iconColor,
    isActionable: copy.isActionable,
    actionLabel: copy.actionLabel?.[language],
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
    // content_id is the request_id — navigate directly to the thread
    if (id) return `/app/messages/thread?request=${id}`;
    return userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages';
  }
  if (type === 'job_dispatched') return '/app/seller/home';
  if (type === 'booking_response') {
    return userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';
  }
  if (type === 'quote_revision_requested') return '/app/seller/home';
  if (type === 'warranty_nudge' || type === 'auto_close') {
    return userType === 'buyer' ? '/app/buyer/activity' : '/app/seller/home';
  }

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

  // Direct query — skips executeSupabaseQuery which can blacklist the
  // 'notifications' relation for 2 minutes on any transient error.
  // Exclude new_message: those are surfaced via the in-app banner and
  // the Messages tab badge only — never in the Notifications screen.
  const { data, error } = await supabase
    .from('notifications')
    .select(NOTIFICATION_SELECT)
    .eq('user_id', userId)
    .neq('notification_type', 'new_message')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (import.meta.env.DEV) console.warn('[fetchUserNotifications]', error.message);
    return [];
  }

  return (data ?? []) as AppNotification[];
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

export async function deleteNotification(notificationId: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
  if (error) {
    throw error;
  }
}

export async function deleteAllNotifications(userId: string) {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
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
    const { data: response, error } = await supabase.functions.invoke<{
      duplicate?: boolean;
    }>('send-notification', {
      body: data,
    });

    if (error) {
      if (import.meta.env.DEV) console.error('[Notification] invoke error:', error);
      return false;
    }

    return !response?.duplicate;
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
