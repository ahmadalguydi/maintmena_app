import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, CheckCircle2, ChevronDown, ChevronRight, Clock, MapPin, MessageCircle, Pencil, Phone, ShieldCheck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LazyServiceLocationMap } from '@/components/maps/LazyServiceLocationMap';

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
  providerPhone?: string;
  providerRating?: number;
  providerVerified?: boolean;
  providerId?: string;
  isProviderAssigned?: boolean;
  statusUpdate?: {
    title: string;
    subtitle: string;
    accent: 'emerald' | 'amber' | 'blue' | 'purple' | 'orange' | 'slate';
    avatarUrl?: string;
  } | null;
  expandable?: boolean;
  defaultExpanded?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  onEdit?: () => void;
  onViewProvider?: () => void;
  onMessage?: () => void;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  urgentCta?: { label: string; sublabel?: string; onClick: () => void };
}

// Maps statusColor → visual tokens for the status pill/strip
const STATUS_STYLE: Record<string, {
  bg: string;
  border: string;
  dot: string;
  text: string;
  sub: string;
  strip: string;
  stepDot: string;
  stepIndex: number;  // which of 4 steps is active (0-3), -1 = n/a
}> = {
  'bg-primary': {
    bg: 'bg-primary/5',
    border: 'border-primary/15',
    dot: 'bg-primary',
    text: 'text-primary',
    sub: 'text-primary/55',
    strip: 'bg-primary',
    stepDot: 'bg-primary',
    stepIndex: 0,
  },
  'bg-rose-400': {
    bg: 'bg-rose-50 dark:bg-rose-950/25',
    border: 'border-rose-200/60 dark:border-rose-800/30',
    dot: 'bg-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    sub: 'text-rose-400/70',
    strip: 'bg-rose-400',
    stepDot: 'bg-rose-400',
    stepIndex: -1,
  },
  'bg-green-500': {
    bg: 'bg-green-50/80 dark:bg-green-950/25',
    border: 'border-green-200/60 dark:border-green-800/30',
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    sub: 'text-green-500/60',
    strip: 'bg-green-500',
    stepDot: 'bg-green-500',
    stepIndex: 1,
  },
  'bg-amber-500': {
    bg: 'bg-amber-50/80 dark:bg-amber-950/25',
    border: 'border-amber-200/60 dark:border-amber-800/30',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    sub: 'text-amber-500/60',
    strip: 'bg-amber-500',
    stepDot: 'bg-amber-500',
    stepIndex: 2,
  },
  'bg-sky-500': {
    bg: 'bg-sky-50/80 dark:bg-sky-950/25',
    border: 'border-sky-200/60 dark:border-sky-800/30',
    dot: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-400',
    sub: 'text-sky-500/60',
    strip: 'bg-sky-500',
    stepDot: 'bg-sky-500',
    stepIndex: 2,
  },
  'bg-violet-500': {
    bg: 'bg-violet-50/80 dark:bg-violet-950/25',
    border: 'border-violet-200/60 dark:border-violet-800/30',
    dot: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-400',
    sub: 'text-violet-500/60',
    strip: 'bg-violet-500',
    stepDot: 'bg-violet-500',
    stepIndex: 2,
  },
  'bg-orange-500': {
    bg: 'bg-orange-50/80 dark:bg-orange-950/25',
    border: 'border-orange-200/60 dark:border-orange-800/30',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    sub: 'text-orange-500/60',
    strip: 'bg-orange-500',
    stepDot: 'bg-orange-500',
    stepIndex: 3,
  },
  'bg-teal-500': {
    bg: 'bg-teal-50/80 dark:bg-teal-950/25',
    border: 'border-teal-200/60 dark:border-teal-800/30',
    dot: 'bg-teal-500',
    text: 'text-teal-700 dark:text-teal-400',
    sub: 'text-teal-500/60',
    strip: 'bg-teal-500',
    stepDot: 'bg-teal-500',
    stepIndex: 3,
  },
  'bg-slate-500': {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200/60 dark:border-slate-700/30',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    sub: 'text-slate-400/60',
    strip: 'bg-slate-400',
    stepDot: 'bg-slate-400',
    stepIndex: 3,
  },
  'bg-slate-400': {
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200/50 dark:border-slate-700/20',
    dot: 'bg-slate-400',
    text: 'text-slate-400 dark:text-slate-500',
    sub: 'text-slate-400/50',
    strip: 'bg-slate-300',
    stepDot: 'bg-slate-300',
    stepIndex: -1,
  },
};

