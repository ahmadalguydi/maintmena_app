import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Clock, MapPin, Pencil, Star, UserCheck, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ServiceLocationMap } from '@/components/maps/ServiceLocationMap';

interface RequestSummaryCardProps {
  currentLanguage: 'en' | 'ar';
  category: string;
  categoryIcon: React.ReactNode;
  subIssue?: string | null;
  description?: string | null;
  location: string;
  time: string;
  lat?: number;
  lng?: number;
  statusTitle: string;
  statusSubtitle?: string;
  statusColor?: string;
  isPulse?: boolean;
  providerAvatar?: string;
  providerName?: string;
  providerStatusMeta?: string;
  isProviderAssigned?: boolean;
  statusUpdate?: {
    title: string;
    subtitle: string;
    accent: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange' | 'slate';
    avatarUrl?: string;
  } | null;
  expandable?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onEdit?: () => void;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const RequestSummaryCard = ({
  currentLanguage,
  category,
  categoryIcon,
  subIssue,
  description,
  location,
  time,
  lat,
  lng,
  statusTitle,
  statusSubtitle,
  statusColor = 'bg-primary',
  isPulse = false,
  providerAvatar,
  providerName,
  providerStatusMeta,
  isProviderAssigned = false,
  statusUpdate,
  expandable = false,
  actionLabel,
  onAction,
  onEdit,
  onClick,
  className,
  children,
}: RequestSummaryCardProps) => {
  const isRTL = currentLanguage === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);

  const updateAccentClasses = {
    emerald:
      'border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-100/80 text-emerald-800',
    amber:
      'border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-orange-100/80 text-amber-800',
    blue:
      'border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-blue-100/80 text-sky-800',
    purple:
      'border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-fuchsia-100/80 text-violet-800',
    orange:
      'border-orange-200/80 bg-gradient-to-r from-orange-50 via-white to-amber-100/80 text-orange-800',
    slate:
      'border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-100/80 text-slate-800',
  } as const;

