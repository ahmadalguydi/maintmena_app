import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ActivityCard, ActivityCardSkeleton, ActivityType } from './ActivityCard';
import { Heading2 } from './Typography';
import { Plus, Zap, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { haptics } from '@/lib/haptics';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    subtitle?: string;
    category?: string;
    price?: number;
    providerName?: string;
    providerRating?: number;
    quotesCount?: number;
    viewersCount?: number;
    timestamp?: string;
    navigateTo: string;
    priority: number; // Higher = more urgent
}

interface ActivityHubProps {
    items: ActivityItem[];
    isLoading?: boolean;
    currentLanguage: 'en' | 'ar';
    className?: string;
}

const content = {
    en: {
        title: 'Your Activity',
        empty: 'All caught up!',
        emptyDesc: 'You have no pending requests or bookings.',
        postRequest: 'Post Request',
        bookNow: 'Book Now',
        viewAll: 'View All',
    },
    ar: {
        title: 'نشاطك',
        empty: 'لا يوجد نشاط!',
        emptyDesc: 'ليس لديك طلبات أو حجوزات معلقة.',
        postRequest: 'انشر طلب',
        bookNow: 'احجز الآن',
        viewAll: 'عرض الكل',
    },
};

export const ActivityHub = ({
    items,
    isLoading = false,
    currentLanguage,
    className,
}: ActivityHubProps) => {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const t = content[currentLanguage];

    // Sort by priority (higher first) then by timestamp (newer first)
    const sortedItems = [...items].sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return 0;
    });

    const displayItems = sortedItems.slice(0, 3);
    const hasMore = items.length > 3;

    const handleItemPress = (item: ActivityItem) => {
        haptics.light();
        navigate(item.navigateTo);
    };

    // Empty state
    if (!isLoading && items.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('py-8', className)}
            >
                <div className="text-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                        className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                    >
                        <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                    <h3 className={cn(
                        'text-lg font-semibold text-foreground mb-1',
                        isArabic ? 'font-ar-display' : 'font-display'
                    )}>
                        {t.empty}
                    </h3>
                    <p className={cn(
                        'text-sm text-muted-foreground mb-6',
                        isArabic ? 'font-ar-body' : 'font-body'
                    )}>
                        {t.emptyDesc}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                haptics.medium();
                                navigate('/app/buyer/requests/new');
                            }}
                            className={cn(
                                'px-4 py-2.5 rounded-full bg-primary text-primary-foreground',
                                'font-semibold text-sm flex items-center gap-2',
                                isArabic ? 'font-ar-body' : 'font-body'
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            {t.postRequest}
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                haptics.medium();
                                navigate('/app/buyer/explore');
                            }}
                            className={cn(
                                'px-4 py-2.5 rounded-full bg-muted text-foreground',
                                'font-semibold text-sm flex items-center gap-2',
                                isArabic ? 'font-ar-body' : 'font-body'
                            )}
                        >
                            <Zap className="w-4 h-4" />
                            {t.bookNow}
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className={cn('space-y-3', className)}>
                <Heading2 lang={currentLanguage} className="text-lg mb-4">
                    {t.title}
                </Heading2>
                {[1].map((i) => (
                    <ActivityCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Heading2 lang={currentLanguage} className="text-lg">
                        {t.title}
                    </Heading2>
                    {items.length > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center"
                        >
                            {items.length}
                        </motion.span>
                    )}
                </div>

                {hasMore && (
                    <button
                        onClick={() => navigate('/app/buyer/requests')}
                        className={cn(
                            "text-sm text-primary font-medium flex items-center gap-1",
                            isArabic ? 'font-ar-body' : 'font-body'
                        )}
                    >
                        {t.viewAll}
                        <ArrowRight className={cn("w-4 h-4", isArabic && "rotate-180")} />
                    </button>
                )}
            </div>

            {/* Activity List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {displayItems.map((item, index) => (
                        <ActivityCard
                            key={item.id}
                            id={item.id}
                            type={item.type}
                            title={item.title}
                            subtitle={item.subtitle}
                            category={item.category}
                            price={item.price}
                            providerName={item.providerName}
                            providerRating={item.providerRating}
                            quotesCount={item.quotesCount}
                            viewersCount={item.viewersCount}
                            timestamp={item.timestamp}
                            currentLanguage={currentLanguage}
                            onPress={() => handleItemPress(item)}
                            index={index}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

// Utility function to determine activity type from raw data
export const getActivityType = (item: {
    type: 'request' | 'booking' | 'contract' | 'job';
    status?: string;
    quotesCount?: number;
    hasNewQuotes?: boolean;
    sellerOnWay?: boolean;
    workStarted?: boolean;
    sellerComplete?: boolean;
    awaitingSignature?: boolean;
}): ActivityType => {
    // Contracts awaiting signature
    if (item.awaitingSignature) {
        return 'awaiting_signature';
    }

    // Jobs in progress
    if (item.type === 'job') {
        if (item.sellerComplete) return 'seller_complete';
        if (item.workStarted) return 'live_in_progress';
        if (item.sellerOnWay) return 'live_on_way';
    }

    // Requests with new quotes
    if (item.type === 'request' && item.hasNewQuotes) {
        return 'new_quote';
    }

    // Open requests waiting for quotes
    if (item.type === 'request' && item.status === 'open') {
        return 'open_request';
    }

    // Pending bookings
    if (item.type === 'booking' && item.status === 'pending') {
        return 'pending_booking';
    }

    // Default fallback
    return 'open_request';
};

// Utility function to calculate priority
export const getActivityPriority = (type: ActivityType): number => {
    const priorities: Record<ActivityType, number> = {
        booking_action_required: 100, // Top priority: Booking accepted, needs buyer action
        seller_complete: 95,       // High priority: Job done, needs confirmation
        new_quote: 90,             // High priority: New quotes to review
        awaiting_signature: 85,    // Medium-High: Signed by buyer, waiting for seller
        live_on_way: 80,           // Tracking
        live_in_progress: 75,      // Monitoring
        pending_booking: 50,       // Waiting
        open_request: 30,          // Passive
    };
    return priorities[type] || 0;
};
