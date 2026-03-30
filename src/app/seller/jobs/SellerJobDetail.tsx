import React from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { PhotoProofModal } from "@/components/mobile/PhotoProofModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SoftCard } from "@/components/mobile/SoftCard";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { Heading2, Heading3, Body, BodySmall, Label, Caption } from "@/components/mobile/Typography";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    FileText, MapPin, DollarSign, Clock, Calendar, User, Briefcase,
    MessageCircle, Phone, ChevronLeft, ChevronRight, Star, CheckCircle,
    Truck, Play, Award, Image as ImageIcon, ExternalLink, BadgeCheck, X, QrCode
} from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { JobTrackingCard } from "@/components/mobile/JobTrackingCard";
import { formatDuration } from "@/utils/formatDuration";
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";
import { EmptyState } from "@/components/mobile/EmptyState";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCategoryLabel, getCategoryIcon } from "@/lib/serviceCategories";
import {
    getAvailableSellerActions,
    getRequestLocationLabel,
    getRequestTimeline,
    toCanonicalRequest,
} from "@/lib/maintenanceRequest";
import { AvatarBadge } from "@/components/mobile/AvatarBadge";
import { useState } from "react";
import { SellerJourneyBanner } from "@/components/mobile/SellerJourneyBanner";
import { IssueResponseSheet } from "@/components/mobile/IssueResponseSheet";
import { SellerVisibilityPanel } from "@/components/mobile/SellerVisibilityPanel";
import { useActiveJobIssue } from "@/hooks/useJobIssues";
import { ActiveIssueCard } from "@/components/mobile/ActiveIssueCard";
import { FinalPriceSheet } from "@/components/mobile/FinalPriceSheet";
import { JobCompletionCodeModal } from "@/components/mobile/JobCompletionCodeModal";

interface SellerJobDetailProps {
    currentLanguage: "en" | "ar";
}

// Progress Timeline Step Component
const TimelineStep = ({
    icon: Icon,
    label,
    isActive,
    isCompleted,
    isLast,
    currentLanguage
}: {
    icon: React.ComponentType<{ size?: number }>;
    label: string;
    isActive: boolean;
    isCompleted: boolean;
    isLast: boolean;
    currentLanguage: 'en' | 'ar';
}) => (
    <div className="flex flex-col items-center relative flex-1">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-20 transition-all duration-300",
                isCompleted
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : isActive
                        ? "bg-background border-2 border-primary text-primary"
                        : "bg-background border-2 border-muted text-muted-foreground"
            )}
        >
            {isCompleted ? <CheckCircle size={20} /> : <Icon size={18} />}
        </motion.div>
        <span className={cn(
            "text-[10px] mt-1.5 font-medium text-center max-w-[60px] leading-tight",
            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
            isCompleted || isActive ? "text-primary" : "text-muted-foreground"
        )}>
            {label}
        </span>
        {!isLast && (
            <div className={cn(
                "absolute top-5 h-[2px] w-full z-0",
                currentLanguage === 'ar' ? 'right-1/2' : 'left-1/2',
                isCompleted ? "bg-primary" : "bg-border"
            )} />
        )}
    </div>
);

