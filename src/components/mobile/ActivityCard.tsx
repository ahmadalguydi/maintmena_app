import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Bell,
    PenTool,
    Truck,
    Clock,
    Calendar,
    MessageCircle,
    Play,
    CheckCircle,
    ArrowRight,
    ArrowLeft,
    Star,
    MapPin,
    Loader2,
    CreditCard
} from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { getCategoryIcon } from '@/lib/serviceCategories';

export type ActivityType =
    | 'new_quote'           // Provider found / assigned
    | 'live_on_way'         // Seller is on the way
    | 'live_in_progress'    // Work is in progress
    | 'awaiting_signature'  // Contract needs signature
    | 'pending_booking'     // Booking awaiting seller confirmation
    | 'open_request'        // Request looking for providers
    | 'seller_complete'     // Seller marked complete, awaiting buyer confirmation
    | 'booking_action_required'; // Booking accepted by seller, waiting for buyer action

interface ActivityCardProps {
    id: string;
    type: ActivityType;
    title: string;
    subtitle?: string;
    category?: string;
    price?: number;
    providerName?: string;
    providerRating?: number;
    quotesCount?: number;
    maxQuotes?: number;
    viewersCount?: number;
    timestamp?: string;
    currentLanguage: 'en' | 'ar';
    onPress: () => void;
    index?: number;
}

const typeConfig = {
    new_quote: {
        icon: Bell,
        color: 'amber',
        bgGradient: 'from-amber-50 to-orange-50',
        borderColor: 'border-amber-200',
        iconBg: 'bg-amber-500',
        badgeColor: 'bg-amber-100 text-amber-700',
        pulse: true,
        en: 'Provider Found',
        ar: 'تم إيجاد مزود',
    },
    live_on_way: {
        icon: Truck,
        color: 'blue',
        bgGradient: 'from-blue-50 to-cyan-50',
        borderColor: 'border-blue-200',
        iconBg: 'bg-blue-500',
        badgeColor: 'bg-blue-100 text-blue-700',
        pulse: true,
        en: 'On The Way',
        ar: 'في الطريق',
    },
    live_in_progress: {
        icon: Play,
        color: 'green',
        bgGradient: 'from-green-50 to-emerald-50',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-500',
        badgeColor: 'bg-green-100 text-green-700',
        pulse: true,
        en: 'In Progress',
        ar: 'قيد التنفيذ',
    },
    awaiting_signature: {
        icon: PenTool,
        color: 'orange',
        bgGradient: 'from-orange-50 to-amber-50',
        borderColor: 'border-orange-200',
        iconBg: 'bg-orange-500',
        badgeColor: 'bg-orange-100 text-orange-700',
        pulse: true,
        en: 'Awaiting Signature',
        ar: 'في انتظار التوقيع',
    },
    pending_booking: {
        icon: Calendar,
        color: 'gray',
        bgGradient: 'from-gray-50 to-slate-50',
        borderColor: 'border-gray-200',
        iconBg: 'bg-gray-500',
        badgeColor: 'bg-gray-100 text-gray-700',
        pulse: false,
        en: 'Pending Confirmation',
        ar: 'في انتظار التأكيد',
    },
    open_request: {
        icon: Loader2,
        color: 'blue',
        bgGradient: 'from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        iconBg: 'bg-blue-500',
        badgeColor: 'bg-blue-100 text-blue-700',
        pulse: true,
        en: 'Looking for Providers',
        ar: 'جاري البحث عن مزود',
    },
    seller_complete: {
        icon: CheckCircle,
        color: 'emerald',
        bgGradient: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-200',
        iconBg: 'bg-emerald-500',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        pulse: true,
        en: 'Confirm Completion',
        ar: 'تأكيد الإكتمال',
    },
    booking_action_required: {
        icon: CreditCard,
        color: 'emerald',
        bgGradient: 'from-emerald-50 to-green-50',
        borderColor: 'border-emerald-200',
        iconBg: 'bg-emerald-500',
        badgeColor: 'bg-emerald-100 text-emerald-700',
        pulse: true,
        en: 'Action Required',
        ar: 'إجراء مطلوب',
    },
};

