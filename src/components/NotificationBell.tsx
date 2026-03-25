import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { getNotificationPresentation, getNotificationTarget } from '@/lib/notifications';

interface NotificationBellProps {
  currentLanguage?: 'en' | 'ar';
}

export const NotificationBell = ({ currentLanguage: propLanguage }: NotificationBellProps = {}) => {
  const { userType } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage =
    propLanguage || (localStorage.getItem('preferredLanguage') as 'en' | 'ar') || 'ar';

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications();

  const effectiveUserType = userType === 'seller' ? 'seller' : 'buyer';
  const previewNotifications = notifications.slice(0, 20);

  const t = {
    notifications: currentLanguage === 'ar' ? 'الإشعارات' : 'Notifications',
    markAllRead: currentLanguage === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all read',
    noNotifications: currentLanguage === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet',
  };

  const handleNotificationClick = async (notificationId: string) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification) return;

    if (!notification.read) {
      await markAsRead(notification.id);
    }

    setIsOpen(false);
    navigate(getNotificationTarget(notification, effectiveUserType));
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1"
              >
                <Badge variant="destructive" className="flex h-5 w-5 items-center justify-center p-0 text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between border-b border-rule p-4">
          <h3 className={`font-semibold text-ink ${currentLanguage === 'ar' ? 'font-ar-heading' : ''}`}>
            {t.notifications}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void markAllAsRead()}
              disabled={isMarkingAllRead}
              className={`text-xs ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}
            >
              {t.markAllRead}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex gap-3 p-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-full rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : previewNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto mb-2 h-12 w-12 opacity-20" />
              <p className={`text-sm ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>{t.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y divide-rule">
              {previewNotifications.map((notification) => {
                const presentation = getNotificationPresentation(notification, currentLanguage);
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`cursor-pointer p-4 transition-colors hover:bg-muted/30 ${
                      !notification.read ? 'bg-accent/5' : ''
                    }`}
                    onClick={() => void handleNotificationClick(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 text-2xl">{presentation.icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`line-clamp-1 text-sm font-medium text-ink ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                            {presentation.title}
                          </h4>
                          {!notification.read && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                        </div>
                        <p className={`mt-1 line-clamp-2 text-sm text-muted-foreground ${currentLanguage === 'ar' ? 'font-ar-body' : ''}`}>
                          {presentation.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {format(
                            new Date(notification.created_at),
                            currentLanguage === 'ar' ? 'd MMM، h:mm a' : 'MMM d, h:mm a',
                            { locale: currentLanguage === 'ar' ? ar : enUS },
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
