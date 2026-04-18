import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { UpcomingJobBanner } from './UpcomingJobBanner';
import { WaitlistedJobsBanner } from './WaitlistedJobsBanner';
import { OpportunityFeed } from './OpportunityFeed';
import { WhatToDoNow } from './WhatToDoNow';
import { useNavigate } from 'react-router-dom';
import { Calendar, Briefcase } from 'lucide-react';
import { useOpportunities } from '@/hooks/useOpportunities';

interface ScheduledJob {
    id: string;
    type: 'request' | 'booking';
    service_type?: string;
    description?: string;
    scheduled_start_at: string;
    buyer_name?: string;
    buyer_phone?: string;
    location?: string;
    lat?: number;
    lng?: number;
    sellerPricing?: unknown;
    commitment_type: 'soft' | 'hard';
}

interface SellerHomeScheduledProps {
    currentLanguage: 'en' | 'ar';
    timeOnline: number;
    todayEarnings: number;
    scheduledJobs: ScheduledJob[];
    onGoOffline: () => void;
    onAcceptOpportunity: (id: string) => void;
    onJoinWaitlist?: (id: string) => void;
    onEditPrice?: (jobId: string, pricing: any) => void;
    onEnterFocusMode?: (jobId: string) => void;
}

export function SellerHomeScheduled({
    currentLanguage,
    timeOnline,
    todayEarnings,
    scheduledJobs,
    onGoOffline,
    onAcceptOpportunity,
    onJoinWaitlist,
    onEditPrice,
    onEnterFocusMode,
}: SellerHomeScheduledProps) {
    const navigate = useNavigate();
    const { waitlistedOpportunities } = useOpportunities();
    const isRTL = currentLanguage === 'ar';

    const content = {
        ar: {
            upcomingJobs: 'المهام القادمة',
            moreScheduled: 'عرض كل المهام',
            noJobs: 'لا توجد مهام مجدولة حالياً',
        },
        en: {
            upcomingJobs: 'Upcoming Jobs',
            moreScheduled: 'View all jobs',
            noJobs: 'No scheduled jobs right now',
        },
    };

    const t = content[currentLanguage];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="animate-fade-in space-y-5"
        >
            {/* Waitlisted Jobs */}
            {waitlistedOpportunities.length > 0 && (
                <WaitlistedJobsBanner
                    currentLanguage={currentLanguage}
                    opportunities={waitlistedOpportunities}
                    onViewAll={() => navigate('/app/seller/jobs?status=waitlisted')}
                />
            )}

            {/* Scheduled Jobs Section */}
            {scheduledJobs.length > 0 && (
                <div className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center relative">
                                <Briefcase className="h-4 w-4 text-primary" />
                                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                    {scheduledJobs.length}
                                </span>
                            </div>
                            <h2 className={cn(
                                "text-sm font-bold text-foreground",
                                isRTL ? 'font-ar-display' : 'font-display'
                            )}>
                                {t.upcomingJobs}
                            </h2>
                        </div>
                        {scheduledJobs.length > 2 && (
                            <button
                                onClick={() => navigate('/app/seller/active-jobs')}
                                className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors"
                            >
                                {t.moreScheduled}
                            </button>
                        )}
                    </div>

                    {/* All Scheduled Job Cards */}
                    <AnimatePresence>
                        <div className="space-y-3">
                            {scheduledJobs.map((job, index) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                >
                                    <UpcomingJobBanner
                                        currentLanguage={currentLanguage}
                                        id={job.id}
                                        serviceType={job.service_type}
                                        description={job.description}
                                        scheduledAt={job.scheduled_start_at}
                                        location={job.location}
                                        lat={job.lat}
                                        lng={job.lng}
                                        sellerPricing={job.sellerPricing}
                                        buyerName={job.buyer_name}
                                        buyerPhone={job.buyer_phone}
                                        commitmentType={job.commitment_type}
                                        onEnterFocusMode={() => onEnterFocusMode?.(job.id)}
                                        onMessage={() => navigate(`/app/messages/thread?request=${job.id}`)}
                                        onReschedule={() => navigate(`/app/seller/job/${job.id}/reschedule`)}
                                        onCancel={() => navigate(`/app/seller/job/${job.id}/cancel`)}
                                        onEditPrice={onEditPrice}
                                        onCall={() => {
                                            if (job.buyer_phone) {
                                                window.open(`tel:${job.buyer_phone}`);
                                            }
                                        }}
                                        onClick={() => navigate(`/app/seller/job/${job.id}`)}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>
                </div>
            )}

            {/* Opportunity Feed */}
            <OpportunityFeed
                currentLanguage={currentLanguage}
                onAcceptOpportunity={onAcceptOpportunity}
                onJoinWaitlist={onJoinWaitlist}
            />

            {/* What to Do Now */}
            <WhatToDoNow
                currentLanguage={currentLanguage}
                onEnableCategory={(cat) => navigate('/app/seller/profile/manage-services')}
            />
        </motion.div>
    );
}
