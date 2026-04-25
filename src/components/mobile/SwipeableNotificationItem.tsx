import React, { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { cn } from '@/lib/utils';
import { getNotificationPresentation, type AppNotification } from '@/lib/notifications';
import { Caption } from './Typography';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface SwipeableNotificationItemProps {
  notification: AppNotification;
  currentLanguage: 'en' | 'ar';
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

export function SwipeableNotificationItem({
  notification,
  currentLanguage,
  onClick,
  onDelete,
}: SwipeableNotificationItemProps) {
  const isRTL = currentLanguage === 'ar';
  const controls = useAnimation();
  const isMountedRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const presentation = getNotificationPresentation(notification, currentLanguage);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const handleDragEnd = async (e: any, info: PanInfo) => {
    if (isDeleting || !isMountedRef.current) return;

    // Determine how far dragged
    const x = info.offset.x;
    
    // In RTL, dragging left means x is negative. In LTR, dragging left means x is negative. 
    // Usually swipe to delete is to the left in LTR, and to the right in RTL. Let's unified to dragging "backwards"
    const swipeDistance = isRTL ? x : -x; 
    
    if (swipeDistance > SWIPE_THRESHOLD) {
      // Swipe past threshold -> Delete
      setIsDeleting(true);
      try {
        await controls.start({ x: isRTL ? 500 : -500, opacity: 0, transition: { duration: 0.2 } });
      } catch {
        // The row can unmount when the notification list refreshes during the gesture.
      }
      if (isMountedRef.current) {
        onDelete(notification.id);
      }
    } else {
      // Snap back
      void controls
        .start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } })
        .catch(() => undefined);
    }
  };

  return (
    <div className="relative mb-3 w-full overflow-hidden rounded-[28px]">
      {/* Background Delete Action */}
      <div 
        className={cn(
          'absolute inset-0 flex items-center rounded-[28px] bg-destructive/10 px-5',
          isRTL ? "justify-start" : "justify-end"
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm">
          <Trash2 className="h-5 w-5" />
        </div>
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isRTL ? 0 : -100, right: isRTL ? 100 : 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={cn('relative z-10 w-full rounded-[28px]', isDeleting && 'pointer-events-none')}
      >
        <SoftCard
          animate={false}
          onClick={() => onClick(notification.id)}
          className={cn(
            'relative min-h-[104px] overflow-hidden rounded-[28px] border p-0 shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all hover:shadow-md',
            !notification.read
              ? 'border-primary/20 bg-[#FFF7ED] dark:bg-[#211812]'
              : 'border-border/50 bg-card'
          )}
        >
          {!notification.read && (
            <div className={cn(
              'absolute top-4 h-2.5 w-2.5 rounded-full bg-primary',
              isRTL ? 'left-4' : 'right-4',
            )} />
          )}

          <div className={cn('flex gap-3 p-4', !notification.read && (isRTL ? 'pl-8' : 'pr-8'))}>
            <div 
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-black/5 text-[24px] shadow-sm dark:border-white/5',
                presentation.bgColor,
                presentation.iconColor,
              )}
            >
              {presentation.icon}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="mb-1 min-w-0">
                <p className={cn(
                  'line-clamp-1 break-words text-[15px] font-extrabold leading-6 text-foreground',
                  isRTL ? 'font-ar-heading text-right' : 'font-heading',
                )}>
                  {presentation.title}
                </p>
              </div>
              
              <p className={cn(
                'line-clamp-2 min-w-0 break-words text-[13px] font-medium leading-5 text-muted-foreground',
                isRTL ? 'font-ar-body text-right' : 'font-body',
              )}>
                {presentation.message}
              </p>
              
              <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Caption lang={currentLanguage} className="text-muted-foreground/70 font-semibold tracking-wide">
                  {format(
                    new Date(notification.created_at),
                    currentLanguage === 'ar' ? 'h:mm a' : 'h:mm a',
                    { locale: currentLanguage === 'ar' ? ar : enUS },
                  )}
                </Caption>
                
                {presentation.isActionable && presentation.actionLabel && (
                  <div className="max-w-full rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    {presentation.actionLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SoftCard>
      </motion.div>
    </div>
  );
}
