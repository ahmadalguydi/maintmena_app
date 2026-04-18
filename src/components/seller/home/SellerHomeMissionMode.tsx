import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Clock, ChevronDown, AlertTriangle, PhoneOff, Camera, AlertCircle, CalendarClock, MessageCircle, ArrowLeft, Lock } from 'lucide-react';
import { MissionHeroCard } from './MissionHeroCard';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { FinalPriceSheet } from '@/components/mobile/FinalPriceSheet';
import { JobCompletionCodeModal } from '@/components/mobile/JobCompletionCodeModal';
import { PhotoProofModal } from '@/components/mobile/PhotoProofModal';
import { RescheduleApprovalBanner } from '@/components/mobile/RescheduleApprovalBanner';
import { useRescheduleRequest } from '@/hooks/useRescheduleRequest';
import { sendNotification } from '@/lib/notifications';

type MissionStatus = 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'seller_completed' | 'completed';

interface ActiveJob {
    id: string;
    type: 'request';
    status: string;
    lifecycle?: string;
    progress_signal?: 'arrived' | null;
    scheduled_start_at?: string;
    service_type?: string;
    description?: string;
    buyer_name?: string;
    buyer_phone?: string;
    location?: string;
    location_lat?: number;
    location_lng?: number;
    seller_marked_complete?: boolean;
    buyer_marked_complete?: boolean;
    buyer_price_approved?: boolean;
    budget?: number;
}

interface ScheduledJob {
    id: string;
    type: 'request';
    service_type?: string;
    description?: string;
    scheduled_start_at: string;
    buyer_name?: string;
    location?: string;
    commitment_type: 'soft' | 'hard';
}

export interface JobCompletionData {
    jobId: string;
    buyerName?: string;
    buyerAvatar?: string;
    amount: number;
    title?: string;
    category?: string;
    location?: string;
    lat?: number;
    lng?: number;
}

interface SellerHomeMissionModeProps {
    currentLanguage: 'en' | 'ar';
    activeJob: ActiveJob;
    nextJob?: ScheduledJob;
    todayEarnings: number;
    /** Whether this is voluntary focus mode for a scheduled job */
    isFocusMode?: boolean;
    /** Whether focus mode is auto-locked (cannot exit) */
    isFocusLocked?: boolean;
    /** Exit focus mode callback */
    onExitFocusMode?: () => void;
    /** Called when the job is fully completed (code verified) so parent can show celebration */
    onJobCompleted?: (data: JobCompletionData) => void;
}

const SERVICE_EMOJI: Record<string, string> = {
    'plumbing': '🔧',
    'Plumbing': '🔧',
    'electrical': '⚡',
    'Electrical': '⚡',
    'ac': '❄️',
    'AC': '❄️',
    'AC Maintenance': '❄️',
    'painting': '🎨',
    'Painting': '🎨',
    'cleaning': '🧹',
    'Cleaning': '🧹',
    'carpentry': '🪚',
    'Carpentry': '🪚',
    'appliance': '🔌',
};

