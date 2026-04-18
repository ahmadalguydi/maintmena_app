import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from '@tanstack/react-query';
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
import { sendNotification } from '@/lib/notifications';

// Shared components
import { SellerHomeHeader } from '@/components/seller/home/SellerHomeHeader';

// State A: Offline
import { SellerHomeOffline } from '@/components/seller/home/SellerHomeOffline';

// State B: Online
import { SellerHomeOnline } from '../../../components/seller/home/SellerHomeOnline';

// State C: Mission Mode
import { SellerHomeMissionMode } from '@/components/seller/home/SellerHomeMissionMode';
import type { JobCompletionData } from '@/components/seller/home/SellerHomeMissionMode';

// Celebration overlay
import { JobCompletionCelebration } from '@/components/mobile/JobCompletionCelebration';

// State D: Scheduled
import { SellerHomeScheduled } from '@/components/seller/home/SellerHomeScheduled';

// Accept/Decline modals (existing)
import { AcceptJobSheet } from '@/components/mobile/AcceptJobSheet';
import { DeclineReasonModal, DeclineReason } from '@/components/mobile/DeclineReasonModal';
import { ReachOutPromptModal } from '@/components/mobile/ReachOutPromptModal';
import { getRequestCoordinates, getRequestLocationLabel, toCanonicalRequest } from '@/lib/maintenanceRequest';

