import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OnlineStatusBar } from '@/components/seller/home/OnlineStatusBar';

// Core state hook
import { useSellerHomeState } from '@/hooks/useSellerHomeState';
import { useDispatchActions } from '@/hooks/useDispatchActions';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useSellerEarnings } from '@/hooks/useSellerEarnings';

// Shared components
import { SellerHomeHeader } from '@/components/seller/home/SellerHomeHeader';

// State A: Offline
import { SellerHomeOffline } from '@/components/seller/home/SellerHomeOffline';

// State B: Online
import { SellerHomeOnline } from '../../../components/seller/home/SellerHomeOnline';

// State C: Mission Mode
import { SellerHomeMissionMode } from '@/components/seller/home/SellerHomeMissionMode';

// State D: Scheduled
import { SellerHomeScheduled } from '@/components/seller/home/SellerHomeScheduled';

// Accept/Decline modals (existing)
import { AcceptJobSheet } from '@/components/mobile/AcceptJobSheet';
import { DeclineReasonModal, DeclineReason } from '@/components/mobile/DeclineReasonModal';
import { ReachOutPromptModal } from '@/components/mobile/ReachOutPromptModal';
import { getRequestLocationLabel, toCanonicalRequest } from '@/lib/maintenanceRequest';

interface SellerHomeProps {
    currentLanguage: 'en' | 'ar';
}

