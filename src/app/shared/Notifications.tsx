import { AnimatePresence, motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Body, BodySmall, Caption, Heading2, Heading3 } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { getNotificationPresentation, getNotificationTarget, type AppNotification } from '@/lib/notifications';

export default function Notifications() {
  const { userType } = useAuth();
  const navigate = useNavigate();
  const currentLanguage = (
    localStorage.getItem('preferredLanguage') ||
    localStorage.getItem('currentLanguage') ||
    'ar'
  ) as 'en' | 'ar';

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications();

  const effectiveUserType = userType === 'seller' ? 'seller' : 'buyer';

  // Group notifications by time period
  const groupNotifications = (items: AppNotification[]) => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const earlier: AppNotification[] = [];
    for (const n of items) {
      const d = new Date(n.created_at);
      if (isToday(d)) today.push(n);
      else if (isYesterday(d)) yesterday.push(n);
      else earlier.push(n);
    }
    const groups: Array<{ label: string; items: AppNotification[] }> = [];
    if (today.length) groups.push({ label: currentLanguage === 'ar' ? 'اليوم' : 'Today', items: today });
    if (yesterday.length) groups.push({ label: currentLanguage === 'ar' ? 'أمس' : 'Yesterday', items: yesterday });
    if (earlier.length) groups.push({ label: currentLanguage === 'ar' ? 'سابقاً' : 'Earlier', items: earlier });
    return groups;
  };

  const handleNotificationClick = async (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) return;

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    navigate(getNotificationTarget(notification, effectiveUserType));
  };

  return (
    <div className="min-h-app bg-background pb-24" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex min-h-app flex-col px-4 pt-safe pb-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Heading2 lang={currentLanguage} className="text-foreground">
              {currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications'}
            </Heading2>
            {unreadCount > 0 && (
              <BodySmall lang={currentLanguage} className="mt-1 text-muted-foreground">
                {currentLanguage === 'ar'
                  ? `${unreadCount} إشعار جديد`
                  : `${unreadCount} new notification${unreadCount > 1 ? 's' : ''}`}
              </BodySmall>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllAsRead()}
              disabled={isMarkingAllRead}
              className="min-h-[44px] text-primary"
            >
              <Check size={16} className="mr-2" />
              {currentLanguage === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read'}
            </Button>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((index) => (
                <SoftCard key={index} className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </SoftCard>
              ))}
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
              <RefreshCw size={48} className="mx-auto mb-4 text-muted-foreground/40" />
              <Heading3 lang={currentLanguage} className="mb-2 text-foreground">
                {currentLanguage === 'ar' ? 'تعذر تحميل الإشعارات' : 'Unable to load notifications'}
              </Heading3>
              <Body lang={currentLanguage} className="mx-auto mb-4 max-w-sm text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'حدثت مشكلة أثناء تحميل الإشعارات. حاول مرة أخرى.'
                  : 'Something went wrong while loading notifications. Try again.'}
              </Body>
              <Button onClick={() => window.location.reload()}>
                {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </motion.div>
          ) : notifications.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
              <Bell size={64} className="mx-auto mb-4 text-muted-foreground/30" />
              <Heading3 lang={currentLanguage} className="mb-2 text-foreground">
                {currentLanguage === 'ar' ? 'لا توجد إشعارات' : 'No Notifications'}
              </Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground">
                {currentLanguage === 'ar'
                  ? 'ستظهر هنا جميع تحديثات الطلبات والرسائل.'
                  : 'Request and conversation updates will appear here.'}
              </Body>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {groupNotifications(notifications).map((group) => (
                <div key={group.label}>
                  <p className={cn(
                    'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                  )}>
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {group.items.map((notification, index) => {
                        const presentation = getNotificationPresentation(notification, currentLanguage);
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04 }}
                          >
                            <SoftCard
                              onClick={() => void handleNotificationClick(notification.id)}
                              className={cn(
                                'cursor-pointer p-4 transition-all hover:shadow-md',
                                !notification.read && 'border-primary/20 bg-primary/[0.03]',
                              )}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl',
                                  !notification.read ? 'bg-primary/8' : 'bg-muted/50',
                                )}>
                                  {presentation.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-0.5 flex items-start justify-between gap-2">
                                    <Body lang={currentLanguage} className="line-clamp-1 font-semibold text-foreground">
                                      {presentation.title}
                                    </Body>
                                    {!notification.read && (
                                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                    )}
                                  </div>
                                  <BodySmall lang={currentLanguage} className="line-clamp-2 text-muted-foreground">
                                    {presentation.message}
                                  </BodySmall>
                                  <Caption lang={currentLanguage} className="mt-1.5 text-muted-foreground/70">
                                    {format(
                                      new Date(notification.created_at),
                                      currentLanguage === 'ar' ? 'h:mm a' : 'h:mm a',
                                      { locale: currentLanguage === 'ar' ? ar : enUS },
                                    )}
                                  </Caption>
                                </div>
                              </div>
                            </SoftCard>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
