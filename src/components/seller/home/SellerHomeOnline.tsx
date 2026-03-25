import { motion } from 'framer-motion';
// Component for Online state
import { cn } from '@/lib/utils';
import { OnlineStatusBar } from './OnlineStatusBar';
import { OpportunityFeed } from './OpportunityFeed';
import { QuietMarketState } from './QuietMarketState';
import { WhatToDoNow } from './WhatToDoNow';
import { UpcomingJobBanner } from './UpcomingJobBanner';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useScheduledJobs } from '@/hooks/useScheduledJobs';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SellerHomeOnlineProps {
    currentLanguage: 'en' | 'ar';
    timeOnline: number;
    todayEarnings: number;
    serviceRadius?: number;
    onGoOffline: () => void;
    onAcceptOpportunity: (id: string) => void;
    onJoinWaitlist?: (id: string) => void;
    onExpandRadius?: () => void;
    onEditPrice?: (jobId: string, pricing: any) => void;
}

export function SellerHomeOnline({
    currentLanguage,
    timeOnline,
    todayEarnings,
    serviceRadius = 5,
    onGoOffline,
    onAcceptOpportunity,
    onJoinWaitlist,
    onExpandRadius,
    onEditPrice,
}: SellerHomeOnlineProps) {
    const navigate = useNavigate();
    const { opportunities, isLoading } = useOpportunities();
    const { jobs: scheduledJobs } = useScheduledJobs();

    // Determine if we're in quiet market state (no opportunities available)
    const isQuietMarket = !isLoading && opportunities.length === 0;

    const t = {
        ar: {
            scheduledJobs: 'المهام المقبولة',
            viewAll: 'عرض الكل',
        },
        en: {
            scheduledJobs: 'Accepted Jobs',
            viewAll: 'View all',
        },
    }[currentLanguage];

    const handleEnterFocusMode = (jobId: string) => {
        // Navigate to active job / mission mode
        navigate(`/app/seller/job/${jobId}?type=request`);
    };

    const handleContactBuyer = (jobId: string) => {
        navigate(`/app/seller/messages/${jobId}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="animate-fade-in space-y-5"
        >

            {/* === Scheduled/Accepted Jobs Section === */}
            {scheduledJobs.length > 0 && (
                <div className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-xl bg-green-500/10 flex items-center justify-center relative">
                                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white">
                                    {scheduledJobs.length}
                                </span>
                            </div>
                            <h2 className={cn(
                                "text-sm font-bold text-foreground",
                                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                            )}>
                                {t.scheduledJobs}
                            </h2>
                        </div>
                    </div>

                    {/* Scheduled Job Cards — using revamped UpcomingJobBanner */}
                    <div className="space-y-3">
                        {scheduledJobs.map((job) => (
                            <UpcomingJobBanner
                                key={job.id}
                                currentLanguage={currentLanguage}
                                id={job.id}
                                serviceType={job.category}
                                description={job.description}
                                scheduledAt={job.preferred_start_date || job.created_at}
                                location={job.location}
                                lat={job.lat}
                                lng={job.lng}
                                buyerName={job.buyer_name}
                                commitmentType="hard"
                                onEnterFocusMode={() => handleEnterFocusMode(job.id)}
                                onMessage={() => handleContactBuyer(job.id)}
                                onClick={() => navigate(`/app/seller/job/${job.id}?type=request`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Show quiet market or opportunities based on state */}
            {isQuietMarket ? (
                <>
                    <QuietMarketState
                        currentLanguage={currentLanguage}
                        onExpandRadius={onExpandRadius}
                        onEnableUrgent={() => navigate('/app/seller/profile/manage-services')}
                        onAddService={() => navigate('/app/seller/profile/manage-services')}
                    />

                    {/* What to Do Now - also show in quiet market */}
                    <WhatToDoNow
                        currentLanguage={currentLanguage}
                        onEnableCategory={(cat) => navigate('/app/seller/profile/manage-services')}
                    />
                </>
            ) : (
                <>
                    <OpportunityFeed
                        currentLanguage={currentLanguage}
                        onAcceptOpportunity={onAcceptOpportunity}
                        onJoinWaitlist={onJoinWaitlist}
                    />

                    {/* What to Do Now - show after opportunities */}
                    <WhatToDoNow
                        currentLanguage={currentLanguage}
                        onEnableCategory={(cat) => navigate('/app/seller/profile/manage-services')}
                    />
                </>
            )}
        </motion.div>
    );
}