export const SellerHome = ({ currentLanguage: propLanguage }: SellerHomeProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const currentLanguage = propLanguage || ((typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null) as 'en' | 'ar') || 'ar';

    // Core state
    const queryClient = useQueryClient();
    const {
        state,
        isOnline,
        setIsOnline,
        activeJob,
        scheduledJobs,
        timeOnline,
        isLoading,
        profileCompleteness,
    } = useSellerHomeState();

    // Local UI state
    const [serviceRadius, setServiceRadius] = useState(5);
    const [isConnecting, setIsConnecting] = useState(false);
    const [showAcceptSheet, setShowAcceptSheet] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showReachOutPrompt, setShowReachOutPrompt] = useState(false);

    const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

    // Real earnings from Supabase
    const { earnings } = useSellerEarnings();
    const todayEarnings = earnings.thisMonth;

    // Dispatch actions
    const { acceptOffer, declineOffer } = useDispatchActions();
    const { opportunities, refetch: refetchOpportunities } = useOpportunities();

    const primeAcceptedJobState = async (
        jobId: string,
        _fallbackOpportunity?: (typeof opportunities)[number],
    ) => {
        if (!user?.id) return;

        const { data: jobData } = await (supabase as any)
            .from('maintenance_requests')
            .select('id, status, description, preferred_start_date, category, location, city, latitude, longitude, budget, buyer_id, seller_marked_complete, buyer_marked_complete, buyer_price_approved, job_completion_code')
            .eq('id', jobId)
            .maybeSingle();

        if (!jobData) return;

        const canonicalJob = toCanonicalRequest(jobData);
        if (!canonicalJob) return;

        let buyerProfile: { full_name?: string | null; phone?: string | null } | null = null;
        if (jobData.buyer_id) {
            const { data: buyerData } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', jobData.buyer_id)
                .maybeSingle();
            buyerProfile = buyerData as any;
        }

        if (
            canonicalJob.lifecycle === 'seller_assigned' ||
            canonicalJob.lifecycle === 'in_route' ||
            canonicalJob.lifecycle === 'in_progress' ||
            canonicalJob.lifecycle === 'seller_marked_complete'
        ) {
            queryClient.setQueryData(['seller-active-job', user.id], {
                id: jobData.id,
                type: 'request',
                status: jobData.status,
                lifecycle: canonicalJob.lifecycle,
                progress_signal: canonicalJob.progressSignal,
                scheduled_start_at: canonicalJob.scheduledFor,
                service_type: jobData.category,
                description: jobData.description,
                buyer_name: buyerProfile?.full_name,
                buyer_phone: buyerProfile?.phone,
                location: getRequestLocationLabel(jobData, currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending'),
                location_lat: jobData.latitude,
                location_lng: jobData.longitude,
                seller_marked_complete: jobData.seller_marked_complete,
                buyer_marked_complete: jobData.buyer_marked_complete,
                buyer_price_approved: jobData.buyer_price_approved,
                job_completion_code: jobData.job_completion_code,
                budget: jobData.budget || 0,
            });
            queryClient.setQueryData(['seller-scheduled-jobs', user.id], (old: any[] = []) =>
                old.filter((job: any) => job.id !== jobId),
            );
            return;
        }

        queryClient.setQueryData(['seller-active-job', user.id], null);
        queryClient.setQueryData(['seller-scheduled-jobs', user.id], (old: any[] = []) => [
            ...old.filter((job: any) => job.id !== jobId),
            {
                id: jobData.id,
                type: 'request',
                service_type: jobData.category,
                description: jobData.description,
                scheduled_start_at: canonicalJob.scheduledFor || new Date().toISOString(),
                commitment_type: 'soft',
            },
        ]);
    };

    // Handlers
    const handleGoOnline = async () => {
        setIsConnecting(true);
        const result = await setIsOnline(true);
        setIsConnecting(false);

        if (result === 'ok') {
            toast.success(currentLanguage === 'ar' ? 'أنت الآن متصل!' : 'You are now online!');
        } else if (result === 'profile_incomplete') {
            toast.error(
                currentLanguage === 'ar'
                    ? 'أكمل ملفك الشخصي أولاً للبدء في استقبال الطلبات'
                    : 'Complete your profile first to start receiving jobs',
                { duration: 4000 }
            );
            navigate('/app/seller/profile/edit');
        } else {
            toast.error(currentLanguage === 'ar' ? 'فشل الاتصال، حاول مجدداً' : 'Failed to go online, please try again');
        }
    };

    const handleGoOffline = async () => {
        const result = await setIsOnline(false);
        if (result === 'ok') {
            toast.success(currentLanguage === 'ar' ? 'أنت الآن غير متصل' : 'You are now offline');
        }
    };

    const handleAcceptOpportunity = (id: string) => {
        setSelectedOpportunityId(id);
        setShowAcceptSheet(true);
    };

    const handleDeclineOpportunity = (id: string) => {
        setSelectedOpportunityId(id);
        setShowDeclineModal(true);
    };

    const handleJoinWaitlist = (id: string) => {
        toast.success(currentLanguage === 'ar' ? 'تمت إضافتك للقائمة' : 'Added to waitlist');
    };

    const handleAcceptWithPricing = async (pricing: any) => {
        if (!selectedOpportunityId) return;
        setShowAcceptSheet(false);

        const opp = opportunities.find(o => o.id === selectedOpportunityId);

        const onSuccess = async () => {
            toast.success(currentLanguage === 'ar' ? 'تم قبول الطلب بنجاح!' : 'Job accepted successfully!');

            await primeAcceptedJobState(selectedOpportunityId, opp);

            // Then fire real refetches in the background
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
            queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
            await refetchOpportunities();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        if (!opp?.offerId) {
            toast.error(currentLanguage === 'ar' ? 'تعذر العثور على عرض صالح لهذا الطلب' : 'No actionable offer was found for this request');
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
            await refetchOpportunities();
            return;
        }

        const result = await acceptOffer(opp.offerId, pricing);
        if (result.accepted) {
            await onSuccess();
        } else if (result.reason === 'already_taken') {
            toast.error(currentLanguage === 'ar' ? 'تم قبول هذا الطلب من فني آخر' : 'This job was already taken by another provider');
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
            await refetchOpportunities();
        } else {
            toast.error(result.error || 'Failed to accept job');
        }
    };

    const handleDeclineWithReason = async (reason: DeclineReason) => {
        setShowDeclineModal(false);
        if (!selectedOpportunityId) return;

        const opp = opportunities.find(o => o.id === selectedOpportunityId);
        if (opp?.offerId) {
            await declineOffer(opp.offerId, reason);
            refetchOpportunities();
        }
        toast.info(currentLanguage === 'ar' ? 'تم رفض الطلب' : 'Job declined');
    };

    const handleEditPrice = async (jobId: string, pricing: any) => {
        const { error } = await (supabase as any)
            .from('maintenance_requests')
            .update({ seller_pricing: pricing })
            .eq('id', jobId);

        if (error) {
            console.error('[SellerHome] Error updating price:', error);
            toast.error(currentLanguage === 'ar' ? 'حدث خطأ أثناء التحديث' : 'Failed to update price');
            return;
        }

        toast.success(currentLanguage === 'ar' ? 'تم تحديث السعر بنجاح' : 'Price updated successfully');
        queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
        queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
        queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="pb-28 min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    <p className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                    </p>
                </div>
            </div>
        );
    }

    // Render state-specific content
    const renderStateContent = () => {
        switch (state) {
            case 'A':
                return (
                    <SellerHomeOffline
                        currentLanguage={currentLanguage}
                        onGoOnline={handleGoOnline}
                        isConnecting={isConnecting}
                        serviceRadius={serviceRadius}
                        onRadiusChange={setServiceRadius}
                        profileCompleteness={profileCompleteness}
                    />
                );

            case 'B':
            case 'B0':
                return (
                    <SellerHomeOnline
                        currentLanguage={currentLanguage}
                        timeOnline={timeOnline}
                        todayEarnings={todayEarnings}
                        serviceRadius={serviceRadius}
                        onGoOffline={handleGoOffline}
                        onAcceptOpportunity={handleAcceptOpportunity}
                        onJoinWaitlist={handleJoinWaitlist}
                        onEditPrice={handleEditPrice}
                        onExpandRadius={() => setServiceRadius(prev => Math.min(prev + 3, 15))}
                    />
                );

            case 'C':
                if (!activeJob) return null;
                return (
                    <SellerHomeMissionMode
                        currentLanguage={currentLanguage}
                        activeJob={activeJob}
                        nextJob={scheduledJobs[0]}
                        todayEarnings={todayEarnings}
                    />
                );

            case 'D':
                return (
                    <SellerHomeScheduled
                        currentLanguage={currentLanguage}
                        timeOnline={timeOnline}
                        todayEarnings={todayEarnings}
                        scheduledJobs={scheduledJobs}
                        onGoOffline={handleGoOffline}
                        onAcceptOpportunity={handleAcceptOpportunity}
                        onJoinWaitlist={handleJoinWaitlist}
                        onEditPrice={handleEditPrice}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <>
            <div
                className="pb-28 min-h-screen bg-background"
                dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            >
                {/* Global Status Bar — always pinned at the top */}
                <div className="px-5 pt-4">
                    <OnlineStatusBar
                        currentLanguage={currentLanguage}
                        isOnline={isOnline}
                        onToggle={isOnline ? handleGoOffline : handleGoOnline}
                        timeOnline={timeOnline}
                        weeklyEarnings={todayEarnings}
                        activeJobStatus={state === 'C' ? activeJob?.status : undefined}
                        elapsedMin={
                            state === 'C' && activeJob?.status === 'in_progress'
                                ? Math.floor((Date.now() - new Date(activeJob?.scheduled_start_at || Date.now()).getTime()) / 60000)
                                : undefined
                        }
                        eta={
                            state === 'C' && (activeJob?.status === 'en_route' || activeJob?.status === 'in_route')
                                ? 12
                                : undefined
                        }
                        onMissionTap={() => {
                            if (
                                activeJob &&
                                (
                                    activeJob.status === 'accepted' ||
                                    activeJob.status === 'confirmed' ||
                                    activeJob.status === 'seller_assigned' ||
                                    activeJob.status === 'en_route' ||
                                    activeJob.status === 'in_route'
                                )
                            ) {
                                if (activeJob.location_lat && activeJob.location_lng) {
                                    window.open(
                                        `https://www.google.com/maps/dir/?api=1&destination=${activeJob.location_lat},${activeJob.location_lng}`,
                                        '_blank'
                                    );
                                    return;
                                }
                            }
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                    />
                </div>

                {/* Main Content */}
                <div className="px-5 pt-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={state}
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{
                                duration: 0.35,
                                ease: [0.4, 0, 0.2, 1]
                            }}
                        >
                            {renderStateContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals */}
            <AcceptJobSheet
                currentLanguage={currentLanguage}
                isOpen={showAcceptSheet}
                onClose={() => setShowAcceptSheet(false)}
                onAccept={handleAcceptWithPricing}
                jobDetails={(() => {
                    const opp = opportunities.find(o => o.id === selectedOpportunityId);
                    return {
                        category: opp?.category || 'Service',
                        categoryIcon: opp?.categoryIcon || '🛠️',
                        location: opp?.location || '',
                        situation: opp?.description,
                        timeMode: (opp?.urgency === 'urgent' || opp?.urgency === 'asap') ? 'asap' : 'scheduled',
                    };
                })()}
            />
            <DeclineReasonModal
                currentLanguage={currentLanguage}
                isOpen={showDeclineModal}
                onClose={() => setShowDeclineModal(false)}
                onDecline={handleDeclineWithReason}
            />
            <ReachOutPromptModal
                currentLanguage={currentLanguage}
                isOpen={showReachOutPrompt}
                onClose={() => setShowReachOutPrompt(false)}
                onContact={() => {
                    setShowReachOutPrompt(false);
                    navigate('/app/seller/messages');
                }}
                buyerName={currentLanguage === 'ar' ? 'العميل' : 'the customer'}
            />
        </>
    );
};
