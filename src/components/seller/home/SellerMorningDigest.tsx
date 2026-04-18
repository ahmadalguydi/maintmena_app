/**
 * SellerMorningDigest  ·  Part 4.4
 *
 * A single warm card that greets the seller each morning with yesterday's
 * story in plain language. Fires at 7:00 AM local time if the seller
 * hasn't opened the app since midnight.
 *
 * Contents (all respectful, all specific, all grounded in data):
 *   – Yesterday's earnings (with a trend arrow vs last week's avg)
 *   – New reviews received (collapsed count, tap to read)
 *   – Weekly target progress (not guilt-framed — just "where you are")
 *   – Opportunities waiting (waitlist + hot demand)
 *   – One suggested action, if useful
 *
 * No external API added — it reads from existing hooks. Mount inside the
 * Offline state (morning before they go online). Dismiss persists via
 * localStorage so it only shows once per day.
 */

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, Target, Clock3, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMotion } from '@/hooks/useMotion';
import { cn } from '@/lib/utils';

interface DigestNumbers {
    yesterdayEarnings: number;
    weeklyAvgEarnings: number;
    newReviews: number;
    weeklyTarget: number;
    weeklyEarnedSoFar: number;
    waitingOpportunities: number;
}

interface SellerMorningDigestProps {
    currentLanguage: 'en' | 'ar';
    sellerName?: string;
    data: DigestNumbers;
    onDismiss?: () => void;
    className?: string;
}

