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
 * Compact in-app notification banner.
 * Tap anywhere on the pill navigates to actionPath.
 * Small X button to dismiss.
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
        'flex items-start gap-3',
        'rounded-2xl bg-neutral-950 text-white',
        'shadow-[0_12px_34px_rgba(0,0,0,0.32)]',
        'border border-white/15',
        'px-4 py-3.5',
        'w-[calc(100vw-24px)] max-w-[420px]',
        'cursor-pointer select-none',
      )}
      onClick={() => notification.actionPath && onAction(notification.actionPath)}
    >
      {/* Icon avatar */}
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-lg leading-none">
        {notification.icon}
      </div>

      {/* Text */}
      <div className={cn('min-w-0 flex-1', isRtl ? 'text-right' : 'text-left')}>
        <p className={cn(
          'text-[14px] font-semibold leading-snug text-white line-clamp-1',
          isRtl ? 'font-ar-body' : 'font-body',
        )}>
          {notification.title}
        </p>
        <p className={cn(
          'mt-1 text-[13px] leading-snug text-white/85 line-clamp-2',
          isRtl ? 'font-ar-body' : 'font-body',
        )}>
          {notification.message}
        </p>
      </div>

      {/* Dismiss — only button, no reply */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X size={12} strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}
