import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpportunityCard } from './OpportunityCard';
import { Opportunity, useOpportunities } from '@/hooks/useOpportunities';

interface OpportunityFeedProps {
    currentLanguage: 'en' | 'ar';
    onAcceptOpportunity: (id: string) => void;
    onJoinWaitlist?: (id: string) => void;
}

// Define extended interface locally since it's dynamic
interface ExtendedOpportunity extends Opportunity {
    hasProvider?: boolean;
}

export function OpportunityFeed({
    currentLanguage,
    onAcceptOpportunity,
    onJoinWaitlist
}: OpportunityFeedProps) {
    const { opportunities, isLoading, declineOpportunity } = useOpportunities();


    const content = {
        ar: {
            opportunitiesNow: 'الفرص المتاحة الآن',
            loading: 'جاري التحميل...',
            noOpportunities: 'لا توجد فرص حالياً',
        },
        en: {
            opportunitiesNow: 'Opportunities Now',
            loading: 'Loading...',
            noOpportunities: 'No opportunities right now',
        },
    };

    const t = content[currentLanguage];

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2].map((i) => (
                    <div key={i} className="rounded-3xl bg-card p-5 animate-pulse border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="h-20 rounded-2xl bg-muted/50 mb-4" />
                        <div className="flex gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-muted/50" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted/50 rounded w-3/4" />
                                <div className="h-3 bg-muted/50 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with animated ping dot */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                    {/* Animated ping dot using framer-motion for reliability */}
                    <div className="relative flex items-center justify-center h-4 w-4">
                        <motion.div
                            animate={{
                                scale: [1, 2.5],
                                opacity: [0.6, 0],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeOut",
                            }}
                            className="absolute h-full w-full rounded-full bg-orange-500"
                        />
                        <div className="relative h-2.5 w-2.5 rounded-full bg-orange-600 border border-white/20 shadow-sm" />
                    </div>
                    <h2 className={cn(
                        "text-sm font-bold text-foreground",
                        currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                    )}>
                        {t.opportunitiesNow}
                    </h2>
                </div>
                {opportunities.length > 0 && (
                    <span className="text-[10px] h-5 px-2.5 bg-orange-100 text-orange-700 font-bold rounded-full flex items-center">
                        {opportunities.length}
                    </span>
                )}
            </div>

            {/* Opportunity List */}
            <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                    {opportunities.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-8 rounded-3xl bg-card border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                        >
                            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-muted/50 mb-4">
                                <Zap className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <p className={cn(
                                "text-sm text-muted-foreground",
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                            )}>
                                {t.noOpportunities}
                            </p>
                        </motion.div>
                    ) : (
                        opportunities.map((opportunity) => (
                            <OpportunityCard
                                key={opportunity.id}
                                currentLanguage={currentLanguage}
                                id={opportunity.id}
                                type={opportunity.type}
                                category={opportunity.category}
                                subCategory={opportunity.subCategory}
                                categoryIcon={opportunity.categoryIcon}
                                title={opportunity.title}
                                description={opportunity.description}
                                photos={opportunity.photos}
                                location={opportunity.location}
                                locationDistrict={opportunity.locationDistrict}
                                distance={opportunity.distance}
                                lat={opportunity.lat}
                                lng={opportunity.lng}
                                urgency={opportunity.urgency}
                                timing={opportunity.timing}
                                priceRange={opportunity.priceRange}
                                priceExact={opportunity.priceExact}
                                buyerTags={opportunity.buyerTags}
                                expiresAt={opportunity.expiresAt}
                                waitlistPosition={opportunity.waitlistPosition}
                                onAccept={!(opportunity as ExtendedOpportunity).hasProvider ? onAcceptOpportunity : undefined}
                                onDecline={declineOpportunity}
                                onJoinWaitlist={(opportunity as ExtendedOpportunity).hasProvider ? onJoinWaitlist : undefined}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