const FALLBACK_STYLE = STATUS_STYLE['bg-primary'];

const UPDATE_ACCENT: Record<string, string> = {
  emerald: 'border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-100/80 text-emerald-800',
  amber: 'border-amber-200/80 bg-gradient-to-r from-amber-50 via-white to-orange-100/80 text-amber-800',
  blue: 'border-sky-200/80 bg-gradient-to-r from-sky-50 via-white to-blue-100/80 text-sky-800',
  purple: 'border-violet-200/80 bg-gradient-to-r from-violet-50 via-white to-fuchsia-100/80 text-violet-800',
  orange: 'border-orange-200/80 bg-gradient-to-r from-orange-50 via-white to-amber-100/80 text-orange-800',
  slate: 'border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-100/80 text-slate-800',
};

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
  providerPhone,
  providerRating,
  providerVerified,
  providerId,
  isProviderAssigned = false,
  statusUpdate,
  expandable = false,
  defaultExpanded = false,
  actionLabel,
  onAction,
  onEdit,
  onViewProvider,
  onMessage,
  onClick,
  className,
  children,
  urgentCta,
}: RequestSummaryCardProps) => {
  const isRTL = currentLanguage === 'ar';
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isUrgent = Boolean(urgentCta);
  const style = STATUS_STYLE[statusColor] ?? FALLBACK_STYLE;

  const handleCardClick = () => {
    if (expandable) { setIsExpanded((p) => !p); return; }
    onClick?.();
  };

  // 4 step dots: Matching (0), Assigned (1), Active (2), Done (3)
  const stepIndex = style.stepIndex;

  // Avatar with DiceBear fallback so there's always something visual
  const dicebearFallback = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(providerId || providerName || 'provider')}`;
  const avatarSrc = providerAvatar || dicebearFallback;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 320 }}
      className={cn(
        'w-full overflow-hidden rounded-3xl bg-card',
        isUrgent
          ? 'border-2 border-orange-400 shadow-[0_0_0_4px_rgba(251,146,60,0.18),0_12px_40px_-8px_rgba(251,146,60,0.25)]'
          : isProviderAssigned
            ? cn('border-2', style.border, 'shadow-[0_8px_30px_rgb(0,0,0,0.07)]')
            : 'border border-border/60 shadow-[0_8px_30px_rgb(0,0,0,0.05)]',
        (onClick || expandable) && 'cursor-pointer active:scale-[0.99] transition-transform',
        className,
      )}
      onClick={handleCardClick}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Map */}
      <div onClick={(e) => e.stopPropagation()}>
        <LazyServiceLocationMap
          currentLanguage={currentLanguage}
          lat={lat}
          lng={lng}
          locationLabel={location}
          heightClassName="h-36"
          className="rounded-none border-0 shadow-none"
        />
      </div>

      <div className="space-y-3.5 px-4 pb-4 pt-3">
        {/* Category row */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-[22px]">
            {categoryIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn('truncate text-[17px] font-bold text-foreground leading-tight', isRTL ? 'font-ar-heading' : 'font-heading')}>
              {category}
            </h3>
            {subIssue ? (
              <p className={cn('mt-0.5 truncate text-sm font-medium text-foreground/70', isRTL ? 'font-ar-body' : '')}>
                {subIssue}
              </p>
            ) : null}
            {description && !subIssue ? (
              <p className={cn('mt-0.5 line-clamp-1 text-[13px] text-muted-foreground', isRTL ? 'font-ar-body' : '')}>
                {description}
              </p>
            ) : null}
          </div>
          {onEdit ? (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-muted active:scale-90"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Meta row: location + time */}
        <div className="flex items-center gap-4 text-[13px]">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <span className={cn('truncate font-medium text-foreground/75', isRTL ? 'font-ar-body' : '')}>{location}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className={cn('font-medium text-foreground/75', isRTL ? 'font-ar-body' : '')}>{time}</span>
          </div>
        </div>

        {/* Transient update banner */}
        <AnimatePresence>
          {statusUpdate ? (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className={cn('relative overflow-hidden rounded-2xl border px-3.5 py-2.5 shadow-sm', UPDATE_ACCENT[statusUpdate.accent])}
            >
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.4s_ease-out_1] bg-gradient-to-r from-transparent via-white/60 to-transparent skew-x-12" />
              <div className="relative flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-white shadow-sm">
                  {statusUpdate.avatarUrl
                    ? <img src={statusUpdate.avatarUrl} alt="" className="h-full w-full object-cover" />
                    : <BellRing className="h-4 w-4 text-current" />}
                </div>
                <div className="min-w-0">
                  <p className={cn('text-[13px] font-semibold leading-tight', isRTL ? 'font-ar-body' : '')}>{statusUpdate.title}</p>
                  <p className={cn('mt-0.5 text-[11px] text-current/75', isRTL ? 'font-ar-body' : '')}>{statusUpdate.subtitle}</p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── STATUS SECTION ── */}
        <AnimatePresence mode="wait">
          {isProviderAssigned ? (
            /* ── PROVIDER CARD ── */
            <motion.div
              key="provider"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-white via-white to-primary/[0.03]"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
            >
              {/* Thin status strip + label */}
              <div className={cn('flex items-center gap-2 px-3.5 pt-2.5 pb-2')}>
                <div className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} />
                <span className={cn('text-[12px] font-semibold', isRTL ? 'font-ar-body' : '', style.text)}>
                  {statusTitle}
                </span>
                {statusSubtitle ? (
                  <span className={cn('text-[11px]', isRTL ? 'font-ar-body' : '', style.sub)}>
                    · {statusSubtitle}
                  </span>
                ) : null}
              </div>

              {/* Avatar row — tappable to open profile */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProvider?.();
                }}
                disabled={!onViewProvider}
                className={cn(
                  'flex w-full items-center gap-3 px-3.5 py-3 transition-colors',
                  onViewProvider ? 'hover:bg-muted/40 active:bg-muted/70 cursor-pointer' : 'cursor-default',
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                    className="h-[52px] w-[52px] overflow-hidden rounded-2xl border-2 border-white bg-muted shadow-sm"
                  >
                    <img
                      src={avatarSrc}
                      alt={providerName ?? ''}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const t = e.target as HTMLImageElement;
                        t.onerror = null;
                        t.src = dicebearFallback;
                      }}
                    />
                  </motion.div>
                  {/* Verified badge */}
                  {providerVerified ? (
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-sm">
                      <ShieldCheck className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    /* Green active dot */
                    <div className={cn('absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white', style.dot)} />
                  )}
                </div>

                {/* Name + rating */}
                <div className="min-w-0 flex-1 text-start">
                  <p className={cn('truncate text-[15px] font-bold text-foreground leading-tight', isRTL ? 'font-ar-body' : '')}>
                    {providerName || (isRTL ? 'مقدم الخدمة' : 'Service Provider')}
                  </p>
                  {providerStatusMeta ? (
                    <p className={cn('mt-0.5 truncate text-[12px] text-muted-foreground', isRTL ? 'font-ar-body' : '')}>
                      {providerStatusMeta}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1.5">
                    {typeof providerRating === 'number' && providerRating > 0 ? (
                      <>
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[12px] font-semibold text-foreground/70">{providerRating.toFixed(1)}</span>
                        <span className="text-muted-foreground/40">·</span>
                      </>
                    ) : null}
                    <span className={cn('text-[12px] font-medium text-muted-foreground', isRTL ? 'font-ar-body' : '')}>
                      {isRTL ? 'محترف موثوق' : 'Trusted Pro'}
                    </span>
                  </div>
                </div>

                {/* Tap indicator */}
                {onViewProvider ? (
                  <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground/40', isRTL && 'rotate-180')} />
                ) : null}
              </button>

              {/* Step progress dots */}
              {stepIndex >= 0 ? (
                <div className="flex items-center gap-1.5 px-3.5 pb-2.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded-full transition-all duration-500',
                        i === stepIndex
                          ? cn('h-2 w-5', style.stepDot)
                          : i < stepIndex
                            ? cn('h-2 w-2', style.stepDot, 'opacity-50')
                            : 'h-2 w-2 bg-border/60',
                      )}
                    />
                  ))}
                  <span className={cn('ms-1 text-[10px] font-medium text-muted-foreground/50', isRTL ? 'font-ar-body' : '')}>
                    {statusTitle}
                  </span>
                </div>
              ) : null}

              {/* Quick actions row */}
              {(providerPhone || onMessage) ? (
                <div className={cn('flex border-t border-border/30', isRTL && 'flex-row-reverse')}>
                  {providerPhone ? (
                    <a
                      href={`tel:${providerPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 active:bg-muted/70"
                    >
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <span className={isRTL ? 'font-ar-body' : ''}>{isRTL ? 'اتصال' : 'Call'}</span>
                    </a>
                  ) : null}
                  {providerPhone && onMessage ? (
                    <div className="w-px bg-border/30" />
                  ) : null}
                  {onMessage ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMessage(); }}
                      className="flex flex-1 items-center justify-center gap-2 py-3 text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 active:bg-muted/70"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-primary" />
                      <span className={isRTL ? 'font-ar-body' : ''}>{isRTL ? 'رسالة' : 'Message'}</span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </motion.div>

          ) : (
            /* ── SEARCHING / STATUS ── */
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3', style.bg, style.border)}
            >
              <div className="relative flex h-3 w-3 shrink-0">
                {isPulse ? (
                  <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-55 animate-ping', style.dot)} />
                ) : null}
                <span className={cn('relative inline-flex h-3 w-3 rounded-full', style.dot)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[13px] font-bold leading-tight', isRTL ? 'font-ar-body' : '', style.text)}>
                  {statusTitle}
                </p>
                {statusSubtitle ? (
                  <p className={cn('mt-0.5 text-[11px]', isRTL ? 'font-ar-body' : '', style.sub)}>
                    {statusSubtitle}
                  </p>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable children */}
        <AnimatePresence initial={false}>
          {(isExpanded || (!expandable && children)) ? (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              {/* Separator */}
              <div className={cn('mb-3.5 h-px w-full', style.bg, 'border-t', style.border)} />
              <div className="space-y-3.5">
                {children}
                {actionLabel && onAction ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAction(); }}
                    className={cn(
                      'mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[15px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]',
                      isRTL ? 'font-ar-heading' : '',
                    )}
                  >
                    {actionLabel}
                    <ChevronRight className={cn('h-4 w-4', isRTL && 'rotate-180')} />
                  </button>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Urgent CTA — always visible, replaces expand pill when urgent */}
        {isUrgent && urgentCta ? (
          <motion.button
            onClick={(e) => { e.stopPropagation(); urgentCta.onClick(); }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.1 }}
            className={cn(
              'relative mt-2 flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl bg-orange-500 px-4 py-3.5 text-white transition-all hover:bg-orange-500/90 active:scale-[0.98]',
            )}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.2s_ease-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            <div className={cn('relative flex items-center gap-3', isRTL && 'flex-row-reverse')}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className={cn('text-start', isRTL && 'text-end')}>
                <p className={cn('text-[14px] font-bold leading-tight', isRTL ? 'font-ar-heading' : 'font-heading')}>
                  {urgentCta.label}
                </p>
                {urgentCta.sublabel ? (
                  <p className={cn('mt-0.5 text-[11px] font-medium text-white/75', isRTL ? 'font-ar-body' : '')}>
                    {urgentCta.sublabel}
                  </p>
                ) : null}
              </div>
            </div>
            <ChevronRight className={cn('relative h-4 w-4 shrink-0 text-white/70', isRTL && 'rotate-180')} />
          </motion.button>
        ) : expandable && children ? (
          /* Expand / collapse footer pill — only when expandable and has children */
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded((p) => !p); }}
            className={cn(
              'mt-1 flex w-full items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-[12px] font-semibold transition-colors',
              isExpanded
                ? cn(style.bg, style.border, style.text, 'hover:opacity-80')
                : 'border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/70',
            )}
          >
            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.22 }} className="flex">
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
            <span className={isRTL ? 'font-ar-body' : ''}>
              {isExpanded
                ? (isRTL ? 'إخفاء التفاصيل' : 'Hide details')
                : (isRTL ? 'عرض التفاصيل' : 'Show details')}
            </span>
          </button>
        ) : null}
      </div>
    </motion.div>
  );
};
