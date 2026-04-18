import React, { useRef, useState } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { SoftCard } from './SoftCard';
import { cn } from '@/lib/utils';
import { getNotificationPresentation, type AppNotification } from '@/lib/notifications';
import { Body, BodySmall, Caption } from './Typography';
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
  const [isDeleting, setIsDeleting] = useState(false);
  const presentation = getNotificationPresentation(notification, currentLanguage);
  
  const handleDragEnd = async (e: any, info: PanInfo) => {
    // Determine how far dragged
    const x = info.offset.x;
    
    // In RTL, dragging left means x is negative. In LTR, dragging left means x is negative. 
    // Usually swipe to delete is to the left in LTR, and to the right in RTL. Let's unified to dragging "backwards"
    const swipeDistance = isRTL ? x : -x; 
    
    if (swipeDistance > SWIPE_THRESHOLD) {
      // Swipe past threshold -> Delete
      setIsDeleting(true);
      await controls.start({ x: isRTL ? 500 : -500, opacity: 0, transition: { duration: 0.2 } });
      onDelete(notification.id);
    } else {
      // Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } });
    }
  };

  if (isDeleting) return null;

  return (
    <div className="relative mb-2 w-full overflow-hidden rounded-3xl">
      {/* Background Delete Action */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center bg-red-500 rounded-3xl px-6",
          isRTL ? "justify-start" : "justify-end"
        )}
      >
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Foreground Draggable Item */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isRTL ? 0 : -100, right: isRTL ? 100 : 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10 w-full"
      >
        <SoftCard
          onClick={() => onClick(notification.id)}
          className={cn(
            'cursor-pointer p-4 transition-all hover:shadow-md border border-transparent min-h-[96px]',
            !notification.read ? 'border-primary/20 bg-primary/[0.03]' : 'bg-card'
          )}
        >
          <div className="flex gap-4">
            <div 
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm border border-black/5 dark:border-white/5',
                presentation.bgColor
              )}
            >
              {presentation.icon}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-start justify-between gap-2">
                <Body lang={currentLanguage} className="line-clamp-1 font-bold text-foreground">
                  {presentation.title}
                </Body>
                {!notification.read && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              
              <BodySmall lang={currentLanguage} className="line-clamp-2 text-muted-foreground font-medium leading-snug">
                {presentation.message}
              </BodySmall>
              
              <div className="mt-2.5 flex items-center justify-between">
                <Caption lang={currentLanguage} className="text-muted-foreground/70 font-semibold tracking-wide">
                  {format(
                    new Date(notification.created_at),
                    currentLanguage === 'ar' ? 'h:mm a' : 'h:mm a',
                    { locale: currentLanguage === 'ar' ? ar : enUS },
                  )}
                </Caption>
                
                {presentation.isActionable && presentation.actionLabel && (
                  <div className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
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