function storageKey() {
    const today = new Date();
    return `mm_morning_digest_${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}

function withinMorningWindow(): boolean {
    const h = new Date().getHours();
    return h >= 5 && h < 12;
}

export function SellerMorningDigest({
    currentLanguage,
    sellerName,
    data,
    onDismiss,
    className,
}: SellerMorningDigestProps) {
    const m = useMotion();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(true);
    const isAr = currentLanguage === 'ar';

    useEffect(() => {
        try {
            const dismissed = localStorage.getItem(storageKey());
            if (dismissed === '1' || !withinMorningWindow()) setVisible(false);
        } catch {/* swallow */}
    }, []);

    const trendPct = useMemo(() => {
        if (data.weeklyAvgEarnings <= 0) return 0;
        return Math.round(((data.yesterdayEarnings - data.weeklyAvgEarnings) / data.weeklyAvgEarnings) * 100);
    }, [data.yesterdayEarnings, data.weeklyAvgEarnings]);
    const trendUp = trendPct >= 0;

    const targetPct = Math.min(100, Math.round((data.weeklyEarnedSoFar / Math.max(1, data.weeklyTarget)) * 100));

    const copy = isAr
        ? {
            greeting: sellerName ? `صباح الخير، ${sellerName}` : 'صباح الخير',
            summary: 'هذي صورة يومك أمس — باختصار',
            yesterday: 'أرباح أمس',
            vsAvg: 'مقارنة بمتوسطك الأسبوعي',
            reviews: 'تقييمات جديدة',
            target: 'هدف الأسبوع',
            targetDone: `${targetPct}% تم`,
            waiting: 'فرص تنتظرك',
            cta: 'ابدأ يومك',
            dismiss: 'إغلاق',
            tapToRead: 'اقرأ',
        }
        : {
            greeting: sellerName ? `Good morning, ${sellerName}` : 'Good morning',
            summary: 'Here\'s yesterday at a glance',
            yesterday: "Yesterday's earnings",
            vsAvg: 'vs. your weekly average',
            reviews: 'New reviews',
            target: 'Weekly target',
            targetDone: `${targetPct}% there`,
            waiting: 'Opportunities waiting',
            cta: 'Start your day',
            dismiss: 'Dismiss',
            tapToRead: 'Read',
        };

    const handleDismiss = () => {
        try { localStorage.setItem(storageKey(), '1'); } catch {/* swallow */}
        setVisible(false);
        onDismiss?.();
    };

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.section
                dir={isAr ? 'rtl' : 'ltr'}
                initial={m.isReduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                animate={m.isReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={m.spring.gentle}
                className={cn(
                    'relative rounded-3xl overflow-hidden',
                    'border border-border/40',
                    'bg-gradient-to-br from-amber-50/60 via-background to-emerald-50/40',
                    'dark:from-amber-950/30 dark:via-background dark:to-emerald-950/20',
                    'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
                    'p-5',
                    className,
                )}
            >
                {/* Dismiss */}
                <button
                    type="button"
                    aria-label={copy.dismiss}
                    onClick={handleDismiss}
                    className={cn(
                        'absolute top-3 end-3 h-8 w-8 flex items-center justify-center rounded-full',
                        'text-muted-foreground/70 hover:bg-muted/60 transition-colors',
                    )}
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Greeting */}
                <div className="mb-4">
                    <p className={cn(
                        'text-xs font-medium text-muted-foreground uppercase tracking-[0.14em]',
                        isAr ? 'font-ar-body' : 'font-body',
                    )}>
                        {new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    <h2 className={cn(
                        'text-xl font-bold text-foreground mt-0.5',
                        isAr ? 'font-ar-display' : 'font-display',
                    )}>
                        {copy.greeting}
                    </h2>
                    <p className={cn(
                        'text-xs text-muted-foreground mt-0.5',
                        isAr ? 'font-ar-body' : 'font-body',
                    )}>
                        {copy.summary}
                    </p>
                </div>

                {/* Numbers — two columns */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Yesterday */}
                    <DigestTile
                        label={copy.yesterday}
                        value={`${data.yesterdayEarnings.toLocaleString()} SAR`}
                        isAr={isAr}
                        footer={
                            <span className={cn(
                                'inline-flex items-center gap-1 text-[11px] font-semibold',
                                trendUp ? 'text-emerald-600' : 'text-muted-foreground',
                            )}>
                                {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {trendPct >= 0 ? '+' : ''}{trendPct}% {copy.vsAvg}
                            </span>
                        }
                    />
                    {/* Reviews */}
                    <DigestTile
                        label={copy.reviews}
                        value={String(data.newReviews)}
                        isAr={isAr}
                        onClick={data.newReviews > 0 ? () => navigate('/app/seller/reviews') : undefined}
                        footer={
                            data.newReviews > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                                    <Star className="h-3 w-3 fill-amber-500" /> {copy.tapToRead}
                                </span>
                            ) : undefined
                        }
                    />
                    {/* Target */}
                    <DigestTile
                        label={copy.target}
                        isAr={isAr}
                        value={
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold">{targetPct}%</span>
                                <span className="text-xs text-muted-foreground">{copy.targetDone}</span>
                            </div>
                        }
                        footer={
                            <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden mt-1">
                                <motion.div
                                    className="h-full bg-emerald-500/90"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${targetPct}%` }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                        }
                        icon={<Target className="h-4 w-4 text-emerald-600" />}
                    />
                    {/* Waiting */}
                    <DigestTile
                        label={copy.waiting}
                        isAr={isAr}
                        value={String(data.waitingOpportunities)}
                        onClick={data.waitingOpportunities > 0 ? () => navigate('/app/seller/home') : undefined}
                        icon={<Clock3 className="h-4 w-4 text-amber-600" />}
                    />
                </div>

                {/* CTA */}
                <motion.button
                    type="button"
                    onClick={() => { handleDismiss(); navigate('/app/seller/home?action=go_online'); }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                        'mt-5 w-full h-12 rounded-2xl bg-foreground text-background',
                        'flex items-center justify-center gap-2',
                        'text-sm font-semibold',
                        isAr ? 'font-ar-display' : 'font-display',
                    )}
                >
                    {copy.cta}
                    <ArrowRight className={cn('h-4 w-4', isAr && 'rotate-180')} />
                </motion.button>
            </motion.section>
        </AnimatePresence>
    );
}

function DigestTile({
    label,
    value,
    footer,
    onClick,
    icon,
    isAr,
}: {
    label: string;
    value: React.ReactNode;
    footer?: React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    isAr: boolean;
}) {
    const Comp = onClick ? motion.button : motion.div;
    return (
        <Comp
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            className={cn(
                'rounded-2xl bg-background/60 backdrop-blur-sm border border-border/30',
                'p-3 text-start',
                onClick && 'cursor-pointer hover:bg-background/90 transition-colors',
            )}
        >
            <div className="flex items-center gap-1.5 mb-1">
                {icon}
                <p className={cn(
                    'text-[10px] font-medium text-muted-foreground uppercase tracking-wide',
                    isAr ? 'font-ar-body' : 'font-body',
                )}>
                    {label}
                </p>
            </div>
            <div className={cn(
                'text-xl font-bold text-foreground leading-tight',
                isAr ? 'font-ar-display' : 'font-display',
            )}>
                {value}
            </div>
            {footer && <div className="mt-1">{footer}</div>}
        </Comp>
    );
}
