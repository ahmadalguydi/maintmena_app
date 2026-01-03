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
    Truck, Play, Award, Image as ImageIcon, ExternalLink, BadgeCheck, X
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
import { AvatarBadge } from "@/components/mobile/AvatarBadge";
import { useState } from "react";

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
    icon: any;
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
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { formatAmount } = useCurrency();
    const type = searchParams.get('type') || 'booking';
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [showPhotoProof, setShowPhotoProof] = useState(false);
    const queryClient = useQueryClient();
    const isRequest = type === 'request';

    const { data: job, isLoading } = useQuery({
        queryKey: ['seller-job-detail', id, type],
        queryFn: async () => {
            if (type === 'request') {
                const { data: requestData } = await supabase
                    .from('maintenance_requests')
                    .select('*, contracts(*)')
                    .eq('id', id)
                    .maybeSingle();

                if (requestData) {
                    let buyerProfile = null;
                    const buyerId = requestData.buyer_id || (requestData as any).user_id;
                    if (buyerId) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id, full_name, company_name, avatar_seed, phone')
                            .eq('id', buyerId)
                            .maybeSingle(); // Changed to maybeSingle just in case
                        buyerProfile = profile;
                    }
                    return { ...requestData, profiles: buyerProfile, jobType: 'request', isRequest: true };
                }
            } else {
                const { data: bookingData } = await supabase
                    .from('booking_requests')
                    .select('*, contracts(*)')
                    .eq('id', id)
                    .maybeSingle();

                if (bookingData) {
                    let buyerProfile = null;
                    const buyerId = bookingData.buyer_id || (bookingData as any).user_id;
                    if (buyerId) {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('id, full_name, company_name, avatar_seed, phone')
                            .eq('id', buyerId)
                            .maybeSingle();
                        buyerProfile = profile;
                    }
                    return { ...bookingData, profiles: buyerProfile, jobType: 'booking', isRequest: false };
                }
            }
            return null;
        },
        enabled: !!id
    });

    const { data: acceptedQuote } = useQuery({
        queryKey: ['seller-quote', id],
        queryFn: async () => {
            if (!job?.isRequest) return null;
            const { data } = await supabase
                .from('quote_submissions')
                .select('*')
                .eq('request_id', id)
                .eq('seller_id', user?.id)
                .eq('status', 'accepted')
                .maybeSingle();
            return data;
        },
        enabled: !!job?.isRequest && !!user?.id
    });

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
            quoteSummary: 'Quote Summary',
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

    // Calculate progress step
    const getProgressStep = () => {
        if (!job) return 0;
        const status = job.status;
        // Debug logging
        console.log('[SellerJobDetail] Progress calculation:', {
            status,
            seller_marked_complete: (job as any).seller_marked_complete,
            buyer_marked_complete: (job as any).buyer_marked_complete,
            work_started_at: (job as any).work_started_at,
            seller_on_way_at: (job as any).seller_on_way_at
        });
        // If buyer has confirmed, all steps are complete
        if (status === 'completed' || (job as any).buyer_marked_complete) return 6; // All 5 steps completed
        // If seller marked complete, step 5 (Confirmed) is the current/active step
        if ((job as any).seller_marked_complete) return 5;
        if ((job as any).work_started_at) return 4;
        if ((job as any).seller_on_way_at) return 3;
        if (status === 'scheduled' || status === 'in_progress' || status === 'executed') return 2;
        return 1; // Pending/New
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
            address = (job as any).location;
            city = (job as any).city;
        } else {
            address = (job as any).location_address;
            city = (job as any).location_city;
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
        const contract = Array.isArray(job?.contracts) && job.contracts.length > 0 ? job.contracts[0] : null;
        return baseAmount || (contract as any)?.metadata?.final_price || acceptedQuote?.price || 0;
    };

    const getStartDate = () => {
        if (job?.isRequest) {
            return (job as any).preferred_start_date;
        } else {
            const sellerProposal = (job as any).seller_counter_proposal as any;
            return sellerProposal?.scheduled_date || (job as any).proposed_start_date;
        }
    };

    const getDuration = () => {
        if (job?.isRequest) {
            return (job as any).project_duration_days ? `${(job as any).project_duration_days} ${currentLanguage === 'ar' ? 'يوم' : 'Days'}` : null;
        }
        return acceptedQuote?.estimated_duration ? formatDuration(acceptedQuote.estimated_duration, currentLanguage) : null;
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

    const updateStatusMutation = useMutation({
        mutationFn: async (updateData: any) => {
            const table = isRequest ? "maintenance_requests" : "booking_requests";
            const { error } = await supabase.from(table).update(updateData).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [isRequest ? "request-detail" : "booking-detail", id] });
            queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
            queryClient.invalidateQueries({ queryKey: ["seller-home"] });
            queryClient.invalidateQueries({ queryKey: ["seller-active-jobs"] });
            toast.success(currentLanguage === 'ar' ? "تم تحديث الحالة بنجاح" : "Status updated successfully");
        },
        onError: () => {
            toast.error("Failed to update status");
        }
    });

    const handleSellerOnWay = () => {
        updateStatusMutation.mutate({ seller_on_way_at: new Date().toISOString() });
    };

    const handleStartWork = () => {
        updateStatusMutation.mutate({ work_started_at: new Date().toISOString() });
    };

    const handleSellerMarkComplete = () => {
        setShowPhotoProof(true);
    };

    const handleSellerPhotoProofComplete = async (photos: string[]) => {
        const table = isRequest ? "maintenance_requests" : "booking_requests";
        const { error } = await supabase
            .from(table)
            .update({
                seller_marked_complete: true,
                seller_completion_date: new Date().toISOString(),
                completion_photos: photos,
            })
            .eq("id", id);

        if (error) {
            toast.error("Failed to mark complete");
            return;
        }

        queryClient.invalidateQueries({ queryKey: ["seller-job-detail", id, type] });
        queryClient.invalidateQueries({ queryKey: ["seller-home"] });
        toast.success(currentLanguage === 'ar' ? "تم تحديث الحالة بنجاح" : "Status updated successfully");

        // Navigate to contract progress tracker to show celebration screen
        if (contract?.id) {
            navigate(`/app/seller/contract/${contract.id}/review`);
        }
    };

    // Helper to check if button should be hidden (waiting for buyer confirmation)
    const isWaitingForBuyer = (job as any)?.seller_marked_complete && !(job as any)?.buyer_marked_complete;

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

    if (!job) {
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

    // const isRequest = job.isRequest; // Removed redeclaration
    const buyerProfile = job.profiles as any;
    const contract = Array.isArray(job.contracts) && job.contracts.length > 0 ? job.contracts[0] : null;
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
        { icon: Calendar, label: t.scheduled },
        { icon: Truck, label: t.onWay },
        { icon: Play, label: t.started },
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
                                const sellerProposal = (job as any)?.seller_counter_proposal as any;
                                const contract = Array.isArray(job?.contracts) && job.contracts.length > 0 ? job.contracts[0] : null;
                                const contractMetadata = (contract as any)?.metadata;
                                // Check multiple field names for time preference
                                const timeSlot = sellerProposal?.time_preference || sellerProposal?.time_slot ||
                                    contractMetadata?.time_preference || contractMetadata?.time_slot ||
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
                                src={(sellerProfile as any)?.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                                fallback={(sellerProfile?.company_name || sellerProfile?.full_name || "S")[0]}
                                size="md"
                                className="border border-border/50 rounded-full"
                            />
                            <div className={cn("flex-1", currentLanguage === 'ar' ? 'text-right' : 'text-left')}>
                                <div className={cn("flex items-center gap-2 mb-1", currentLanguage === 'ar' ? 'flex-row-reverse justify-end' : '')}>
                                    <Heading3 lang={currentLanguage} className="leading-tight text-base">
                                        {sellerProfile?.company_name || sellerProfile?.full_name || (currentLanguage === 'ar' ? 'أنت' : 'You')}
                                    </Heading3>
                                    {(sellerProfile as any)?.is_seller_verified && (
                                        <BadgeCheck className="h-5 w-5 text-primary fill-primary/20 flex-shrink-0" />
                                    )}
                                </div>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground mb-2">
                                    {t.serviceProvider}
                                </BodySmall>
                                <div className={cn("flex items-center gap-3 flex-wrap", currentLanguage === 'ar' ? 'flex-row-reverse justify-end' : '')}>
                                    {(sellerProfile?.seller_rating || 0) > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                            <span className="text-sm font-semibold">{sellerProfile?.seller_rating?.toFixed(1)}</span>
                                        </div>
                                    )}
                                    {(sellerProfile?.completed_projects || 0) > 0 && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Briefcase size={14} />
                                            <Caption lang={currentLanguage}>{sellerProfile?.completed_projects} {t.jobs}</Caption>
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
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${buyerProfile?.avatar_seed || buyerProfile?.id}`}
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
                                        if (isRequest) {
                                            const quoteId = acceptedQuote?.id || contract?.quote_id;
                                            if (quoteId) navigate(`/app/messages/thread?quote=${quoteId}`);
                                        } else {
                                            navigate(`/app/messages/thread?booking=${id}`);
                                        }
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
                {(contract || allPhotos.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <BodySmall lang={currentLanguage} className="mb-2 font-semibold">{t.documents}</BodySmall>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {contract && (
                                <div
                                    onClick={() => navigate(`/app/seller/contract/${contract.id}`)}
                                    className="flex-shrink-0 w-36 h-32 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-2">
                                        <FileText size={20} className="text-primary" />
                                    </div>
                                    <BodySmall lang={currentLanguage} className="font-semibold text-center">
                                        {t.viewContract}
                                    </BodySmall>
                                    <span className="text-[10px] text-muted-foreground mt-1">{t.signedPdf}</span>
                                </div>
                            )}
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

                {/* Quote Summary */}
                {getAmount() > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <FileText size={18} className="text-primary" />
                            <BodySmall lang={currentLanguage} className="font-semibold">{t.quoteSummary}</BodySmall>
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
                        jobType={(job as any).jobType as 'booking' | 'request'}
                        title={currentLanguage === 'ar'
                            ? `حجز مع ${buyerProfile?.company_name || buyerProfile?.full_name || t.client}`
                            : `Booking with ${buyerProfile?.company_name || buyerProfile?.full_name || t.client}`}
                        description={cleanDescription}
                        currentLanguage={currentLanguage}
                        userRole="seller"
                        status={job.status}
                        sellerOnWayAt={(job as any).seller_on_way_at}
                        workStartedAt={(job as any).work_started_at}
                        sellerMarkedComplete={(job as any).seller_marked_complete || false}
                        buyerMarkedComplete={(job as any).buyer_marked_complete || false}
                        sellerId={(job as any).assigned_seller_id || (job as any).seller_id || user?.id}
                        sellerName={sellerProfile?.company_name || sellerProfile?.full_name}
                        date={(() => {
                            const startDate = getStartDate();
                            if (!startDate) return currentLanguage === 'ar' ? 'مرن' : 'Flexible';
                            return format(new Date(startDate), "EEE, d MMM", { locale: currentLanguage === 'ar' ? ar : enUS });
                        })()}
                        location={getLocation() || ''}
                        contractId={contract?.id}
                        completionPhotos={completionPhotos.length > 0 ? completionPhotos : null}
                        hidePrimaryActions={true}
                    />
                </motion.div>
            </div>

            {/* Sticky Action Footer */}
            {job.status !== 'completed' && !(job as any).buyer_marked_complete && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-border/50">
                    <div className="max-w-md mx-auto w-full">
                        {/* Waiting for buyer confirmation status */}
                        {isWaitingForBuyer ? (
                            <div className="flex items-center justify-center gap-2 py-2">
                                <Clock size={18} className="text-amber-600 animate-pulse" />
                                <span className={cn(
                                    "font-semibold text-amber-700",
                                    currentLanguage === 'ar' && "font-ar-body"
                                )}>
                                    {currentLanguage === 'ar' ? 'في انتظار تأكيد المشتري' : 'Awaiting Buyer Confirmation'}
                                </span>
                            </div>
                        ) : (
                            <div className="flex gap-3">
                                {!(job as any).seller_on_way_at && (
                                    <Button
                                        onClick={handleSellerOnWay}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-12 rounded-full"
                                        variant="outline"
                                    >
                                        <Truck size={18} className="mr-2" />
                                        {currentLanguage === 'ar' ? "في الطريق" : "On My Way"}
                                    </Button>
                                )}

                                {(job as any).seller_on_way_at && !(job as any).work_started_at && (
                                    <Button
                                        onClick={handleStartWork}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-12 rounded-full"
                                    >
                                        <Play size={18} className="mr-2" />
                                        {currentLanguage === 'ar' ? "بدأ العمل" : "Start Work"}
                                    </Button>
                                )}

                                {(job as any).work_started_at && !(job as any).seller_marked_complete && (
                                    <Button
                                        onClick={handleSellerMarkComplete}
                                        disabled={updateStatusMutation.isPending}
                                        className="flex-1 h-12 rounded-full"
                                    >
                                        <CheckCircle size={18} className="mr-2" />
                                        {currentLanguage === 'ar' ? "تحديد كمكتمل" : "Mark Complete"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <PhotoProofModal
                isOpen={showPhotoProof}
                onClose={() => setShowPhotoProof(false)}
                bookingId={!isRequest ? id : undefined}
                requestId={isRequest ? id : undefined}
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
        </div>
    );
};