export const SellerJobDetail = ({ currentLanguage }: SellerJobDetailProps) => {
    const { id } = useParams();
    const [_searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const type = 'request';
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [showPhotoProof, setShowPhotoProof] = useState(false);
    const [showIssueResponse, setShowIssueResponse] = useState(false);
    const [showFinalPriceSheet, setShowFinalPriceSheet] = useState(false);
    const [showCompletionCodeModal, setShowCompletionCodeModal] = useState(false);
    const [finalPrice, setFinalPrice] = useState(0);
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);

    const queryClient = useQueryClient();
    const isRequest = type === 'request';

    // Issue resolution
    const { data: activeIssue, refetch: refetchIssue } = useActiveJobIssue(
        id || '',
        'request'
    );

    const { data: job, isLoading } = useQuery({
        queryKey: ['seller-job-detail', id, type],
        queryFn: async () => {
            if (!user?.id) return null;
            // All jobs now go through maintenance_requests (dispatch flow)
            // Security: verify the viewing seller is the assigned seller
            const { data: requestData } = await (supabase as any)
                .from('maintenance_requests')
                .select('id, status, description, location, city, latitude, longitude, budget, estimated_budget_max, preferred_start_date, preferred_time_slot, time_preference, time_slot, service_category, category, project_duration_days, buyer_id, assigned_seller_id, seller_marked_complete, buyer_marked_complete, buyer_price_approved, final_amount, seller_pricing, seller_completion_date, buyer_completion_date, seller_on_way_at, work_started_at, before_photos, completion_photos')
                .eq('id', id)
                .eq('assigned_seller_id', user.id)
                .maybeSingle();


            if (requestData) {
                let buyerProfile: { id: string; full_name: string | null; company_name: string | null; avatar_url: string | null; phone: string | null } | null = null;
                if ((requestData as any).buyer_id) {
                    const { data: buyerData } = await (supabase as any)
                        .from('profiles')
                        .select('id, full_name, company_name, avatar_url, phone')
                        .eq('id', (requestData as any).buyer_id)
                        .maybeSingle();
                    buyerProfile = buyerData;
                }

                return {
                    ...requestData,
                    profiles: buyerProfile,
                    jobType: 'request',
                    isRequest: true,
                };
            }
            return null;
        },
        enabled: !!id && !!user?.id,
        refetchInterval: 5000, // Poll for buyer_price_approved changes
    });

    // acceptedQuote removed — not used in dispatch flow

    const { data: sellerProfile } = useQuery({
        queryKey: ['seller-profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            return data;
        },
        enabled: !!user?.id
    });

    const content = {
        ar: {
            jobTitle: 'طلب',
            description: 'الوصف',
            client: 'العميل',
            serviceProvider: 'مقدم الخدمة',
            verifiedPro: 'موثق',
            location: 'الموقع',
            startDate: 'تاريخ البدء',
            duration: 'المدة',
            viewContract: 'العقد',
            documents: 'المستندات',
            quoteSummary: 'ملخص العرض',
            laborCost: 'السعر المتفق',
            total: 'الإجمالي',
            message: 'رسالة',
            call: 'اتصال',
            jobs: 'أعمال سابقة',
            notFound: 'لم يتم العثور على العمل',
            back: 'عودة',
            scheduled: 'مجدول',
            onWay: 'في الطريق',
            started: 'بدأ العمل',
            markedComplete: 'مكتمل',
            completed: 'تم التأكيد',
            inProgress: 'قيد التنفيذ',
            unitPhotos: 'صور العمل',
            signedPdf: 'موقع • PDF'
        },
        en: {
            jobTitle: 'Job',
            description: 'Description',
            client: 'Client',
            serviceProvider: 'Service Provider',
            verifiedPro: 'VERIFIED PRO',
            location: 'Location',
            startDate: 'START DATE',
            duration: 'DURATION',
            viewContract: 'Contract',
            documents: 'Documents',
            pricingSummary: 'Pricing Summary',
            laborCost: 'Agreed Price',
            total: 'Total',
            message: 'Message',
            call: 'Call',
            jobs: 'Jobs',
            notFound: 'Job not found',
            back: 'Back',
            scheduled: 'Scheduled',
            onWay: 'On Way',
            started: 'Started',
            markedComplete: 'Complete',
            completed: 'Confirmed',
            inProgress: 'IN PROGRESS',
            unitPhotos: 'Unit Photo',
            signedPdf: 'Signed • PDF'
        }
    };

    const t = content[currentLanguage];
    const canonicalJob = job ? toCanonicalRequest(job as any) : null;

    // Calculate progress step based on DB status
    const getProgressStep = () => {
        if (!canonicalJob) return 0;
        const timeline = getRequestTimeline(canonicalJob);
        const activeIndex = timeline.findIndex((step) => step.status === 'current');
        if (activeIndex >= 0) return activeIndex + 1;

        const completedIndex = timeline.reduce((lastIndex, step, index) => (
            step.status === 'completed' ? index : lastIndex
        ), -1);
        return completedIndex >= 0 ? completedIndex + 1 : 1;
    };

    const progressStep = getProgressStep();

    // Helper functions
    const getLocalizedCity = (city: string | null | undefined) => {
        if (!city) return null;
        const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
            c.en.toLowerCase() === city.toLowerCase() || c.ar === city
        );
        return currentLanguage === 'ar' ? (cityData?.ar || city) : (cityData?.en || city);
    };

    const getLocation = () => {
        let address = '';
        let city = '';
        if (job?.isRequest) {
            const requestLabel = getRequestLocationLabel(job as any, '');
            address = requestLabel || (job as any).location || '';
            city = (job as any).location_city || (job as any).city || '';
        } else {
            address = (job as any).location_address || '';
            city = (job as any).location_city || '';
        }
        const cityData = city ? SAUDI_CITIES_BILINGUAL.find(c =>
            c.en.toLowerCase() === city.toLowerCase() || c.ar === city
        ) : null;
        const displayCity = getLocalizedCity(city);

        // If in Arabic and we have a city match, replace English city name with Arabic in address
        if (currentLanguage === 'ar' && cityData && address) {
            const localizedAddress = address.replace(new RegExp(cityData.en, 'gi'), cityData.ar);
            return localizedAddress;
        }

        if (address && displayCity) {
            if (address.toLowerCase().includes(city?.toLowerCase() || '___')) return address;
            if (address.toLowerCase() === city?.toLowerCase()) return displayCity;
            return `${address}, ${displayCity}`;
        }
        return address || displayCity;
    };

    const getAmount = () => {
        const baseAmount = job?.isRequest
            ? ((job as any).budget || (job as any).estimated_budget_max)
            : ((job as any).final_amount || (job as any).final_agreed_price || (job as any).deposit_amount);
        return baseAmount || 0;
    };

    const getStartDate = () => {
        return canonicalJob?.scheduledFor ?? null;
    };

    const getDuration = () => {
        if (job?.isRequest) {
            return (job as any).project_duration_days ? `${(job as any).project_duration_days} ${currentLanguage === 'ar' ? 'يوم' : 'Days'}` : null;
        }
        return null;
    };

    const getServiceCategory = () => {
        const category = (job as any)?.service_category || (job as any)?.title;
        if (category) {
            return getCategoryLabel(category, currentLanguage);
        }
        return currentLanguage === 'ar' ? 'صيانة' : 'Maintenance';
    };

    const getDescription = () => {
        if (job?.isRequest) {
            return currentLanguage === 'ar'
                ? ((job as any).description_ar || (job as any).description)
                : (job as any).description;
        }
        return (job as any).job_description;
    };

    // Geofencing Check
    const checkLocation = async (targetLat: number, targetLng: number): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(true); // Fallback if no GPS
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    // Haversine distance
                    const R = 6371e3; // metres
                    const φ1 = latitude * Math.PI / 180;
                    const φ2 = targetLat * Math.PI / 180;
                    const Δφ = (targetLat - latitude) * Math.PI / 180;
                    const Δλ = (targetLng - longitude) * Math.PI / 180;

                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const d = R * c; // in metres

                    if (d > 200) { // 200m radius
                        toast.error(
                            currentLanguage === 'ar'
                                ? `أنت على بُعد ${Math.round(d)} م من الموقع. يجب أن تكون ضمن 200 م لبدء العمل.`
                                : `You are ${Math.round(d)}m from the job site. You must be within 200m to begin.`
                        );
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                },
                () => {
                    // Location permission denied or unavailable — allow but inform
                    toast.info(
                        currentLanguage === 'ar'
                            ? 'تعذّر التحقق من موقعك — تأكد أنك في الموقع قبل البدء'
                            : 'Location unavailable — please ensure you are on-site before starting'
                    );
                    resolve(true);
                }
            );
        });
    };

    const handleStatusUpdate = async (newStatus: string) => {
        // GEOFENCING ENFORCEMENT
        if (newStatus === 'in_progress') {
            const req = job as Record<string, unknown>;
            if (req.latitude && req.longitude) {
                const isOnsite = await checkLocation(req.latitude as number, req.longitude as number);
                if (!isOnsite) return;
            }
        }

        try {
            const { error } = await (supabase as any)
                .from('maintenance_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            toast.success(currentLanguage === 'ar' ? 'تم تحديث الحالة' : 'Status updated');
            queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
            queryClient.invalidateQueries({ queryKey: ["seller-home"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-job"] });
            queryClient.invalidateQueries({ queryKey: ["seller-scheduled-jobs"] });
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to update status');
        }
    };
    const updateStatusMutation = useMutation({
        mutationFn: async (updateData: Record<string, unknown>) => {
            const { error } = await (supabase as any).from('maintenance_requests').update(updateData).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
            queryClient.invalidateQueries({ queryKey: ["seller-home"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-job"] });
            queryClient.invalidateQueries({ queryKey: ["seller-scheduled-jobs"] });
            toast.success(currentLanguage === 'ar' ? "تم تحديث الحالة بنجاح" : "Status updated successfully");
        },
        onError: () => {
            toast.error("Failed to update status");
        }
    });

    const handleSellerOnWay = () => {
        handleStatusUpdate('en_route');
    };

    const handleArrived = () => {
        handleStatusUpdate('arrived');
    };

    const handleSellerMarkComplete = () => {
        setShowFinalPriceSheet(true);
    };

    const handleFinalPriceSubmit = (price: number) => {
        setFinalPrice(price);
        setShowFinalPriceSheet(false);
        setTimeout(() => setShowPhotoProof(true), 300); // Wait for sheet to close
    };

    const handleSellerPhotoProofComplete = async (photos: string[]) => {
        const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

        const updateData = {
            seller_marked_complete: true,
            seller_completion_date: new Date().toISOString(),
            completion_photos: photos,
            job_completion_code: code,
            final_amount: finalPrice,
            budget: finalPrice,
        };

        const { error } = await (supabase as any)
            .from('maintenance_requests')
            .update(updateData)
            .eq('id', id);

        if (error) {
            toast.error("Failed to mark complete");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
        queryClient.invalidateQueries({ queryKey: ["seller-home"] });
        queryClient.invalidateQueries({ queryKey: ["seller-active-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["seller-active-job"] });
        queryClient.invalidateQueries({ queryKey: ["seller-scheduled-jobs"] });
        toast.success(currentLanguage === 'ar' ? "تم تحديث الحالة بنجاح" : "Status updated successfully");
    };

    const handleCodeSubmit = async (code: string) => {
        setIsSubmittingCode(true);
        try {
            const { data: verified, error } = await supabase
                .rpc('verify_job_completion_code', {
                    p_request_id: id,
                    p_code: code,
                });

            if (error) throw error;

            if (!verified) {
                toast.error(currentLanguage === 'ar' ? "الرمز غير صحيح" : "Incorrect code");
                return;
            }

            toast.success(currentLanguage === 'ar' ? "تم تأكيد إنجاز العمل!" : "Job completion confirmed!");
            setShowCompletionCodeModal(false);
            queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
            queryClient.invalidateQueries({ queryKey: ["seller-home"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-job"] });
            queryClient.invalidateQueries({ queryKey: ["seller-scheduled-jobs"] });
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit code');
        } finally {
            setIsSubmittingCode(false);
        }
    };

    // Helper to check conditions
    const isWaitingForBuyer = canonicalJob?.completionState === 'seller_marked_complete';
    const isBuyerPriceApproved = canonicalJob?.pricingState === 'approved';

    if (isLoading) {
        return (
            <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <div className="px-4 py-6 space-y-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-3xl" />
                    <Skeleton className="h-32 w-full rounded-3xl" />
                    <Skeleton className="h-48 w-full rounded-3xl" />
                </div>
            </div>
        );
    }

    if (!isLoading && job === null) {
        return (
            <div className="min-h-screen bg-background pb-safe" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <div className="h-[60vh] flex items-center justify-center">
                    <EmptyState
                        icon={Briefcase}
                        title={t.notFound}
                        description={
                            currentLanguage === 'ar'
                                ? 'لم يعد هذا الطلب مسنداً إليك'
                                : 'This job is no longer assigned to you'
                        }
                        actionLabel={t.back}
                        onAction={() => navigate('/app/seller/home')}
                    />
                </div>
            </div>
        );
    }
    if (!canonicalJob) {
        return (
            <div className="min-h-screen bg-background pb-safe" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                <div className="h-[60vh] flex items-center justify-center">
                    <EmptyState
                        icon={Briefcase}
                        title={t.notFound}
                        description=""
                        actionLabel={t.back}
                        onAction={() => navigate('/app/seller/home')}
                    />
                </div>
            </div>
        );
    }

    const buyerProfile = job.profiles as { id: string; full_name: string | null; company_name: string | null; avatar_url: string | null; phone: string | null } | null;
    const photos = (job as any).before_photos || (job as any).photos || [];
    const completionPhotos = (job as any).completion_photos || [];
    const allPhotos = [...(Array.isArray(photos) ? photos : []), ...(Array.isArray(completionPhotos) ? completionPhotos : [])];
    const shortJobId = id?.substring(0, 4).toUpperCase();

    const cleanDescription = getDescription()
        ?.replace(/\[Flexible Date\]/g, '')
        .replace(/\[تاريخ مرن\]/g, '')
        .replace(/\[Flexible Time\]/g, '')
        .replace(/\[وقت مرن\]/g, '')
        .trim();

    const timelineSteps = [
        { icon: CheckCircle, label: currentLanguage === 'ar' ? 'مقبول' : 'Accepted' },
        { icon: Truck, label: t.onWay },
        { icon: MapPin, label: currentLanguage === 'ar' ? 'وصلت' : 'Arrived' },
        { icon: CheckCircle, label: t.markedComplete },
        { icon: Award, label: t.completed },
    ];

    return (
        <div className="pb-32 min-h-screen bg-gradient-to-b from-background to-muted/30" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <GradientHeader
                title={currentLanguage === 'ar' ? 'تفاصيل العمل' : 'Job Details'}
                showBack
                onBack={() => navigate('/app/seller/home')}
            />

            <div className="px-4 py-6 space-y-6">
                {/* Active Issue Card (if any) */}
                {activeIssue && (
                    <ActiveIssueCard
                        issue={activeIssue}
                        currentLanguage={currentLanguage}
                        userRole="seller"
                        userId={user?.id}
                        onRespond={() => setShowIssueResponse(true)}
                    />
                )}

                {/* Progress Timeline */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="py-4"
                >
                    <div className="flex items-start justify-between px-2">
                        {timelineSteps.map((step, index) => (
                            <TimelineStep
                                key={index}
                                icon={step.icon}
                                label={step.label}
                                isActive={progressStep === index + 1}
                                isCompleted={progressStep > index + 1}
                                isLast={index === timelineSteps.length - 1}
                                currentLanguage={currentLanguage}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Job Fully Completed Success Banner */}
                {(canonicalJob.lifecycle === 'closed' || canonicalJob.completionState === 'buyer_confirmed') && (
                    <motion.div
                        initial={{ opacity: 0, y: -16, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-2"
                    >
                        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/30">
                            <Award size={28 as number} className="text-white" />
                        </div>
                        <Heading3 lang={currentLanguage} className="text-emerald-800 dark:text-emerald-300">
                            {currentLanguage === 'ar' ? 'تم إنجاز العمل بنجاح!' : 'Job Completed!'}
                        </Heading3>
                        <BodySmall lang={currentLanguage} className="text-emerald-600 dark:text-emerald-400">
                            {currentLanguage === 'ar' ? 'تم تأكيد الإنجاز من العميل' : 'Confirmed by the buyer'}
                        </BodySmall>
                    </motion.div>
                )}

                {/* Seller Journey Banner - Only for scheduled jobs */}
                {canonicalJob.lifecycle !== 'closed' && !isWaitingForBuyer && (
                    <SellerJourneyBanner
                        jobId={id || ''}
                        jobType={type as 'request' | 'booking'}
                        customerName={buyerProfile?.full_name || buyerProfile?.company_name || (currentLanguage === 'ar' ? 'العميل' : 'Client')}
                        isScheduledToday={(() => {
                            const startDate = getStartDate();
                            if (!startDate) return false;
                            const today = new Date().toDateString();
                            return new Date(startDate).toDateString() === today;
                        })()}
                    />
                )}

                {/* Active Issue Alert - If buyer raised an issue */}
                {activeIssue && activeIssue.raised_by !== user?.id && activeIssue.status === 'pending' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-2xl p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-500/20">
                                <MessageCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-orange-800 dark:text-orange-200">
                                    {currentLanguage === 'ar' ? 'العميل يحتاج مساعدة' : 'Customer needs help'}
                                </p>
                                <p className="text-sm text-orange-600">
                                    {currentLanguage === 'ar' ? 'يرجى الرد بأسرع وقت' : 'Please respond soon'}
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setShowIssueResponse(true)}
                            >
                                {currentLanguage === 'ar' ? 'رد' : 'Reply'}
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Date & Duration Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="grid grid-cols-2 gap-3"
                >
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 border border-primary/10">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar size={16} className="text-primary" />
                            <Label lang={currentLanguage} className="text-primary text-xs uppercase tracking-wide">
                                {t.startDate}
                            </Label>
                        </div>
                        <Body lang={currentLanguage} className="font-semibold">
                            {(() => {
                                const startDate = getStartDate();
                                if (!startDate) return currentLanguage === 'ar' ? 'مرن' : 'Flexible';
                                const date = new Date(startDate);
                                const sellerProposal = ((job as Record<string, unknown>)?.seller_counter_proposal) as Record<string, string> | null | undefined;
                                // Check multiple field names for time preference
                                const timeSlot = sellerProposal?.time_preference || sellerProposal?.time_slot ||
                                    (job as any)?.time_preference || (job as any)?.time_slot ||
                                    (job as any)?.preferred_time_slot;
                                const dateStr = format(date, "MMM d", { locale: currentLanguage === 'ar' ? ar : enUS });

                                // Try to get time from time_slot first
                                if (timeSlot) {
                                    const timeMap: Record<string, string> = {
                                        morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
                                        afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
                                        evening: currentLanguage === 'ar' ? 'مساءً' : 'Evening'
                                    };
                                    return `${dateStr} • ${timeMap[timeSlot] || timeSlot}`;
                                }

                                // Fall back to time window based on hour if date has time component
                                const hours = date.getHours();
                                const minutes = date.getMinutes();
                                if (hours !== 0 || minutes !== 0) {
                                    // Determine time window from hour: morning (6-11), afternoon (12-17), night (18+)
                                    let timeLabel: string;
                                    if (hours >= 6 && hours < 12) {
                                        timeLabel = currentLanguage === 'ar' ? 'صباحاً' : 'Morning';
                                    } else if (hours >= 12 && hours < 18) {
                                        timeLabel = currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon';
                                    } else {
                                        timeLabel = currentLanguage === 'ar' ? 'مساءً' : 'Evening';
                                    }
                                    return `${dateStr} • ${timeLabel}`;
                                }

                                return dateStr;
                            })()}
                        </Body>
                    </div>
                    <div className="bg-gradient-to-br from-muted/50 to-muted rounded-2xl p-4 border border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-muted-foreground" />
                            <Label lang={currentLanguage} className="text-muted-foreground text-xs uppercase tracking-wide">
                                {t.location}
                            </Label>
                        </div>
                        <Body lang={currentLanguage} className="font-semibold">
                            {getLocation() || (currentLanguage === 'ar' ? 'غير محدد' : 'Not specified')}
                        </Body>
                    </div>
                </motion.div>

                {/* Description */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <BodySmall lang={currentLanguage} className="mb-2">{t.description}</BodySmall>
                    <SoftCard className="p-4">
                        {/* Service Badge - Neutral style like explore screen */}
                        <div className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border/50 shadow-sm float-left mr-3 mb-1",
                            currentLanguage === 'ar' ? 'flex-row-reverse' : ''
                        )}>
                            <span className="text-sm text-blue-500">{getCategoryIcon((job as any).service_category)}</span>
                            <span className={cn(
                                "text-xs font-medium text-foreground",
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                            )}>
                                {getServiceCategory()}
                            </span>
                        </div>
                        <Body lang={currentLanguage} className="leading-relaxed text-muted-foreground">
                            {cleanDescription}
                        </Body>
                    </SoftCard>
                </motion.div>

                {/* Job Parties */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <BodySmall lang={currentLanguage} className="mb-2 font-semibold">
                        {currentLanguage === 'ar' ? 'أطراف العمل' : 'Job Parties'}
                    </BodySmall>

                    {/* Service Provider (Self) - VendorCard Style */}
                    <SoftCard className="p-4 mb-3">
                        <div className={cn("flex items-start gap-3", currentLanguage === 'ar' ? 'flex-row-reverse' : '')}>
                            <AvatarBadge
                                src={(sellerProfile as Record<string, unknown>)?.profile_image_url as string | undefined || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                                fallback={(sellerProfile?.company_name || sellerProfile?.full_name || "S")[0]}
                                size="md"
                                className="border border-border/50 rounded-full"
                            />
                            <div className={cn("flex-1", currentLanguage === 'ar' ? 'text-right' : 'text-left')}>
                                <div className={cn("flex items-center gap-2 mb-1", currentLanguage === 'ar' ? 'flex-row-reverse justify-end' : '')}>
                                    <Heading3 lang={currentLanguage} className="leading-tight text-base">
                                        {sellerProfile?.company_name || sellerProfile?.full_name || (currentLanguage === 'ar' ? 'أنت' : 'You')}
                                    </Heading3>
                                    {(sellerProfile as Record<string, unknown>)?.is_seller_verified && (
                                        <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 flex-shrink-0" />
                                    )}
                                </div>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground mb-2">
                                    {t.serviceProvider}
                                </BodySmall>
                                <div className={cn("flex items-center gap-3 flex-wrap", currentLanguage === 'ar' ? 'flex-row-reverse justify-end' : '')}>
                                    {((sellerProfile as any)?.seller_rating || 0) > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                            <span className="text-sm font-semibold">{(sellerProfile as any)?.seller_rating?.toFixed(1)}</span>
                                        </div>
                                    )}
                                    {((sellerProfile as any)?.completed_projects || 0) > 0 && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Briefcase size={14} />
                                            <Caption lang={currentLanguage}>{(sellerProfile as any)?.completed_projects} {t.jobs}</Caption>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </SoftCard>

                    {/* Client */}
                    <SoftCard className="p-4">
                        <div className={cn("flex items-center gap-3", currentLanguage === 'ar' ? 'flex-row-reverse' : '')}>
                            <AvatarBadge
                                src={buyerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${buyerProfile?.id}`}
                                fallback={(buyerProfile?.company_name?.[0] || buyerProfile?.full_name?.[0] || (currentLanguage === 'ar' ? 'ع' : 'C')).toUpperCase()}
                                size="md"
                                className="border border-border/50 rounded-full bg-muted"
                            />
                            <div className={cn("flex-1", currentLanguage === 'ar' ? 'text-right' : 'text-left')}>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground mb-1">
                                    {t.client}
                                </BodySmall>
                                <Heading3 lang={currentLanguage} className="leading-tight text-base">
                                    {buyerProfile?.company_name || buyerProfile?.full_name || (currentLanguage === 'ar' ? 'العميل' : 'Client')}
                                </Heading3>
                            </div>
                            <div className={cn("flex items-center gap-2", currentLanguage === 'ar' ? 'flex-row-reverse' : '')}>
                                <button
                                    onClick={() => {
                                        navigate(`/app/messages/thread?request=${id}`);
                                    }}
                                    className="p-2.5 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
                                >
                                    <MessageCircle size={18} />
                                </button>
                                {buyerProfile?.phone && (
                                    <a
                                        href={`tel:${buyerProfile.phone}`}
                                        className="p-2.5 rounded-2xl bg-muted hover:bg-muted/80 transition-colors"
                                    >
                                        <Phone size={18} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </SoftCard>
                </motion.div>

                {/* Documents Section */}
                {allPhotos.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <BodySmall lang={currentLanguage} className="mb-2 font-semibold">{t.documents}</BodySmall>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {allPhotos.slice(0, 4).map((photo: string, index: number) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="flex-shrink-0 w-36 h-32 rounded-2xl overflow-hidden relative bg-muted cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <img src={photo} alt="" className="w-full h-full object-cover" />
                                    {index === 0 && (
                                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                                            <span className="text-white text-[10px]">{t.unitPhotos}</span>
                                        </div>
                                    )}
                                    {index === 3 && allPhotos.length > 4 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="text-white text-lg font-bold">+{allPhotos.length - 4}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Pricing Summary */}
                {getAmount() > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-primary" />
                            <BodySmall lang={currentLanguage} className="font-semibold">{(t as Record<string, string>).pricingSummary || 'Pricing Summary'}</BodySmall>
                        </div>
                        <SoftCard className="p-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                        {t.laborCost}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium">
                                        {formatAmount(getAmount())}
                                    </Body>
                                </div>
                                <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                                    <BodySmall lang={currentLanguage} className="font-bold">
                                        {t.total}
                                    </BodySmall>
                                    <Heading3 lang={currentLanguage} className="text-primary font-bold">
                                        {formatAmount(getAmount())}
                                    </Heading3>
                                </div>
                            </div>
                        </SoftCard>
                    </motion.div>
                )}

                {/* Job Tracking Card (Hidden tracking, just actions) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <JobTrackingCard
                        jobId={job.id}
                        jobType="request"
                        title={currentLanguage === 'ar'
                            ? `حجز مع ${buyerProfile?.company_name || buyerProfile?.full_name || t.client}`
                            : `Request with ${buyerProfile?.company_name || buyerProfile?.full_name || t.client}`}
                        description={cleanDescription}
                        currentLanguage={currentLanguage}
                        userRole="seller"
                        status={canonicalJob.lifecycle}
                        sellerOnWayAt={(job as any).seller_on_way_at}
                        workStartedAt={(job as any).work_started_at}
                        sellerMarkedComplete={canonicalJob.completionState === 'seller_marked_complete' || canonicalJob.completionState === 'buyer_confirmed'}
                        buyerMarkedComplete={canonicalJob.completionState === 'buyer_confirmed'}
                        sellerId={(job as any).assigned_seller_id || (job as any).seller_id || user?.id || ''}
                        sellerName={sellerProfile?.company_name || sellerProfile?.full_name || ''}
                        date={(() => {
                            const startDate = getStartDate();
                            if (!startDate) return currentLanguage === 'ar' ? 'مرن' : 'Flexible';
                            return format(new Date(startDate), "EEE, d MMM", { locale: currentLanguage === 'ar' ? ar : enUS });
                        })()}
                        location={getLocation() || ''}
                        completionPhotos={completionPhotos.length > 0 ? completionPhotos : null}
                        hidePrimaryActions={true}
                    />
                </motion.div>
            </div>

            {/* Sticky Action Footer */}
            {canonicalJob.lifecycle !== 'closed' && canonicalJob.lifecycle !== 'cancelled' && canonicalJob.completionState !== 'buyer_confirmed' && (
                <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.3 }}
                    className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-safe-or-4 bg-background/90 backdrop-blur-xl border-t border-border/40 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
                >
                    <div className="max-w-md mx-auto w-full" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
                        {/* Status-based action buttons */}
                        {isWaitingForBuyer && !isBuyerPriceApproved ? (
                            /* Seller marked complete, waiting for buyer to approve price */
                            <div className="flex items-center gap-3 py-3.5 px-5 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                                <div className="relative flex-shrink-0">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40 animate-ping" />
                                    <span className="relative flex h-3 w-3 rounded-full bg-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <span className={cn(
                                        "font-semibold text-amber-700 dark:text-amber-400 text-sm block",
                                        currentLanguage === 'ar' && "font-ar-body"
                                    )}>
                                        {currentLanguage === 'ar' ? 'في انتظار موافقة العميل على السعر' : 'Waiting for buyer to approve price'}
                                    </span>
                                    <span className={cn(
                                        "text-xs text-amber-600/80 dark:text-amber-500/70 mt-0.5 block",
                                        currentLanguage === 'ar' && "font-ar-body"
                                    )}>
                                        {currentLanguage === 'ar' ? 'العميل سيرى تنبيه للموافقة' : 'The buyer will receive a prompt to approve'}
                                    </span>
                                </div>
                            </div>
                        ) : isWaitingForBuyer && isBuyerPriceApproved ? (
                            /* Buyer approved — seller enters the code shown on buyer's screen */
                            <motion.div
                                initial={{ scale: 0.97, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                            >
                                <Button
                                    onClick={() => setShowCompletionCodeModal(true)}
                                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-base font-semibold shadow-lg shadow-primary/30 gap-2"
                                >
                                    <QrCode size={20} />
                                    {currentLanguage === 'ar' ? "أدخل الرمز من شاشة العميل" : "Enter Code from Customer's Screen"}
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="flex gap-3">
                                {/* On My Way — shown when status is accepted */}
                                {canonicalJob.lifecycle === 'seller_assigned' && (
                                    <Button
                                        onClick={handleSellerOnWay}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-13 rounded-2xl gap-2"
                                        variant="outline"
                                    >
                                        {updateStatusMutation.isPending ? (
                                            <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                                        ) : (
                                            <Truck size={18} />
                                        )}
                                        {currentLanguage === 'ar' ? "في الطريق" : "On My Way"}
                                    </Button>
                                )}

                                {/* I Arrived — shown when status is en_route */}
                                {canonicalJob.lifecycle === 'in_route' && !(job as any).work_started_at && (
                                    <Button
                                        onClick={handleArrived}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 gap-2"
                                    >
                                        {updateStatusMutation.isPending ? (
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <MapPin size={18} />
                                        )}
                                        {currentLanguage === 'ar' ? "وصلت" : "I Arrived"}
                                    </Button>
                                )}

                                {/* Complete Job — shown when arrived or in_progress */}
                                {canonicalJob.lifecycle === 'in_progress' && !(job as any).seller_marked_complete && (
                                    <Button
                                        onClick={handleSellerMarkComplete}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-13 rounded-2xl shadow-md shadow-primary/20 gap-2"
                                    >
                                        {updateStatusMutation.isPending ? (
                                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <CheckCircle size={18} />
                                        )}
                                        {currentLanguage === 'ar' ? "إنهاء العمل" : "Complete Job"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <FinalPriceSheet
                isOpen={showFinalPriceSheet}
                onClose={() => setShowFinalPriceSheet(false)}
                onSubmit={handleFinalPriceSubmit}
                initialPrice={(job as any)?.budget || (job as any)?.estimated_budget_max || 0}
                currentLanguage={currentLanguage}
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
                requestId={id}
                currentLanguage={currentLanguage}
                onComplete={handleSellerPhotoProofComplete}
                userRole="seller"
            />

            {/* Photo Viewer Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X size={24} className="text-white" />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={selectedPhoto}
                            alt=""
                            className="max-w-full max-h-[85vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Issue Response Sheet */}
            {activeIssue && (
                <IssueResponseSheet
                    isOpen={showIssueResponse}
                    onClose={() => setShowIssueResponse(false)}
                    issue={activeIssue}
                    currentLanguage={currentLanguage}
                    onSuccess={() => {
                        refetchIssue();
                        setShowIssueResponse(false);
                    }}
                />
            )}
        </div>
    );
};