  const handleCardClick = () => {
    if (expandable) {
      setIsExpanded((previous) => !previous);
      return;
    }

    onClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        'w-full overflow-hidden rounded-3xl border border-border/50 bg-card shadow-xl relative',
        (onClick || expandable) && 'cursor-pointer transition-transform active:scale-[0.99]',
        className,
      )}
      onClick={handleCardClick}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <ServiceLocationMap
          currentLanguage={currentLanguage}
          lat={lat}
          lng={lng}
          locationLabel={location}
          heightClassName="h-36"
          className="rounded-none border-0 shadow-none"
          statusBadge={
            <div className="rounded-full border border-white/70 bg-white/88 px-3 py-1.5 shadow-sm backdrop-blur-md">
              <span
                className={cn(
                  'text-[11px] font-semibold text-foreground/80',
                  isRTL ? 'font-ar-body' : 'font-body',
                )}
              >
                {statusTitle}
              </span>
            </div>
          }
        />
      </div>

      <div className="space-y-4 p-5 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl shadow-sm">
            {categoryIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'truncate text-lg font-bold text-foreground',
                isRTL ? 'font-ar-heading' : 'font-heading',
              )}
            >
              {category}
            </h3>
            {subIssue ? (
              <p
                className={cn(
                  'mt-0.5 truncate text-sm font-semibold text-foreground/80',
                  isRTL ? 'font-ar-body' : 'font-body',
                )}
              >
                {subIssue}
              </p>
            ) : null}
            {description ? (
              <p
                className={cn(
                  'mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground',
                  isRTL ? 'font-ar-body' : 'font-body',
                )}
              >
                {description}
              </p>
            ) : null}
          </div>

          {onEdit ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-xs font-bold text-foreground shadow-sm transition-colors hover:bg-muted',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              <Pencil className="h-3 w-3" />
              <span>{isRTL ? 'تعديل' : 'Edit'}</span>
            </button>
          ) : null}
        </div>

        <div className="h-px w-full bg-border/50" />

        <AnimatePresence>
          {statusUpdate ? (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              className={cn(
                'relative overflow-hidden rounded-2xl border px-4 py-3 shadow-[0_12px_26px_rgba(0,0,0,0.06)]',
                updateAccentClasses[statusUpdate.accent],
              )}
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.4s_ease-out_1] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12" />
              <div className="relative flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-full bg-white/70 blur-md" />
                  <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-white shadow-sm">
                    {statusUpdate.avatarUrl ? (
                      <img src={statusUpdate.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <BellRing className="h-5 w-5 text-current" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isRTL ? 'font-ar-heading' : 'font-heading',
                    )}
                  >
                    {statusUpdate.title}
                  </p>
                  <p
                    className={cn(
                      'mt-0.5 text-xs text-current/80',
                      isRTL ? 'font-ar-body' : 'font-body',
                    )}
                  >
                    {statusUpdate.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                'font-medium leading-tight text-foreground/90',
                isRTL ? 'font-ar-body' : '',
              )}
            >
              {location}
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                'font-medium text-foreground/90',
                isRTL ? 'font-ar-body' : '',
              )}
            >
              {time}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isProviderAssigned ? (
            <motion.div
              key="provider-assigned"
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative rounded-2xl border border-green-200/60 bg-gradient-to-br from-green-50 to-emerald-50/50 p-4 dark:border-green-800/40 dark:from-green-950/30 dark:to-emerald-950/20"
            >
              <div className="flex items-center gap-3.5 pr-6">
                <div className="relative shrink-0">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.15 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 opacity-40 animate-pulse" />
                    <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-green-300/60 bg-gradient-to-br from-green-100 to-emerald-100 shadow-md dark:border-green-700/60 dark:from-green-900/50 dark:to-emerald-900/50">
                      {providerAvatar ? (
                        <img src={providerAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 12, stiffness: 300, delay: 0.4 }}
                      className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-sm dark:border-card"
                    >
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  </motion.div>
                </div>

                <div className="min-w-0 flex-1">
                  <motion.p
                    initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn(
                      'text-sm font-bold text-green-700 dark:text-green-300',
                      isRTL ? 'font-ar-body' : '',
                    )}
                  >
                    {statusTitle}
                  </motion.p>
                  {providerName ? (
                    <motion.p
                      initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className={cn(
                        'mt-0.5 truncate text-sm font-semibold text-foreground',
                        isRTL ? 'font-ar-body' : '',
                      )}
                    >
                      {providerName}
                    </motion.p>
                  ) : null}
                  {providerStatusMeta ? (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.36 }}
                      className={cn(
                        'mt-1 truncate text-xs text-muted-foreground',
                        isRTL ? 'font-ar-body' : 'font-body',
                      )}
                    >
                      {providerStatusMeta}
                    </motion.p>
                  ) : null}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="mt-1 flex items-center gap-1"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {isRTL ? 'محترف موثوق' : 'Trusted Pro'}
                    </span>
                  </motion.div>
                </div>
              </div>

              {expandable ? (
                <motion.div
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-green-700/60 dark:text-green-300/60"
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="status-matching"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3',
                statusColor === 'bg-primary'
                  ? 'border-primary/10 bg-primary/5'
                  : 'border-border bg-muted/50',
              )}
            >
              <div className="relative flex h-2.5 w-2.5 shrink-0">
                {isPulse ? (
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                      statusColor,
                    )}
                  />
                ) : null}
                <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', statusColor)} />
              </div>
              <div>
                <p
                  className={cn(
                    'text-xs font-bold',
                    isRTL ? 'font-ar-body' : '',
                    statusColor === 'bg-primary' ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {statusTitle}
                </p>
                {statusSubtitle ? (
                  <p className={cn('mt-0.5 text-[10px] text-muted-foreground', isRTL ? 'font-ar-body' : '')}>
                    {statusSubtitle}
                  </p>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(isExpanded || (!expandable && children)) ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-2">
                {children}

                {actionLabel && onAction ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onAction();
                    }}
                    className={cn(
                      'mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90',
                      isRTL ? 'font-ar-heading' : '',
                    )}
                  >
                    {actionLabel}
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
