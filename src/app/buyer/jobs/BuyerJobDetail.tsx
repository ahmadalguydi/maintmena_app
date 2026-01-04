import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SoftCard } from "@/components/mobile/SoftCard";
import { GradientHeader } from "@/components/mobile/GradientHeader";
import { Heading2, Heading3, Body, BodySmall, Label, Caption } from "@/components/mobile/Typography";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, MapPin, DollarSign, Clock, Calendar, User, Briefcase,
  MessageCircle, Phone, Star, CheckCircle,
  Truck, Play, Award, X, BadgeCheck
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

interface BuyerJobDetailProps {
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

export const BuyerJobDetail = ({ currentLanguage }: BuyerJobDetailProps) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const type = searchParams.get('type') || 'booking';
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const isRequest = type === 'request';

  const { data: job, isLoading } = useQuery({
    queryKey: ['buyer-job-detail', id, type],
    queryFn: async () => {
      if (type === 'request') {
        const { data: requestData } = await supabase
          .from('maintenance_requests')
          .select('*, contracts(*)')
          .eq('id', id)
          .maybeSingle();

        if (requestData) {
          let sellerProfile = null;
          let sellerId = requestData.assigned_seller_id;

          // If no assigned seller, try to get from accepted quote
          if (!sellerId) {
            const { data: acceptedQuote } = await supabase
              .from('quote_submissions')
              .select('seller_id')
              .eq('request_id', id)
              .eq('status', 'accepted')
              .maybeSingle();
            sellerId = acceptedQuote?.seller_id;
          }

          if (sellerId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sellerId)
              .maybeSingle();
            sellerProfile = profile;
          }
          return { ...requestData, profiles: sellerProfile, jobType: 'request', isRequest: true };
        }
      } else {
        const { data: bookingData } = await supabase
          .from('booking_requests')
          .select('*, contracts(*)')
          .eq('id', id)
          .maybeSingle();

        if (bookingData) {
          let sellerProfile = null;
          const sellerId = bookingData.seller_id;
          if (sellerId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sellerId)
              .maybeSingle();
            sellerProfile = profile;
          }
          return { ...bookingData, profiles: sellerProfile, jobType: 'booking', isRequest: false };
        }
      }
      return null;
    },
    enabled: !!id
  });

  const { data: acceptedQuote } = useQuery({
    queryKey: ['buyer-accepted-quote', id],
    queryFn: async () => {
      if (!job?.isRequest) return null;
      const { data } = await supabase
        .from('quote_submissions')
        .select('*')
        .eq('request_id', id)
        .eq('status', 'accepted')
        .maybeSingle();
      return data;
    },
    enabled: !!job?.isRequest
  });

  const content = {
    ar: {
      jobTitle: 'طلب',
      description: 'الوصف',
      client: 'أنت',
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
      signedPdf: 'موقع • PDF',
      jobParties: 'أطراف العمل'
    },
    en: {
      jobTitle: 'Job',
      description: 'Description',
      client: 'You',
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
      signedPdf: 'Signed • PDF',
      jobParties: 'Job Parties'
    }
  };

  const t = content[currentLanguage];

  // Calculate progress step
  const getProgressStep = () => {
    if (!job) return 0;
    const status = job.status;
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
    const displayCity = getLocalizedCity(city);
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
    const category = (job as any)?.category || (job as any)?.service_category || (job as any)?.title;
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
            onAction={() => navigate('/app/buyer/home')}
          />
        </div>
      </div>
    );
  }

  const sellerProfile = job.profiles as any;
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
    .replace(/Time Window: \w+/gi, '')
    .replace(/\n\nTime Window: \w+/gi, '')
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
        onBack={() => navigate('/app/buyer/home')}
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

        {/* Date & Location Cards */}
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

                if (timeSlot) {
                  const timeMap: Record<string, string> = {
                    morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
                    afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
                    evening: currentLanguage === 'ar' ? 'مساءً' : 'Evening'
                  };
                  return `${dateStr} • ${timeMap[timeSlot] || timeSlot}`;
                }

                // Fall back to time window based on hour
                const hours = date.getHours();
                const minutes = date.getMinutes();
                if (hours !== 0 || minutes !== 0) {
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
            {/* Service Badge */}
            <div className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-border/50 shadow-sm float-left mr-3 mb-1",
              currentLanguage === 'ar' ? 'flex-row-reverse' : ''
            )}>
              <span className="text-sm text-blue-500">{getCategoryIcon((job as any).category || (job as any).service_category)}</span>
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
            {t.jobParties}
          </BodySmall>

          {/* Service Provider */}
          <SoftCard
            className="p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => sellerProfile?.id && navigate(`/app/buyer/vendor/${sellerProfile.id}`)}
          >
            <div className={cn("flex items-start gap-3", currentLanguage === 'ar' ? 'flex-row-reverse' : '')}>
              <AvatarBadge
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sellerProfile?.id}`}
                fallback={(sellerProfile?.company_name || sellerProfile?.full_name || "S")[0]}
                size="md"
                className="border border-border/50 rounded-full"
              />
              <div className={cn("flex-1", currentLanguage === 'ar' ? 'text-right' : 'text-left')}>
                <div className={cn("flex items-center gap-2 mb-1", currentLanguage === 'ar' ? 'flex-row-reverse justify-end' : '')}>
                  <Heading3 lang={currentLanguage} className="leading-tight text-base">
                    {sellerProfile?.company_name || sellerProfile?.full_name || (currentLanguage === 'ar' ? 'مقدم الخدمة' : 'Service Provider')}
                  </Heading3>
                  {sellerProfile?.verified_seller && (
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
                  onClick={() => navigate(`/app/buyer/contract/${contract.id}`)}
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

        {/* Job Tracking Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <JobTrackingCard
            jobId={job.id}
            jobType={(job as any).jobType as 'booking' | 'request'}
            title={currentLanguage === 'ar'
              ? `حجز مع ${sellerProfile?.company_name || sellerProfile?.full_name || t.serviceProvider}`
              : `Booking with ${sellerProfile?.company_name || sellerProfile?.full_name || t.serviceProvider}`}
            description={cleanDescription}
            currentLanguage={currentLanguage}
            userRole="buyer"
            status={job.status}
            sellerOnWayAt={(job as any).seller_on_way_at}
            workStartedAt={(job as any).work_started_at}
            sellerMarkedComplete={(job as any).seller_marked_complete || false}
            buyerMarkedComplete={(job as any).buyer_marked_complete || false}
            sellerId={(job as any).assigned_seller_id || (job as any).seller_id}
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

      {/* Sticky Confirm Work Footer - Only shows when seller marked complete but buyer hasn't */}
      {(job as any).seller_marked_complete && !(job as any).buyer_marked_complete && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-lg border-t border-border/50">
          <div className="max-w-md mx-auto w-full">
            <Button
              onClick={async () => {
                try {
                  const table = isRequest ? 'maintenance_requests' : 'booking_requests';
                  const { error } = await supabase
                    .from(table)
                    .update({
                      buyer_marked_complete: true,
                      buyer_completion_date: new Date().toISOString(),
                      status: 'completed'
                    })
                    .eq('id', id);

                  if (error) throw error;

                  // Update contract if exists
                  if (contract?.id) {
                    await supabase
                      .from('contracts')
                      .update({ status: 'completed' })
                      .eq('id', contract.id);
                  }

                  toast.success(currentLanguage === 'ar' ? 'تم تأكيد إكتمال العمل' : 'Work confirmed as complete');

                  // Navigate to contract signing or review
                  if (contract?.id) {
                    navigate(`/app/buyer/contract/${contract.id}/sign`);
                  } else {
                    navigate(`/app/buyer/review/${id}?type=${type}&seller=${(job as any).assigned_seller_id || (job as any).seller_id}&contract=${contract?.id || ''}`);
                  }
                } catch (err) {
                  toast.error(currentLanguage === 'ar' ? 'حدث خطأ' : 'An error occurred');
                }
              }}
              className="w-full h-14 rounded-full bg-gradient-to-r from-green-600 to-green-500 text-white hover:opacity-90 font-semibold text-base"
            >
              <CheckCircle size={20} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
              {currentLanguage === 'ar' ? 'تأكيد اكتمال العمل' : 'Confirm Work Complete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
