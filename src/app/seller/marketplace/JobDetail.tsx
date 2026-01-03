import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SoftCard } from '@/components/mobile/SoftCard';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { StatusPill } from '@/components/mobile/StatusPill';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { MapPin, Calendar, DollarSign, Clock, Send, Image as ImageIcon, Wrench, Sun, Moon, Sunrise, AlertTriangle, Users, ChevronRight } from 'lucide-react';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';
import { getAllCategories } from '@/lib/serviceCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { format, formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface JobDetailProps {
  currentLanguage: 'en' | 'ar';
}

export const JobDetail = ({ currentLanguage }: JobDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const isArabic = currentLanguage === 'ar';

  const { data: job, isLoading } = useQuery({
    queryKey: ['job-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, quote_submissions(count), request_quote_templates(*)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const content = {
    en: {
      title: 'Job Details',
      description: 'Description',
      location: 'Location',
      budget: 'Budget Range',
      preferredDate: 'Preferred Date',
      timePreference: 'Time Preference',
      urgency: 'Urgency',
      quotesReceived: 'Quotes Received',
      sendQuote: 'Submit Your Quote',
      urgent: 'Urgent',
      normal: 'Normal',
      flexible: 'Flexible',
      category: 'Service Category',
      postedAgo: 'Posted',
      noQuotesYet: 'Be the first to quote!',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      flexibleTime: 'Any Time',
      flexibleDate: 'Date is Flexible',
      asap: 'As soon as possible',
      viewOnMap: 'View on Map',
      clientPhotos: 'Documents',
      noPhotos: 'No photos attached',
      competitionLow: 'Low competition - good opportunity!',
      competitionMedium: 'Some quotes submitted',
      competitionHigh: 'High competition'
    },
    ar: {
      title: 'تفاصيل الطلب',
      description: 'الوصف',
      location: 'الموقع',
      budget: 'الميزانية',
      preferredDate: 'التاريخ المفضل',
      timePreference: 'الوقت المفضل',
      urgency: 'الأولوية',
      quotesReceived: 'العروض المستلمة',
      sendQuote: 'أرسل عرضك',
      urgent: 'عاجل',
      normal: 'عادي',
      flexible: 'مرن',
      category: 'نوع الخدمة',
      postedAgo: 'تم النشر',
      noQuotesYet: 'كن أول من يقدم عرضاً!',
      morning: 'صباحاً',
      afternoon: 'ظهراً',
      evening: 'مساءً',
      flexibleTime: 'أي وقت',
      flexibleDate: 'التاريخ مرن',
      asap: 'في أقرب وقت ممكن',
      viewOnMap: 'عرض على الخريطة',
      clientPhotos: 'المستندات',
      noPhotos: 'لا توجد صور مرفقة',
      competitionLow: 'منافسة منخفضة - فرصة جيدة!',
      competitionMedium: 'بعض العروض مقدمة',
      competitionHigh: 'منافسة عالية'
    }
  };

  const t = content[currentLanguage];
  const allCategories = getAllCategories();

  // Helper functions
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return { status: 'error' as const, label: t.urgent, color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle };
      case 'normal':
        return { status: 'warning' as const, label: t.normal, color: 'text-yellow-600', bg: 'bg-yellow-500/10', icon: Clock };
      default:
        return { status: 'success' as const, label: t.flexible, color: 'text-green-600', bg: 'bg-green-500/10', icon: Clock };
    }
  };

  const getTimeWindowConfig = (desc: string, timeWindowField?: string, startDate?: string | null) => {
    // First check the time_window field directly
    if (timeWindowField) {
      const slot = timeWindowField.toLowerCase();
      if (slot === 'morning') return { label: t.morning, icon: Sunrise, emoji: '☀️' };
      if (slot === 'afternoon') return { label: t.afternoon, icon: Sun, emoji: '⛅' };
      if (slot === 'evening' || slot === 'night') return { label: t.evening, icon: Moon, emoji: '🌙' };
    }

    // Check for flexible time marker
    if (desc?.includes('[Flexible Time]') || desc?.includes('[وقت مرن]')) {
      return { label: t.flexibleTime, icon: Clock, emoji: '🕐' };
    }

    // Parse "Time Window: <value>" from description
    const timeWindowMatch = desc?.match(/Time Window:\s*(\w+)/i);
    if (timeWindowMatch) {
      const slot = timeWindowMatch[1].toLowerCase();
      if (slot === 'morning') return { label: t.morning, icon: Sunrise, emoji: '☀️' };
      if (slot === 'afternoon') return { label: t.afternoon, icon: Sun, emoji: '⛅' };
      if (slot === 'evening' || slot === 'night') return { label: t.evening, icon: Moon, emoji: '🌙' };
    }

    // Fall back to checking bare keywords in description
    if (desc?.includes('morning')) return { label: t.morning, icon: Sunrise, emoji: '☀️' };
    if (desc?.includes('afternoon')) return { label: t.afternoon, icon: Sun, emoji: '⛅' };
    if (desc?.includes('evening')) return { label: t.evening, icon: Moon, emoji: '🌙' };

    // Final fallback: extract from hours of preferred_start_date
    if (startDate) {
      const date = new Date(startDate);
      const hours = date.getHours();
      if (hours >= 5 && hours < 12) return { label: t.morning, icon: Sunrise, emoji: '☀️' };
      if (hours >= 12 && hours < 17) return { label: t.afternoon, icon: Sun, emoji: '⛅' };
      if (hours >= 17 || hours < 5) return { label: t.evening, icon: Moon, emoji: '🌙' };
    }

    return null;
  };

  const getCleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc
      .split(/(?:Preferred Date:|Time Window:)/i)[0]
      .replace(/\s?\[Flexible Date\]/g, '')
      .replace(/\s?\[Flexible Time\]/g, '')
      .replace(/\s?\[تاريخ مرن\]/g, '')
      .replace(/\s?\[وقت مرن\]/g, '')
      .replace(/Time Window: \w+/gi, '')
      .trim();
  };

  const getCityDisplay = (city: string) => {
    if (!city) return '-';
    const cityData = SAUDI_CITIES_BILINGUAL.find(c =>
      c.en.toLowerCase() === city.toLowerCase() || c.ar === city
    );
    return isArabic ? (cityData?.ar || city) : (cityData?.en || city);
  };

  const getQuoteCount = () => {
    return job?.quote_submissions?.[0]?.count || 0;
  };

  const getCompetitionMessage = (count: number) => {
    if (count === 0) return t.noQuotesYet;
    if (count <= 2) return t.competitionLow;
    if (count <= 5) return t.competitionMedium;
    return t.competitionHigh;
  };

  if (isLoading) {
    return (
      <div className="pb-20 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />
        <div className="px-5 py-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pb-20 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />
        <div className="px-6 py-20 text-center">
          <p className="text-muted-foreground">Job not found</p>
        </div>
      </div>
    );
  }

  const category = allCategories.find(c => c.key === job.category);
  const urgencyConfig = getUrgencyConfig(job.urgency);
  const timeWindow = getTimeWindowConfig(job.description, (job as any).time_window, job.preferred_start_date);
  const quoteCount = getQuoteCount();
  const hasFlexibleDate = job.description?.includes('[Flexible Date]') || job.description?.includes('[تاريخ مرن]');
  const photos = (job as any).photos as string[] | null;

  return (
    <div className="pb-32 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

      <div className="px-5 py-5 space-y-4">
        {/* Hero Card - Title, Category & Urgency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SoftCard className="space-y-4">
            {/* Category & Urgency Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{category?.icon || '🔧'}</span>
                <span className={cn(
                  "text-sm font-medium",
                  isArabic ? "font-ar-body" : "font-body"
                )}>
                  {isArabic ? category?.ar : category?.en}
                </span>
              </div>
              <StatusPill
                status={urgencyConfig.status}
                label={urgencyConfig.label}
              />
            </div>

            {/* Title */}
            <h1 className={cn(
              "text-xl font-bold leading-tight",
              isArabic ? "font-ar-display" : "font-display"
            )}>
              {isArabic && job.title_ar ? job.title_ar : job.title}
            </h1>

            {/* Posted Time */}
            <p className="text-xs text-muted-foreground">
              {t.postedAgo} {formatDistanceToNow(new Date(job.created_at), {
                addSuffix: true,
                locale: isArabic ? ar : enUS
              })}
            </p>
          </SoftCard>
        </motion.div>

        {/* Key Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Budget */}
          <SoftCard className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-xs">{t.budget}</span>
            </div>
            <p className={cn(
              "font-semibold text-sm",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {job.estimated_budget_min && job.estimated_budget_max
                ? `${formatAmount(job.estimated_budget_min)} - ${formatAmount(job.estimated_budget_max)}`
                : job.budget
                  ? formatAmount(job.budget)
                  : '-'
              }
            </p>
          </SoftCard>

          {/* Location */}
          <SoftCard className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-xs">{t.location}</span>
            </div>
            <p className={cn(
              "font-semibold text-sm",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {getCityDisplay(job.city || job.location)}
            </p>
          </SoftCard>

          {/* Date */}
          <SoftCard className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-xs">{t.preferredDate}</span>
            </div>
            <p className={cn(
              "font-semibold text-sm",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {hasFlexibleDate
                ? t.flexibleDate
                : job.preferred_start_date
                  ? format(new Date(job.preferred_start_date), 'MMM d, yyyy', { locale: isArabic ? ar : enUS })
                  : t.asap
              }
            </p>
          </SoftCard>

          {/* Time */}
          <SoftCard className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xs">{t.timePreference}</span>
            </div>
            <p className={cn(
              "font-semibold text-sm flex items-center gap-1",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {timeWindow ? (
                <>
                  <span>{timeWindow.emoji}</span>
                  <span>{timeWindow.label}</span>
                </>
              ) : (
                t.flexibleTime
              )}
            </p>
          </SoftCard>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <SoftCard className="space-y-3">
            <h3 className={cn(
              "font-semibold text-base",
              isArabic ? "font-ar-display" : "font-display"
            )}>
              {t.description}
            </h3>
            <p className={cn(
              "text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {getCleanDescription(isArabic && job.description_ar ? job.description_ar : job.description)}
            </p>
          </SoftCard>
        </motion.div>

        {/* Photos */}
        {photos && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <SoftCard className="space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                <h3 className={cn(
                  "font-semibold text-base",
                  isArabic ? "font-ar-display" : "font-display"
                )}>
                  {t.clientPhotos}
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {photos.map((photo, index) => (
                  <a
                    key={index}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 group"
                  >
                    <img
                      src={photo}
                      alt={`Photo ${index + 1}`}
                      className="w-28 h-28 object-cover rounded-2xl border-2 border-border group-hover:border-primary transition-colors shadow-sm"
                    />
                  </a>
                ))}
              </div>
            </SoftCard>
          </motion.div>
        )}

        {/* Competition Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SoftCard className={cn(
            "border-2",
            quoteCount === 0 ? "border-green-200 bg-green-50/50" : "border-yellow-200 bg-yellow-50/50"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-12 rounded-full flex items-center justify-center",
                  quoteCount === 0 ? "bg-green-500/20" : "bg-yellow-500/20"
                )}>
                  <Users className={cn(
                    "w-6 h-6",
                    quoteCount === 0 ? "text-green-600" : "text-yellow-600"
                  )} />
                </div>
                <div>
                  <p className={cn(
                    "text-2xl font-bold",
                    quoteCount === 0 ? "text-green-600" : "text-yellow-600"
                  )}>
                    {quoteCount}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.quotesReceived}</p>
                </div>
              </div>
              <p className={cn(
                "text-xs max-w-[120px] text-end",
                quoteCount === 0 ? "text-green-600" : "text-yellow-700",
                isArabic ? "font-ar-body" : "font-body"
              )}>
                {getCompetitionMessage(quoteCount)}
              </p>
            </div>
          </SoftCard>
        </motion.div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/app/seller/job/${id}/quote`)}
          className="w-full h-14 flex items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary via-primary to-accent text-white font-semibold shadow-lg"
        >
          <Send className="w-5 h-5" />
          <span className={cn(
            "text-base",
            isArabic ? "font-ar-display" : "font-display"
          )}>
            {t.sendQuote}
          </span>
          <ChevronRight className={cn("w-5 h-5", isArabic && "rotate-180")} />
        </motion.button>
      </div>
    </div>
  );
};