interface ScheduledJobEntry {
    id: string;
    type?: string;
    service_type?: string;
    description?: string;
    scheduled_start_at?: string;
    commitment_type?: string;
    [key: string]: unknown;
}

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
        enterFocusMode,
        exitFocusMode,
        isFocusMode,
        isFocusLocked,
    } = useSellerHomeState();

    // Local UI state
    const [serviceRadius, setServiceRadius] = useState(5);
    const [isConnecting, setIsConnecting] = useState(false);
    const [celebrationData, setCelebrationData] = useState<JobCompletionData | null>(null);

    // Load actual service radius from seller profile
    const { data: profileRadius } = useQuery({
        queryKey: ['seller-service-radius', user?.id],
    queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('profiles')
                .select('service_radius_km')
                .eq('id', user.id)
                .maybeSingle();
            return (data as { service_radius_km?: number | null } | null)?.service_radius_km ?? null;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (profileRadius != null) setServiceRadius(profileRadius);
    }, [profileRadius]);

    // On mount: if seller is already online (e.g. refreshed page or just logged in),
    // run catch-up dispatch so they don't miss requests posted while they were away.
    useEffect(() => {
        if (!isOnline || !user?.id) return;
        catchUpDispatch().then(({ dispatched }) => {
            if (dispatched > 0) {
                queryClient.invalidateQueries({ queryKey: ['seller-opportunities', user.id] });
            }
        }).catch(() => {/* ignore catch-up errors silently */});
        // Only run once on mount / when transitioning to online
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline, user?.id]);
    const [showAcceptSheet, setShowAcceptSheet] = useState(false);
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [showReachOutPrompt, setShowReachOutPrompt] = useState(false);

    const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

    // Real earnings from Supabase
    const { earnings } = useSellerEarnings();
    const todayEarnings = earnings.thisMonth;

    // Dispatch actions
    const { acceptOffer, declineOffer, catchUpDispatch } = useDispatchActions();

    // Catch up on outstanding offers when seller leaves mission mode (job completes)
    const prevActiveJobRef = useRef<typeof activeJob>(activeJob);
    useEffect(() => {
        const hadActiveJob = !!prevActiveJobRef.current;
        prevActiveJobRef.current = activeJob;
        // If seller just left mission mode (activeJob went from non-null to null) and is still online
        if (hadActiveJob && !activeJob && isOnline && user?.id) {
            catchUpDispatch().then(({ dispatched }) => {
                if (dispatched > 0) {
                    queryClient.invalidateQueries({ queryKey: ['seller-opportunities', user.id] });
                }
            }).catch(() => {});
        }
    }, [activeJob, isOnline, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
    const { opportunities, refetch: refetchOpportunities } = useOpportunities();

    const primeAcceptedJobState = async (
        jobId: string,
        _fallbackOpportunity?: (typeof opportunities)[number],
    ) => {
        if (!user?.id) return;

        const { data: jobData } = await (supabase as any)
            .from('maintenance_requests')
            .select('id, status, description, preferred_start_date, category, location, city, latitude, longitude, budget, buyer_id, seller_marked_complete, buyer_marked_complete, buyer_price_approved')
            .eq('id', jobId)
            .maybeSingle();

        if (!jobData) return;

        const canonicalJob = toCanonicalRequest(jobData);
        if (!canonicalJob) return;
        const jobCoordinates = getRequestCoordinates(jobData);

        let buyerProfile: { full_name?: string | null; phone?: string | null } | null = null;
        if (jobData.buyer_id) {
            const { data: buyerData } = await supabase
                .from('profiles')
                .select('full_name, phone')
                .eq('id', jobData.buyer_id)
                .maybeSingle();
            buyerProfile = buyerData as { full_name?: string | null; phone?: string | null } | null;
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
                location_lat: jobCoordinates?.lat,
                location_lng: jobCoordinates?.lng,
                seller_marked_complete: jobData.seller_marked_complete,
                buyer_marked_complete: jobData.buyer_marked_complete,
                buyer_price_approved: jobData.buyer_price_approved,
                budget: jobData.budget || 0,
            });
            queryClient.setQueryData(['seller-scheduled-jobs', user.id], (old: ScheduledJobEntry[] = []) =>
                old.filter((job) => job.id !== jobId),
            );
            return;
        }

        queryClient.setQueryData(['seller-active-job', user.id], null);
        queryClient.setQueryData(['seller-scheduled-jobs', user.id], (old: ScheduledJobEntry[] = []) => [
            ...old.filter((job) => job.id !== jobId),
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
            // Catch up on any open requests posted while this seller was offline
            catchUpDispatch().then(({ dispatched }) => {
                if (dispatched > 0) {
                    queryClient.invalidateQueries({ queryKey: ['seller-opportunities', user?.id] });
                }
            }).catch(() => {/* ignore catch-up errors silently */});
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

    const handleJoinWaitlist = async (id: string) => {
        const opp = opportunities.find(o => o.id === id);
        if (!opp?.offerId) {
            toast.info(currentLanguage === 'ar' ? 'لا يمكن الإضافة للقائمة حالياً' : 'Unable to join waitlist right now');
            return;
        }
        try {
            const { error } = await (supabase as unknown as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> } } })
                .from('job_dispatch_offers')
                .update({ offer_status: 'waitlisted' })
                .eq('id', opp.offerId);
            if (error) throw error;
            toast.success(currentLanguage === 'ar' ? 'تمت إضافتك للقائمة — سنخبرك إذا تفرّغ المكان' : 'You\'re on the waitlist — we\'ll notify you if a slot opens');
            queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
        } catch {
            toast.error(currentLanguage === 'ar' ? 'فشل الانضمام للقائمة' : 'Failed to join waitlist');
        }
    };

    const handleAcceptWithPricing = async (pricing: Record<string, unknown>) => {
        if (!selectedOpportunityId) return;
        setShowAcceptSheet(false);

        const opp = opportunities.find(o => o.id === selectedOpportunityId);

        const onSuccess = async () => {
            try {
                // Determine buyer_id to send notification
                const { data: reqData } = await supabase
                    .from('maintenance_requests')
                    .select('buyer_id')
                    .eq('id', selectedOpportunityId)
                    .maybeSingle();

                await primeAcceptedJobState(selectedOpportunityId, opp);
                toast.success(currentLanguage === 'ar' ? 'تم قبول الطلب بنجاح!' : 'Job accepted successfully!');

                if (reqData?.buyer_id) {
                    sendNotification({
                        userId: reqData.buyer_id,
                        type: 'job_accepted',
                        contentId: selectedOpportunityId,
                    });
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (err) {
                if (import.meta.env.DEV) console.error('[SellerHome] Failed to prime accepted job state:', err);
                toast.error(currentLanguage === 'ar' ? 'حدث خطأ أثناء تحميل بيانات الطلب' : 'Failed to load job data, please refresh');
            } finally {
                // Always resync queries regardless of priming outcome
                queryClient.invalidateQueries({ queryKey: ['seller-opportunities'] });
                queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
                queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
                await refetchOpportunities();
            }
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

    const handleEditPrice = async (jobId: string, pricing: Record<string, unknown>) => {
        const { error } = await (supabase as any)
            .from('maintenance_requests')
            .update({ seller_pricing: pricing })
            .eq('id', jobId);

        if (error) {
            if (import.meta.env.DEV) console.error('[SellerHome] Error updating price:', error);
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
                        onExpandRadius={async () => {
                            const newRadius = Math.min(serviceRadius + 3, 15);
                            setServiceRadius(newRadius);
                            if (user?.id) {
                                await supabase
                                    .from('profiles')
                                    .update({ service_radius_km: newRadius })
                                    .eq('id', user.id);
                            }
                        }}
                    />
                );

            case 'C':
                if (!activeJob) return (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                    </div>
                );
                return (
                    <SellerHomeMissionMode
                        currentLanguage={currentLanguage}
                        activeJob={activeJob}
                        nextJob={scheduledJobs[0]}
                        todayEarnings={todayEarnings}
                        isFocusMode={isFocusMode}
                        isFocusLocked={isFocusLocked}
                        onExitFocusMode={exitFocusMode}
                        onJobCompleted={(data) => setCelebrationData(data)}
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
                        onEnterFocusMode={enterFocusMode}
                    />
                );

            default:
                return (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                    </div>
                );
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
                    <AnimatePresence mode="popLayout">
                        <motion.div
                            key={state}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.2,
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

            {/* Job Completion Celebration — rendered at SellerHome level so it survives mission mode unmount */}
            <AnimatePresence>
                {celebrationData && (
                    <JobCompletionCelebration
                        data={{
                            variant: 'seller',
                            buyerName: celebrationData.buyerName || (currentLanguage === 'ar' ? 'العميل' : 'Client'),
                            buyerAvatar: celebrationData.buyerAvatar,
                            amount: celebrationData.amount,
                            title: celebrationData.title || '',
                            category: celebrationData.category,
                            jobId: celebrationData.jobId,
                            location: celebrationData.location,
                            lat: celebrationData.lat,
                            lng: celebrationData.lng,
                        }}
                        currentLanguage={currentLanguage}
                        onDismiss={() => setCelebrationData(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
