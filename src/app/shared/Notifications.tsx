import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Bell, BellOff, Check, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Body, BodySmall, Heading2, Heading3 } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { getNotificationTarget, notificationQueryKeys, type AppNotification } from '@/lib/notifications';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { SwipeableNotificationItem } from '@/components/mobile/SwipeableNotificationItem';
import { isToday, isYesterday } from 'date-fns';

export default function Notifications() {
  const { userType, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentLanguage = (localStorage.getItem('preferredLanguage') || localStorage.getItem('currentLanguage') || 'ar') as 'en' | 'ar';

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteOne,
    deleteAll,
    isMarkingAllRead,
    isDeletingAll,
  } = useNotifications();

  const effectiveUserType = userType === 'seller' ? 'seller' : 'buyer';
  const isRTL = currentLanguage === 'ar';

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.list(user.id) });
    await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.unreadCount(user.id) });
  }, [user, queryClient]);

  const { containerRef, isPulling, pullDistance, isRefreshing, progress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

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
    if (today.length) groups.push({ label: isRTL ? 'اليوم' : 'Today', items: today });
    if (yesterday.length) groups.push({ label: isRTL ? 'أمس' : 'Yesterday', items: yesterday });
    if (earlier.length) groups.push({ label: isRTL ? 'سابقاً' : 'Earlier', items: earlier });
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
    <div className="min-h-app bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex min-h-app flex-col px-4 pt-safe pb-6">
        
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Heading2 lang={currentLanguage} className="text-foreground">
              {isRTL ? 'الإشعارات' : 'Notifications'}
            </Heading2>
            {unreadCount > 0 && (
              <div className="mt-1 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {unreadCount}
                </span>
                <BodySmall lang={currentLanguage} className="font-medium text-muted-foreground">
                  {isRTL ? 'إشعار جديد' : 'new'}
                </BodySmall>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void markAllAsRead()}
                disabled={isMarkingAllRead}
                className="h-10 w-10 p-0 text-primary rounded-full bg-primary/5 shrink-0"
              >
                <CheckCircle2 size={20} />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void deleteAll()}
                disabled={isDeletingAll}
                className="h-10 w-10 p-0 text-red-500 rounded-full bg-red-500/5 shrink-0"
              >
                <BellOff size={18} />
              </Button>
            )}
          </div>
        </div>

        {/* Pull to Refresh Indicator */}
        <div 
          className="flex justify-center transition-all duration-200 overflow-hidden"
          style={{ height: pullDistance > 0 ? pullDistance : isRefreshing ? 60 : 0 }}
        >
          <div className="flex flex-col items-center justify-end pb-4">
            <RefreshCw 
              size={24} 
              className={cn("text-primary/70", isRefreshing && "animate-spin")} 
              style={{ transform: `rotate(${progress * 180}deg)`, opacity: Math.max(0.2, progress) }}
            />
          </div>
        </div>

        <ScrollArea ref={containerRef} className="min-h-0 flex-1">
          {isLoading ? (
            <div className="space-y-4 pt-2">
              {[1, 2, 3, 4, 5].map((index) => (
                <SoftCard key={index} className="p-4 rounded-3xl">
                  <div className="flex gap-4">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <div className="flex-1 space-y-3 py-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-1/2 rounded-md" />
                        <Skeleton className="h-4 w-12 rounded-md" />
                      </div>
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                    </div>
                  </div>
                </SoftCard>
              ))}
            </div>
          ) : error ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
              <RefreshCw size={56} className="mx-auto mb-5 text-muted-foreground/30" />
              <Heading3 lang={currentLanguage} className="mb-2 text-foreground">
                {isRTL ? 'تعذر تحميل الإشعارات' : 'Unable to load'}
              </Heading3>
              <Body lang={currentLanguage} className="mx-auto mb-6 max-w-[240px] text-muted-foreground text-sm">
                {isRTL
                  ? 'يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.'
                  : 'Please check your connection and try again.'}
              </Body>
              <Button size="lg" className="rounded-2xl" onClick={handleRefresh}>
                {isRTL ? 'إعادة المحاولة' : 'Retry'}
              </Button>
            </motion.div>
          ) : notifications.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/30 mb-6">
                <Bell size={40} className="text-muted-foreground/40" />
              </div>
              <Heading3 lang={currentLanguage} className="mb-3 text-foreground">
                {isRTL ? 'أنت على اطلاع دائم!' : "You're all caught up!"}
              </Heading3>
              <Body lang={currentLanguage} className="text-muted-foreground max-w-[260px] text-center">
                {isRTL
                  ? 'سيتم عرض جميع التحديثات المتعلقة بالطلبات والرسائل هنا.'
                  : 'Updates related to your requests and messages will appear here.'}
              </Body>
            </motion.div>
          ) : (
            <div className="space-y-6 pt-2">
              {groupNotifications(notifications).map((group) => (
                <div key={group.label}>
                  <p className={cn(
                    'text-[13px] font-bold text-muted-foreground/80 tracking-wide mb-3 px-2',
                    isRTL ? 'font-ar-body' : 'font-body',
                  )}>
                    {group.label}
                  </p>
                  <div className="space-y-0 relative">
                    <AnimatePresence mode="popLayout">
                      {group.items.map((notification, index) => (
                        <motion.div
                          key={notification.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                          transition={{ delay: index * 0.03, type: "spring", stiffness: 300, damping: 25 }}
                        >
                          <SwipeableNotificationItem
                            notification={notification}
                            currentLanguage={currentLanguage}
                            onClick={handleNotificationClick}
                            onDelete={(id) => deleteOne(id)}
                          />
                        </motion.div>
                      ))}
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
