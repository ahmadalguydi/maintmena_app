import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Bell, Check, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Body, BodySmall, Caption, Heading2, Heading3 } from '@/components/mobile/Typography';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { getNotificationPresentation, getNotificationTarget } from '@/lib/notifications';

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
            <div className="space-y-3">
              <AnimatePresence>
                {notifications.map((notification, index) => {
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
                        className={`cursor-pointer p-4 transition-all hover:shadow-md ${
                          !notification.read ? 'border-accent/20 bg-accent/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className="text-3xl">{presentation.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <Body lang={currentLanguage} className="line-clamp-1 font-semibold">
                                {presentation.title}
                              </Body>
                              {!notification.read && (
                                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>
                            <BodySmall lang={currentLanguage} className="mb-2 line-clamp-2 text-muted-foreground">
                              {presentation.message}
                            </BodySmall>
                            <Caption lang={currentLanguage} className="text-muted-foreground">
                              {format(
                                new Date(notification.created_at),
                                currentLanguage === 'ar' ? 'd MMM، h:mm a' : 'MMM d, h:mm a',
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
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
