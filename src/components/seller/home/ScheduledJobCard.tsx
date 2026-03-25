import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Clock, ChevronDown, ChevronUp, User, AlertTriangle,
    Zap, Calendar, Timer, Phone, MessageCircle, Navigation2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScheduledJob } from '@/hooks/useScheduledJobs';
import { getAllCategories } from '@/lib/serviceCategories';
import { MAPBOX_TOKEN } from '@/lib/mapbox';

interface ScheduledJobCardProps {
    job: ScheduledJob;
    currentLanguage: 'en' | 'ar';
    onEnterFocusMode: (jobId: string) => void;
    onContactBuyer?: (jobId: string) => void;
}

export function ScheduledJobCard({ job, currentLanguage, onEnterFocusMode, onContactBuyer }: ScheduledJobCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [now, setNow] = useState(new Date());
    const isRTL = currentLanguage === 'ar';

    // Update every 30s for time-aware features
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, []);

    const content = {
        ar: {
            startingSoon: 'يبدأ قريباً',
            startingIn: 'يبدأ خلال',
            minutes: 'دقيقة',
            hours: 'ساعة',
            focusMode: 'وضع التركيز',
            exitFocus: 'خروج من التركيز',
            forcedFocus: 'وضع التركيز إجباري',
            viewDetails: 'عرض التفاصيل',
            hideDetails: 'إخفاء التفاصيل',
            accepted: 'تم القبول',
            buyer: 'العميل',
            contact: 'تواصل',
            startJob: 'ابدأ المهمة',
            noDate: 'بأقرب وقت',
        },
        en: {
            startingSoon: 'Starting Soon',
            startingIn: 'Starting in',
            minutes: 'min',
            hours: 'hr',
            focusMode: 'Focus Mode',
            exitFocus: 'Exit Focus',
            forcedFocus: 'Focus Mode Required',
            viewDetails: 'View details',
            hideDetails: 'Hide details',
            accepted: 'Accepted',
            buyer: 'Client',
            contact: 'Contact',
            startJob: 'Start Job',
            noDate: 'ASAP',
        },
    };
    const t = content[currentLanguage];

    // Time calculations
    const scheduledDate = job.preferred_start_date ? new Date(job.preferred_start_date) : null;
    const diffMs = scheduledDate ? scheduledDate.getTime() - now.getTime() : null;
    const diffMinutes = diffMs ? Math.max(0, Math.floor(diffMs / 60000)) : null;
    const diffHours = diffMinutes !== null ? diffMinutes / 60 : null;

    const isWithin2Hours = diffHours !== null && diffHours <= 2 && diffHours > 0;
    const isWithin30Min = diffMinutes !== null && diffMinutes <= 30;
    const isForcedFocusMode = isWithin30Min;
    const showStartingSoonAlert = isWithin2Hours;

    // Format time remaining
    const timeRemainingText = useMemo(() => {
        if (diffMinutes === null) return t.noDate;
        if (diffMinutes <= 0) return t.startingSoon;
        if (diffMinutes < 60) return `${diffMinutes} ${t.minutes}`;
        const hrs = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        return mins > 0 ? `${hrs} ${t.hours} ${mins} ${t.minutes}` : `${hrs} ${t.hours}`;
    }, [diffMinutes, t]);

    // Format scheduled date for display
    const scheduledLabel = useMemo(() => {
        if (!scheduledDate) return t.noDate;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = scheduledDate.toDateString() === today.toDateString();
        const isTomorrow = scheduledDate.toDateString() === tomorrow.toDateString();

        const timeStr = scheduledDate.toLocaleTimeString(isRTL ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `${isRTL ? 'اليوم' : 'Today'}, ${timeStr}`;
        if (isTomorrow) return `${isRTL ? 'غداً' : 'Tomorrow'}, ${timeStr}`;
        return scheduledDate.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${timeStr}`;
    }, [scheduledDate, isRTL, t]);

    // Category info
    const categoryInfo = getAllCategories().find(c => c.key === job.category);
    const categoryLabel = isRTL ? (categoryInfo?.ar || job.category) : (categoryInfo?.en || job.category);
    const categoryIcon = categoryInfo?.icon || '🛠️';

    // Map URL
    const mapLat = job.lat || 24.7136;
    const mapLng = job.lng || 46.6753;
    const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${mapLng},${mapLat},14,0/600x200@2x?access_token=${MAPBOX_TOKEN}`;

    // Border color based on urgency
    const borderClass = isForcedFocusMode
        ? 'border-red-400/60 ring-2 ring-red-400/20'
        : showStartingSoonAlert
            ? 'border-amber-400/60 ring-1 ring-amber-400/15'
            : 'border-border/50';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "rounded-2xl bg-card overflow-hidden border shadow-sm transition-all",
                borderClass
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Collapsed header — always visible */}
            <div
                className="p-4 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {/* Category icon */}
                    <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm",
                        isForcedFocusMode ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10"
                    )}>
                        {categoryIcon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className={cn(
                                "font-bold text-[15px] text-foreground truncate",
                                isRTL ? 'font-ar-display' : 'font-display'
                            )}>
                                {categoryLabel}
                            </h3>
                            {/* Accepted badge */}
                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-100/80 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                {t.accepted}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className={cn("text-xs text-muted-foreground truncate", isRTL ? 'font-ar-body' : '')}>
                                {scheduledLabel}
                            </span>
                        </div>
                    </div>

                    {/* Time remaining badge + expand arrow */}
                    <div className="flex items-center gap-2 shrink-0">
                        {showStartingSoonAlert && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className={cn(
                                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                                    isForcedFocusMode
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                )}
                            >
                                <Timer className="w-3 h-3" />
                                {timeRemainingText}
                            </motion.div>
                        )}
                        <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                    </div>
                </div>

                {/* Starting soon alert bar */}
                <AnimatePresence>
                    {showStartingSoonAlert && !isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className={cn(
                                "mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl",
                                isForcedFocusMode
                                    ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            )}>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span className={isRTL ? 'font-ar-body' : ''}>
                                    {isForcedFocusMode
                                        ? (isRTL ? 'أقل من 30 دقيقة — وضع التركيز إجباري' : 'Less than 30 min — Focus mode required')
                                        : (isRTL ? `يبدأ خلال ${timeRemainingText}` : `${t.startingIn} ${timeRemainingText}`)
                                    }
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4">
                            {/* Separator */}
                            <div className="h-px bg-border/50" />

                            {/* Map */}
                            {(job.lat || job.lng) && (
                                <div className="rounded-xl overflow-hidden h-32 bg-muted relative">
                                    <img src={staticMapUrl} alt="Location" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-5 h-5 rounded-full bg-primary shadow-lg border-2 border-white" />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card/80 to-transparent" />
                                </div>
                            )}

                            {/* Location */}
                            {job.location && (
                                <div className="flex items-start gap-2.5 text-sm">
                                    <MapPin className="w-4 h-4 text-primary/70 mt-0.5 shrink-0" />
                                    <span className={cn("text-foreground/90 font-medium", isRTL ? 'font-ar-body' : '')}>
                                        {job.location}
                                    </span>
                                </div>
                            )}

                            {/* Description */}
                            {job.description && (
                                <p className={cn(
                                    "text-sm text-muted-foreground leading-relaxed",
                                    isRTL ? 'font-ar-body' : ''
                                )}>
                                    {job.description.substring(0, 150)}
                                    {job.description.length > 150 && '...'}
                                </p>
                            )}

                            {/* Buyer info */}
                            {job.buyer_name && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                                        {job.buyer_avatar ? (
                                            <img src={job.buyer_avatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-muted-foreground">{t.buyer}</span>
                                        <p className={cn("text-sm font-semibold text-foreground truncate", isRTL ? 'font-ar-body' : '')}>
                                            {job.buyer_name}
                                        </p>
                                    </div>
                                    {onContactBuyer && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 rounded-full text-xs font-bold gap-1.5"
                                            onClick={(e) => { e.stopPropagation(); onContactBuyer(job.id); }}
                                        >
                                            <MessageCircle className="w-3 h-3" />
                                            {t.contact}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* Starting soon alert (expanded version) */}
                            {showStartingSoonAlert && (
                                <div className={cn(
                                    "flex items-center gap-2.5 text-sm font-semibold px-4 py-3 rounded-xl",
                                    isForcedFocusMode
                                        ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200/50 dark:border-red-800/40"
                                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40"
                                )}>
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <div>
                                        <p className={isRTL ? 'font-ar-body' : ''}>
                                            {isForcedFocusMode
                                                ? t.forcedFocus
                                                : `${t.startingIn} ${timeRemainingText}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Focus Mode / Start Job button */}
                            <Button
                                className={cn(
                                    "w-full h-12 rounded-xl font-bold text-sm gap-2 shadow-md",
                                    isForcedFocusMode
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : showStartingSoonAlert
                                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEnterFocusMode(job.id);
                                }}
                            >
                                <Zap className="w-4 h-4" />
                                <span className={isRTL ? 'font-ar-heading' : ''}>
                                    {isForcedFocusMode
                                        ? t.forcedFocus
                                        : showStartingSoonAlert
                                            ? t.focusMode
                                            : t.startJob
                                    }
                                </span>
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