export const ActivityCard = forwardRef<HTMLDivElement, ActivityCardProps>(({
    id,
    type,
    title,
    subtitle,
    category,
    price,
    providerName,
    providerRating,
    quotesCount = 0,
    maxQuotes = 5,
    viewersCount = 0,
    timestamp,
    currentLanguage,
    onPress,
    index = 0,
}, ref) => {
    const config = typeConfig[type];
    const Icon = config.icon;
    const isArabic = currentLanguage === 'ar';

    const formatRelativeTime = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), {
                addSuffix: false,
                locale: isArabic ? ar : enUS,
            });
        } catch {
            return '';
        }
    };

    const handlePress = () => {
        haptics.light();
        onPress();
    };

    const actionText = {
        new_quote: { en: 'Review', ar: 'مراجعة' },
        live_on_way: { en: 'Track', ar: 'تتبع' },
        live_in_progress: { en: 'View', ar: 'عرض' },
        awaiting_signature: { en: 'View Contract', ar: 'عرض العقد' },
        pending_booking: { en: 'View', ar: 'عرض' },
        open_request: { en: 'View', ar: 'عرض' },
        seller_complete: { en: 'Confirm', ar: 'تأكيد' },
        booking_action_required: { en: 'Complete Booking', ar: 'إكمال الحجز' },
    };

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: 300,
                damping: 25
            }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePress}
            className={cn(
                'relative rounded-2xl p-4 cursor-pointer overflow-hidden',
                'bg-gradient-to-br border shadow-sm',
                'transition-shadow hover:shadow-md',
                config.bgGradient,
                config.borderColor
            )}
        >
            {/* Pulse animation for priority items */}
            {config.pulse && (
                <motion.div
                    className={cn(
                        'absolute inset-0 rounded-2xl',
                        `bg-${config.color}-500/5`
                    )}
                    animate={{
                        opacity: [0.3, 0.1, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            <div className="relative flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    config.iconBg
                )}>
                    <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Type Badge + Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide',
                            config.badgeColor,
                            isArabic ? 'font-ar-body' : 'font-body'
                        )}>
                            {isArabic ? config.ar : config.en}
                        </span>
                        {timestamp && (
                            <span className={cn(
                                'text-[10px] text-muted-foreground',
                                isArabic ? 'font-ar-body' : 'font-body'
                            )}>
                                {formatRelativeTime(timestamp)}
                            </span>
                        )}
                    </div>

                    {/* Title with category icon */}
                    <div className="flex items-center gap-2 mb-1">
                        {category && (
                            <span className="text-base">{getCategoryIcon(category)}</span>
                        )}
                        <h4 className={cn(
                            'font-semibold text-foreground text-sm truncate',
                            isArabic ? 'font-ar-body' : 'font-body'
                        )}>
                            {title}
                        </h4>
                    </div>

                    {/* Subtitle / Details */}
                    <div className="space-y-1">
                        {/* Provider info */}
                        {providerName && (
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'text-xs text-muted-foreground',
                                    isArabic ? 'font-ar-body' : 'font-body'
                                )}>
                                    {providerName}
                                </span>
                                {providerRating && (
                                    <span className="flex items-center gap-0.5 text-xs">
                                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                        <span className="text-yellow-700">{providerRating.toFixed(1)}</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Price */}
                        {price && (
                            <p className="text-sm font-bold text-foreground">
                                {price.toLocaleString()} <span className="text-xs font-normal">{isArabic ? 'ر.س' : 'SAR'}</span>
                            </p>
                        )}

                        {/* Open request: searching indicator */}
                        {type === 'open_request' && (
                            <div className="flex items-center gap-1.5">
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className={cn(
                                    'text-[10px] text-blue-600',
                                    isArabic ? 'font-ar-body' : 'font-body'
                                )}>
                                    {isArabic ? 'جاري البحث...' : 'Searching...'}
                                </span>
                            </div>
                        )}

                        {/* Viewers indicator */}
                        {viewersCount > 0 && type === 'open_request' && (
                            <div className="flex items-center gap-1.5">
                                <motion.div
                                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                                    animate={{ scale: [1, 1.3, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <span className={cn(
                                    'text-[10px] text-green-600',
                                    isArabic ? 'font-ar-body' : 'font-body'
                                )}>
                                    {viewersCount} {isArabic ? 'يشاهدون الآن' : 'viewing now'}
                                </span>
                            </div>
                        )}

                        {/* Custom subtitle */}
                        {subtitle && !providerName && (
                            <p className={cn(
                                'text-xs text-muted-foreground',
                                isArabic ? 'font-ar-body' : 'font-body'
                            )}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Arrow */}
                <div className="flex items-center self-center">
                    <motion.div
                        className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            config.iconBg + '/10'
                        )}
                        whileHover={{ scale: 1.1 }}
                    >
                        <ArrowLeft
                            className={cn(
                                'w-4 h-4',
                                `text-${config.color}-600`,
                                !isArabic && 'rotate-180'
                            )}
                        />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
});

ActivityCard.displayName = 'ActivityCard';

// Loading skeleton
export const ActivityCardSkeleton = () => (
    <div className="rounded-2xl p-4 bg-muted/30 border border-border/30 animate-pulse">
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="h-4 w-20 rounded bg-muted" />
                    <div className="h-3 w-12 rounded bg-muted" />
                </div>
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
        </div>
    </div>
);