export function SellerHomeMissionMode({
    currentLanguage,
    activeJob,
    nextJob,
    todayEarnings,
    isFocusMode,
    isFocusLocked,
    onExitFocusMode,
    onJobCompleted,
}: SellerHomeMissionModeProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [manageOpen, setManageOpen] = useState(false);
    const { reschedule: pendingReschedule } = useRescheduleRequest(activeJob.id);

    // Completion Flow State
    const [showFinalPriceSheet, setShowFinalPriceSheet] = useState(false);
    const [showCompletionCodeModal, setShowCompletionCodeModal] = useState(false);
    const [showPhotoProof, setShowPhotoProof] = useState(false);
    const [finalPrice, setFinalPrice] = useState(0);
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Photo Tracking
    const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | undefined>();
    const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | undefined>();
    
    // Sync photos from activeJob on mount or change
    useEffect(() => {
        const photos = (activeJob as any).completion_photos || [];
        if (photos.length > 0) {
            // Simple mapping: first is before, second is after
            setBeforePhotoUrl(photos[0]);
            if (photos.length > 1) {
                setAfterPhotoUrl(photos[1]);
            }
        } else {
            setBeforePhotoUrl(undefined);
            setAfterPhotoUrl(undefined);
        }
    }, [activeJob.id, (activeJob as any).completion_photos]);

    const content = {
        ar: {
            afterThis: 'بعد هذه',
            todaysEarnings: 'أرباح اليوم',
            manage: 'إدارة',
            quickUpdates: 'تحديثات سريعة',
            runningLate: 'سأتأخر (إرسال تحديث)',
            customerNotResponding: 'العميل لا يرد',
            addPhotoNote: 'إضافة ملاحظة صور',
            cancelJob: 'إلغاء المهمة',
            reschedule: 'إعادة جدولة',
            contactSupport: 'تواصل مع الدعم',
            at: 'في',
        },
        en: {
            afterThis: 'After this',
            todaysEarnings: "Today's Earnings",
            manage: 'Manage',
            quickUpdates: 'Quick Updates',
            runningLate: 'Running Late (send update)',
            customerNotResponding: 'Customer Not Responding',
            addPhotoNote: 'Add Photo Note',
            cancelJob: 'Cancel Job',
            reschedule: 'Reschedule',
            contactSupport: 'Contact Support',
            at: 'at',
        },
    };

    const t = content[currentLanguage];

    // Map status string to MissionStatus
    const getMissionStatus = (): MissionStatus => {
        // seller_marked_complete overrides the DB status — show waiting state regardless of
        // whether the DB status is arrived, in_progress, or anything else
        if (activeJob.seller_marked_complete && !activeJob.buyer_marked_complete) {
            return 'seller_completed';
        }

        const sellerStatus = (activeJob.status || '').toLowerCase();
        const lifecycle = (activeJob.lifecycle || '').toLowerCase();

        const statusMap: Record<string, MissionStatus> = {
            'accepted': 'accepted',
            'confirmed': 'accepted',
            'seller_assigned': 'accepted',
            'en_route': 'en_route',
            'in_route': 'en_route',
            'on_the_way': 'en_route',
            'arrived': 'arrived',
            'in_progress': 'in_progress',
            'working': 'in_progress',
            'seller_marked_complete': 'seller_completed',
            'completed': 'completed',
        };

        if (sellerStatus === 'arrived' || activeJob.progress_signal === 'arrived') {
            return 'arrived';
        }

        return statusMap[sellerStatus] || statusMap[lifecycle] || 'accepted';
    };

    const updateJobStatus = async (field: string, value: any) => {
        // Optimistic UI Update
        queryClient.setQueryData(['seller-active-job', user?.id], (old: any) => {
            if (!old) return old;
            return { ...old, [field]: value };
        });

        const { error } = await (supabase as any)
            .from('maintenance_requests')
            .update({ [field]: value })
            .eq('id', activeJob.id);

        if (error) {
            if (import.meta.env.DEV) console.error(`Error updating job ${field}:`, error);
            throw error;
        }

        await queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
        await queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
        await queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
    };

    const updatePhotosToDB = async (url: string) => {
        const currentPhotos = (activeJob as any).completion_photos || [];
        if (!currentPhotos.includes(url)) {
            await updateJobStatus('completion_photos', [...currentPhotos, url]);
        }
    };

    const handleBeforeUpload = async (url: string) => {
        setBeforePhotoUrl(url);
        await updatePhotosToDB(url);
        toast.success(currentLanguage === 'ar' ? 'حفظنا صورة (قبل العمل) 👍' : 'Before photo saved');
    };

    const handleAfterUpload = async (url: string) => {
        setAfterPhotoUrl(url);
        await updatePhotosToDB(url);
        toast.success(currentLanguage === 'ar' ? 'حفظنا صورة (بعد العمل) 👍' : 'After photo saved');
    };

    const handleNavigate = () => {
        if (activeJob.location_lat && activeJob.location_lng) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${activeJob.location_lat},${activeJob.location_lng}`,
                '_blank'
            );
        } else {
            toast.error(currentLanguage === 'ar' ? 'ما قدرنا نحدد موقعك' : 'Location not available');
        }
    };

    const handleStartMoving = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            // Update status first to ensure transition happens
            await updateJobStatus('status', 'en_route');
            toast.success(currentLanguage === 'ar' ? 'حركنا للموقع 🚗' : 'Navigation started');

            // Notify buyer
            if (activeJob.buyer_id) {
                sendNotification({
                    userId: activeJob.buyer_id,
                    type: 'seller_on_way',
                    contentId: activeJob.id,
                });
            }
        } catch (error) {
            toast.error(currentLanguage === 'ar' ? 'عفوًا، ما قدرنا نحدّث الحالة' : 'Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleMarkArrived = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await updateJobStatus('status', 'arrived');
            toast.success(currentLanguage === 'ar' ? 'وصلت بالسلامة 📍' : 'Arrival confirmed');

            // Notify buyer
            if (activeJob.buyer_id) {
                sendNotification({
                    userId: activeJob.buyer_id,
                    type: 'seller_arrived',
                    contentId: activeJob.id,
                });
            }
        } catch (error) {
            toast.error(currentLanguage === 'ar' ? 'عفوًا، ما قدرنا نأكد وصولك' : 'Failed to confirm arrival');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartWork = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            await updateJobStatus('status', 'in_progress');
            toast.success(currentLanguage === 'ar' ? 'بسم الله بدأنا العمل 🔧' : 'Work started');
        } catch (error) {
            toast.error(currentLanguage === 'ar' ? 'عفوًا، ما قدرنا نبدأ الشغل' : 'Failed to start work');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleComplete = () => {
        // Mock state support: if it's the mock job, bypass real supabase requirements momentarily or just show the UI
        setShowFinalPriceSheet(true);
    };

    const handleFinalPriceSubmit = (price: number) => {
        setFinalPrice(price);
        setShowFinalPriceSheet(false);
        
        const currentPhotos = (activeJob as any).completion_photos || [];
        if (currentPhotos.length > 0) {
            // Pass price directly to avoid state lag
            setTimeout(() => handlePhotoProofComplete(currentPhotos, price), 300);
        } else {
            setTimeout(() => setShowPhotoProof(true), 300);
        }
    };

    const handlePhotoProofComplete = async (photos: string[], overridePrice?: number) => {
        const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
        const priceToUse = overridePrice !== undefined ? overridePrice : finalPrice;

        const updateData: any = {
            status: 'seller_marked_complete',
            seller_marked_complete: true,
            seller_completion_date: new Date().toISOString(),
            completion_photos: photos,
            job_completion_code: code,
        };

        updateData.final_amount = priceToUse;
        updateData.budget = priceToUse;

        setIsUpdating(true);
        try {
            const { error } = await (supabase as any).from('maintenance_requests').update(updateData).eq('id', activeJob.id);
            if (error) throw error;

            toast.success(currentLanguage === 'ar' ? 'وصلت إثباتاتك 👍' : 'Photos submitted');
            setShowPhotoProof(false);

            // Notify buyer that we are awaiting their price approval
            if (activeJob.buyer_id) {
                sendNotification({
                    userId: activeJob.buyer_id,
                    type: 'price_approval_needed',
                    contentId: activeJob.id,
                });
            }

            // Critical: show the code modal immediately so they can finalize with the buyer
            setTimeout(() => setShowCompletionCodeModal(true), 300);

            await queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
            await queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
            await queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
        } catch (error: any) {
            if (import.meta.env.DEV) console.error('Photo proof submission error:', error);
            toast.error(currentLanguage === 'ar' ? 'عفوًا، ما قدرنا نرفعها' : 'Failed to submit photos');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCodeSubmit = async (code: string) => {
        setIsSubmittingCode(true);
        try {
            const { data: verified, error } = await supabase
                .rpc('verify_job_completion_code', {
                    p_request_id: activeJob.id,
                    p_code: code,
                });

            if (error) throw error;

            if (!verified) {
                toast.error(currentLanguage === 'ar' ? "الرمز مو صحيح، شيك عليه" : "Incorrect code");
                return;
            }

            toast.success(currentLanguage === 'ar' ? "تم يا بطل، تأكد إنجازك للعمل! 🎊" : "Job completion confirmed!");
            setShowCompletionCodeModal(false);

            // Capture celebration data before queries invalidate and job disappears
            if (onJobCompleted) {
                onJobCompleted({
                    jobId: activeJob.id,
                    buyerName: activeJob.buyer_name,
                    amount: finalPrice || activeJob.budget || 0,
                    title: activeJob.description,
                    category: activeJob.service_type,
                    location: activeJob.location,
                    lat: activeJob.location_lat,
                    lng: activeJob.location_lng,
                });
            }

            // Notify buyer
            if (activeJob.buyer_id) {
                sendNotification({
                    userId: activeJob.buyer_id,
                    type: 'job_completed',
                    contentId: activeJob.id,
                });
                // After completion, prompt for review shortly
                setTimeout(() => {
                    sendNotification({
                        userId: activeJob.buyer_id!,
                        type: 'review_prompt_reminder',
                        contentId: activeJob.id,
                    });
                }, 1000 * 60 * 30); // Show review prompt after 30 mins
            }

            queryClient.invalidateQueries({ queryKey: ['seller-active-job'] });
            queryClient.invalidateQueries({ queryKey: ['seller-active-jobs'] });
            queryClient.invalidateQueries({ queryKey: ['seller-scheduled-jobs'] });
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit code');
        } finally {
            setIsSubmittingCode(false);
        }
    };

    const handleCall = () => {
        if (activeJob.buyer_phone) {
            window.open(`tel:${activeJob.buyer_phone}`);
        }
    };

    // Format next job time
    const formatNextJobTime = () => {
        if (!nextJob?.scheduled_start_at) return '';
        const date = new Date(nextJob.scheduled_start_at);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="animate-fade-in space-y-5 pb-36"
        >
            {/* Focus Mode Header */}
            {isFocusMode && (
                <div className="flex items-center justify-between rounded-2xl bg-card border border-border/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                        {isFocusLocked ? (
                            <Lock className="h-4 w-4 text-red-500" />
                        ) : null}
                        <span className={cn(
                            "text-sm font-semibold",
                            isFocusLocked ? "text-red-600 dark:text-red-400" : "text-primary",
                            currentLanguage === 'ar' ? 'font-ar-body' : ''
                        )}>
                            {isFocusLocked
                                ? (currentLanguage === 'ar' ? 'وضع التركيز مُقفل — الموعد قريب' : 'Focus locked — job starting soon')
                                : (currentLanguage === 'ar' ? 'وضع التركيز' : 'Focus Mode')}
                        </span>
                    </div>
                    {!isFocusLocked && onExitFocusMode && (
                        <button
                            onClick={onExitFocusMode}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm font-medium text-foreground"
                        >
                            <ArrowLeft className={cn("h-3.5 w-3.5", currentLanguage === 'ar' && 'rotate-180')} />
                            {currentLanguage === 'ar' ? 'اطلع' : 'Exit'}
                        </button>
                    )}
                </div>
            )}

            {/* Pending Reschedule Approval (from buyer) */}
            {pendingReschedule && !pendingReschedule.isOwnRequest && (
                <RescheduleApprovalBanner
                    currentLanguage={currentLanguage}
                    requestId={activeJob.id}
                    newDate={pendingReschedule.newDate}
                    newTimeSlot={pendingReschedule.newTimeSlot ?? undefined}
                    requesterName={pendingReschedule.requesterName}
                    viewerRole="seller"
                />
            )}

            {/* Pending Reschedule (own request - waiting for approval) */}
            {pendingReschedule && pendingReschedule.isOwnRequest && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                    <p className={cn("text-sm text-primary font-medium", currentLanguage === 'ar' ? 'font-ar-body' : '')}>
                        {currentLanguage === 'ar' ? 'طلب التأجيل بانتظار موافقة العميل' : 'Reschedule request waiting for customer approval'}
                    </p>
                </div>
            )}

            {/* Mission Hero Card */}
            <MissionHeroCard
                currentLanguage={currentLanguage}
                status={getMissionStatus()}
                serviceType={activeJob.service_type}
                description={activeJob.description}
                location={activeJob.location}
                lat={activeJob.location_lat}
                lng={activeJob.location_lng}
                buyerName={activeJob.buyer_name}
                buyerPhone={activeJob.buyer_phone}
                eta={undefined}
                onNavigate={handleNavigate}
                onStartMoving={handleStartMoving}
                onMarkArrived={handleMarkArrived}
                onStartWork={handleStartWork}
                onComplete={handleComplete}
                onScanCode={() => setShowCompletionCodeModal(true)}
                buyerPriceApproved={activeJob.buyer_price_approved}
                onCall={handleCall}
                onOpenManageMenu={() => setManageOpen(!manageOpen)}
                onBeforeUpload={handleBeforeUpload}
                onAfterUpload={handleAfterUpload}
                beforePhotoUrl={beforePhotoUrl}
                afterPhotoUrl={afterPhotoUrl}
            />

            {/* Manage Menu UI */}
            {manageOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="rounded-2xl bg-card border border-border/40 p-2 shadow-lg relative z-20 overflow-hidden"
                >
                    <div className="px-4 pt-3 pb-2">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                            {t.quickUpdates}
                        </p>
                    </div>
                    
                    <div className="flex flex-col">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                if (activeJob.buyer_phone) {
                                    window.open(`tel:${activeJob.buyer_phone}`);
                                } else {
                                    toast.info(currentLanguage === 'ar' ? 'رقم الجوال مو متوفر' : 'Customer phone not available');
                                }
                            }}
                        >
                            <AlertTriangle className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.runningLate}
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                if (activeJob.buyer_phone) {
                                    window.open(`tel:${activeJob.buyer_phone}`);
                                } else {
                                    toast.info(currentLanguage === 'ar' ? 'رقم الجوال مو متوفر' : 'Customer phone not available');
                                }
                            }}
                        >
                            <PhoneOff className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.customerNotResponding}
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                navigate(`/app/seller/job/${activeJob.id}/notes?type=${activeJob.type}`);
                            }}
                        >
                            <Camera className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.addPhotoNote}
                        </button>
                    </div>

                    <div className="h-px bg-border/40 mx-4 my-1" />

                    <div className="flex flex-col pb-1">
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                navigate(`/app/seller/job/${activeJob.id}/cancel?type=${activeJob.type}`);
                            }}
                        >
                            <AlertCircle className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.cancelJob}
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                navigate(`/app/seller/job/${activeJob.id}/reschedule?type=${activeJob.type}`);
                            }}
                        >
                            <CalendarClock className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.reschedule}
                        </button>
                        <button
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground hover:bg-muted/50 transition-colors rounded-xl"
                            onClick={(e) => {
                                e.stopPropagation();
                                setManageOpen(false);
                                navigate('/app/support');
                            }}
                        >
                            <MessageCircle className="h-5 w-5 text-foreground shrink-0" strokeWidth={1.5} />
                            {t.contactSupport}
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Next Up Preview  - Premium Float */}
            {nextJob && (
                <div
                    className="rounded-[1.5rem] bg-card border border-white/20 px-5 py-4 flex items-center gap-4 cursor-pointer transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5"
                    onClick={() => navigate(`/app/seller/job/${nextJob.id}?type=${nextJob.type}`)}
                >
                    <div className="h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xl">{SERVICE_EMOJI[nextJob.service_type || ''] || '🔧'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            {t.afterThis}
                        </p>
                        <p className={cn(
                            "text-sm font-semibold text-foreground truncate",
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            {nextJob.service_type || nextJob.description} {t.at} {formatNextJobTime()}
                        </p>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
            )}

            {/* Tiny Earnings Ticker - Glassy feel */}
            <div
                className="rounded-2xl bg-gradient-to-br from-card to-card/50 backdrop-blur-md border border-white/20 px-5 py-4 flex items-center justify-between shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
            >
                <span className="text-xs text-muted-foreground">{t.todaysEarnings}</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-foreground">
                        SAR {todayEarnings.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-success font-semibold">
                        (+SAR 180)
                    </span>
                </div>
            </div>
            <FinalPriceSheet
                isOpen={showFinalPriceSheet}
                onClose={() => setShowFinalPriceSheet(false)}
                onSubmit={handleFinalPriceSubmit}
                initialPrice={activeJob.budget || 0}
                currentLanguage={currentLanguage}
                hasPhotos={((activeJob as any).completion_photos || []).length > 0}
            />

            <JobCompletionCodeModal
                isOpen={showCompletionCodeModal}
                onClose={() => setShowCompletionCodeModal(false)}
                onSubmit={handleCodeSubmit}
                currentLanguage={currentLanguage}
                isSubmitting={isSubmittingCode}
            />

            <PhotoProofModal
                isOpen={showPhotoProof}
                onClose={() => setShowPhotoProof(false)}
                onComplete={handlePhotoProofComplete}
                currentLanguage={currentLanguage}
                requestId={activeJob.id}
                initialPhotos={(activeJob as any).completion_photos || []}
            />
        </motion.div>
    );
}


