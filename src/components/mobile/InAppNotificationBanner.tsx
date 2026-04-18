import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BannerNotification {
  id: string;
  icon: string;
  title: string;
  message: string;
  /** Tapping the banner navigates here */
  actionPath?: string;
}

interface InAppNotificationBannerProps {
  notification: BannerNotification;
  onDismiss: () => void;
  onAction: (path: string) => void;
  currentLanguage: 'en' | 'ar';
}

/**
 * Instagram-style in-app notification pill.
 *
 * Slides down from the top of the screen.
 * Tap anywhere on the pill navigates to actionPath.
 * Small X button to dismiss.
 * No reply / action buttons.
 */
export function InAppNotificationBanner({
  notification,
  onDismiss,
  onAction,
  currentLanguage,
}: InAppNotificationBannerProps) {
  const isRtl = currentLanguage === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: -72, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        'flex items-center gap-3',
        'rounded-full bg-[#1c1c1e]/92 dark:bg-[#1c1c1e]/95',
        'shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl',
        'border border-white/10',
        'px-4 py-3',
        'w-[calc(100vw-24px)] max-w-[400px]',
        'cursor-pointer select-none',
      )}
      onClick={() => notification.actionPath && onAction(notification.actionPath)}
    >
      {/* Icon avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg leading-none">
        {notification.icon}
      </div>

      {/* Text */}
      <div className={cn('min-w-0 flex-1', isRtl ? 'text-right' : 'text-left')}>
        <p className={cn(
          'text-[13px] font-semibold leading-tight text-white line-clamp-1',
          isRtl ? 'font-ar-body' : 'font-body',
        )}>
          {notification.title}
        </p>
        <p className={cn(
          'mt-0.5 text-[12px] leading-snug text-white/65 line-clamp-1',
          isRtl ? 'font-ar-body' : 'font-body',
        )}>
          {notification.message}
        </p>
      </div>

      {/* Dismiss — only button, no reply */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}
