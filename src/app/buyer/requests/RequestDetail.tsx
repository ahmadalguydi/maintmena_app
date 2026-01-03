import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Calendar, DollarSign, FileText, Edit2, Check, RefreshCw, CalendarClock, ShieldCheck, Eye, Trash2, Sun, Moon, Clock, FileEdit, User, Star, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { QuoteTemplateManager } from '@/components/QuoteTemplateManager';
import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { cn } from '@/lib/utils';

import { useJourneyProgress } from '@/hooks/useJourneyProgress';
import { SAUDI_CITIES_BILINGUAL } from '@/lib/saudiCities';

interface RequestDetailProps {
  currentLanguage: 'en' | 'ar';
}

const SERVICE_CATEGORIES = [
  { key: "plumbing", icon: "🚰", en: "Plumbing", ar: "سباكة", enabled: true },
  { key: "electrical", icon: "⚡", en: "Electrical", ar: "كهرباء", enabled: true },
  { key: "painting", icon: "🎨", en: "Painting", ar: "دهان", enabled: true },
  { key: "ac_repair", icon: "❄️", en: "AC Repair", ar: "إصلاح التكييف", enabled: false },
  { key: "cleaning", icon: "🧹", en: "Cleaning", ar: "تنظيف", enabled: false },
  { key: "handyman", icon: "🔧", en: "Handyman", ar: "عامل متعدد المهارات", enabled: false },
];

export const RequestDetail = ({ currentLanguage }: RequestDetailProps) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = currentLanguage === 'ar';
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showJourneyOverlay, setShowJourneyOverlay] = useState(true);

  const { data: request, isLoading } = useQuery({
    queryKey: ['request-detail', id],
    queryFn: async () => {
      const { data: requestData, error: requestError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          quote_submissions (*)
        `)
        .eq('id', id)
        .single();

      if (requestError) throw requestError;

      if (requestData.quote_submissions && requestData.quote_submissions.length > 0) {
        const sellerIds = requestData.quote_submissions.map((q: any) => q.seller_id);

        // Use select("*") like BuyerExplore to avoid RLS field restrictions
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', sellerIds);

        if (profilesError) {
          console.error('[RequestDetail] Error fetching seller profiles:', profilesError);
        }

        if (profiles && profiles.length > 0) {
          requestData.quote_submissions = requestData.quote_submissions.map((q: any) => ({
            ...q,
            seller: profiles.find((p: any) => p.id === q.seller_id)
          }));
        }
      }

      console.log('[RequestDetail] Request data photos:', (requestData as any).photos);
      return requestData;
    },
    enabled: !!id
  });

  const { data: requestContract } = useQuery({
    queryKey: ['request-contract', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('request_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  const journeyProgress = useJourneyProgress({
    flowType: 'quote',
    role: 'buyer',
    entityId: id || '',
    entityTable: 'maintenance_requests',
    requestStatus: request?.status,
    quoteStatus: request?.quote_submissions?.find((q: any) => q.status === 'accepted')?.status,
    contractStatus: requestContract?.status,
    buyerSigned: !!requestContract?.signed_at_buyer,
    sellerSigned: !!requestContract?.signed_at_seller,
    lastSeenStage: request?.buyer_last_seen_stage ?? null,
  });

  const content = {
    en: {
      title: 'Request Details',
      description: 'Description',
      location: 'Location',
      budget: 'Budget',
      status: 'Status',
      quotes: 'Quotes',
      viewQuote: 'View',
      acceptOffer: 'Accept',
      edit: 'Edit',
      cancel: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this request?',
      requestDeleted: 'Request deleted',
      noQuotes: 'No offers yet',
      waitingForQuotes: 'Waiting for service providers...',
      posted: 'Posted',
      receiving: 'Receiving',
      fixed: 'Booked',
      done: 'Done',
      asap: 'ASAP',
      date: 'Date',
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      fastResponse: 'Fast Response',
      serviceProvider: 'Service Provider',
      jobs: 'jobs',
      estimatedCost: 'Price',
      availability: 'Start Date',
      days: 'days',
      sar: 'SAR',
      noReviews: "No reviews",
      oneQuoteOnly: "One quote at a time"
    },
    ar: {
      title: 'تفاصيل الطلب',
      description: 'الوصف',
      location: 'الموقع',
      budget: 'الميزانية',
      status: 'الحالة',
      quotes: 'عروض',
      viewQuote: 'عرض',
      acceptOffer: 'قبول',
      edit: 'تعديل',
      cancel: 'حذف',
      deleteConfirm: 'هل أنت متأكد من حذف هذا الطلب؟',
      requestDeleted: 'تم حذف الطلب',
      noQuotes: 'لا توجد عروض بعد',
      waitingForQuotes: 'في انتظار استجابة مقدمي الخدمات',
      posted: 'منشور',
      receiving: 'استقبال',
      fixed: 'محجوز',
      done: 'مكتمل',
      asap: 'في أقرب وقت',
      date: 'التاريخ',
      morning: 'صباحاً',
      afternoon: 'ظهراً',
      evening: 'مساءً',
      fastResponse: 'رد سريع',
      serviceProvider: 'مقدم خدمة',
      jobs: 'مهمة',
      estimatedCost: 'السعر',
      availability: 'تاريخ البدء',
      days: 'أيام',
      sar: 'ر.س',
      noReviews: "لا يوجد تقييمات",
      oneQuoteOnly: "يمكن قبول عرض واحد فقط"
    }
  };

  const t = content[currentLanguage];

  const getCategoryBadge = (categoryKey: string) => {
    const key = categoryKey?.toLowerCase();
    const cat = SERVICE_CATEGORIES.find(c => c.key === key);
    if (!cat) return null;
    return (
      <Badge variant="outline" className={cn(
        "gap-1.5 py-1.5 px-3 rounded-full shrink-0 bg-background border-border",
        isArabic ? "font-ar-body" : "font-body"
      )}>
        {isArabic ? (
          <>
            <span>{cat.ar}</span>
            <span className="text-base leading-none">{cat.icon}</span>
          </>
        ) : (
          <>
            <span className="text-base leading-none">{cat.icon}</span>
            <span>{cat.en}</span>
          </>
        )}
      </Badge>
    );
  };

  const getCleanDescription = (desc: string) => {
    if (!desc) return '';
    return desc
      .split(/(?:Preferred Date:|Time Window:)/i)[0]
      .replace(/\n\n\[Flexible Date\]/g, '')
      .replace(/\n\n\[Flexible Time\]/g, '')
      .replace(/\n\n\[تاريخ مرن\]/g, '')
      .replace(/\n\n\[وقت مرن\]/g, '')
      .replace(/\s?\[Flexible Date\]/g, '')
      .replace(/\s?\[Flexible Time\]/g, '')
      .replace(/\s?\[تاريخ مرن\]/g, '')
      .replace(/\s?\[وقت مرن\]/g, '')
      .trim();
  };

  const getDateInfo = () => {
    let dateToUse: Date | null = null;
    let timeStr = '';
    let TimeIcon = null;
    let isFlexibleTime = false;

    // Check for [Flexible Time] marker
    if (request?.description && request.description.includes('[Flexible Time]')) {
      isFlexibleTime = true;
    }

    if (request?.preferred_start_date) {
      dateToUse = new Date(request.preferred_start_date);
    } else if (request?.description) {
      const dateMatch = request.description.match(/Preferred Date: ([\w\s\(\)\-]+)/i);
      if (dateMatch && dateMatch[1]) {
        const dateText = dateMatch[1].trim();
        if (dateText.toLowerCase().includes('asap') || dateText.toLowerCase().includes('flexible')) {
          // ASAP - still need to get time from Time Window marker
        } else {
          const parsed = new Date(dateText);
          if (!isNaN(parsed.getTime())) {
            dateToUse = parsed;
          }
        }
      }
    }

    // Always try to get time from Time Window marker (for ASAP/flexible date cases)
    if (request?.description && !isFlexibleTime) {
      const timeMatch = request.description.match(/Time Window: (\w+)/i);
      if (timeMatch && timeMatch[1]) {
        const window = timeMatch[1].toLowerCase();
        if (window === 'morning') { timeStr = t.morning; TimeIcon = Sun; }
        else if (window === 'afternoon') { timeStr = t.afternoon; TimeIcon = Sun; }
        else if (window === 'evening') { timeStr = t.evening; TimeIcon = Moon; }
      }
    }

    // If flexible time, don't show time
    if (isFlexibleTime) {
      timeStr = '';
      TimeIcon = null;
    }

    if (!dateToUse) {
      // Return ASAP for date, but keep any parsed time
      return { dateStr: t.asap, timeStr, TimeIcon };
    }

    const dateStr = format(dateToUse, 'dd MMM', { locale: isArabic ? ar : enUS });

    // If no time from marker, extract from date hours
    if (!timeStr && !isFlexibleTime) {
      const hours = dateToUse.getHours();
      if (hours >= 5 && hours < 12) {
        timeStr = t.morning;
        TimeIcon = Sun;
      } else if (hours >= 12 && hours < 17) {
        timeStr = t.afternoon;
        TimeIcon = Sun;
      } else {
        timeStr = t.evening;
        TimeIcon = Moon;
      }
    }

    return { dateStr, timeStr, TimeIcon };
  };

  const { dateStr, timeStr, TimeIcon } = getDateInfo();

  const getBudgetDisplay = () => {
    if (request?.estimated_budget_min && request?.estimated_budget_max) {
      return `${request.estimated_budget_min} - ${request.estimated_budget_max}`;
    }
    return request?.estimated_budget_min || request?.budget || '-';
  };

  const getQuoteStartDate = (quote: any) => {
    if (quote.start_date) return quote.start_date;
    const matches = [...(quote.proposal || '').matchAll(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/g)];
    return matches.length > 0 ? matches[matches.length - 1][1] : null;
  };

  const formatRelativeDate = (dateString: string) => {
    if (!dateString) return t.asap;

    const date = new Date(dateString);
    const today = new Date();

    const d1 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (d1.getTime() === d2.getTime()) {
      return `${isArabic ? 'اليوم' : 'Today'}`;
    }

    const tomorrow = new Date(d2);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d1.getTime() === tomorrow.getTime()) {
      return `${isArabic ? 'غداً' : 'Tomorrow'}`;
    }

    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7 && d1 > d2) {
      return format(date, 'EEE', { locale: isArabic ? ar : enUS });
    }

    if (date.getFullYear() === today.getFullYear()) {
      return format(date, 'MMMM d', { locale: isArabic ? ar : enUS });
    }

    return format(date, 'MMMM d, yyyy', { locale: isArabic ? ar : enUS });
  };

  const getProgressStep = () => {
    if (request?.status === 'completed') return 4;
    if (request?.status === 'in_progress') return 3;
    if ((request?.quote_submissions?.length || 0) > 0) return 2;
    return 1;
  };

  const currentStep = getProgressStep();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-28" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} showBack onBack={() => navigate('/app/buyer/requests')} />
        <div className="px-6 py-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!request) return null;

  const steps = [
    { label: t.posted, icon: Check },
    { label: t.receiving, icon: RefreshCw },
    { label: t.fixed, icon: CalendarClock },
    { label: t.done, icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-background pb-28" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        showBack
        onBack={() => navigate('/app/buyer/requests')}
      />

      <div className="px-6 py-6 space-y-6">
        {/* Progress Tracker */}
        <div className="py-4">
          <div className="relative flex justify-between items-start w-full max-w-xs mx-auto">
            {/* Connector Line Background */}
            <div className="absolute top-4 inset-inline-start-0 w-full h-0.5 bg-border rounded-full" />
            {/* Connector Line Progress */}
            <div
              className="absolute top-4 inset-inline-start-0 h-0.5 bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index + 1 <= currentStep;
              const isCurrent = index + 1 === currentStep;

              return (
                <div key={index} className="flex flex-col items-center z-10">
                  <div className={cn(
                    "size-8 rounded-full flex items-center justify-center transition-all duration-300 bg-background",
                    isCompleted
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-muted-foreground",
                    isCurrent && "ring-4 ring-primary/20"
                  )}>
                    <StepIcon className={cn(
                      "w-4 h-4",
                      isCurrent && index === 1 && "animate-spin"
                    )} />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center mt-2 w-16",
                      isCompleted ? "text-primary" : "text-muted-foreground",
                      isArabic ? "font-ar-body" : "font-body"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Request Info Card */}
        <SoftCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className={cn(
              "text-xl font-bold text-foreground leading-tight flex-1",
              isArabic ? "font-ar-display" : "font-display"
            )}>
              {isArabic && request.title_ar ? request.title_ar : request.title}
            </h2>
            {getCategoryBadge(request.category) || (
              <Badge variant="secondary" className="shrink-0">
                {request.category}
              </Badge>
            )}
          </div>

          <p className={cn(
            "text-sm text-muted-foreground leading-relaxed",
            isArabic ? "font-ar-body" : "font-body"
          )}>
            {getCleanDescription(isArabic && request.description_ar ? request.description_ar : request.description)}
          </p>

          {/* Budget - Top row */}
          <div className="flex items-center gap-2 text-sm pt-2">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className={cn("text-foreground font-semibold", isArabic ? "font-ar-body" : "font-body")}>
              {t.sar} {getBudgetDisplay()}
            </span>
          </div>

          {/* Location and Date - Second row */}
          <div className="flex items-center gap-4 pt-2">
            {/* Location */}
            <div className="flex items-center gap-2 text-sm">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <span className={cn("text-foreground", isArabic ? "font-ar-body" : "font-body")}>
                {request.city ? (
                  isArabic
                    ? SAUDI_CITIES_BILINGUAL.find(c => c.en.toLowerCase() === request.city.toLowerCase())?.ar || request.city
                    : request.city
                ) : request.location}
              </span>
            </div>

            {/* Date with time window emoji */}
            <div className="flex items-center gap-2 text-sm">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <span className={cn("text-foreground", isArabic ? "font-ar-body" : "font-body")}>
                {dateStr}
                {timeStr && (
                  <span className="text-muted-foreground ms-1">
                    • {timeStr} {TimeIcon === Sun ? '☀️' : TimeIcon === Moon ? '🌙' : ''}
                  </span>
                )}
              </span>
            </div>
          </div>
        </SoftCard>

        {/* Photos Gallery */}
        {(request as any).photos && ((request as any).photos as string[])?.length > 0 && (
          <SoftCard className="space-y-3">
            <h3 className={cn(
              "text-lg font-semibold text-foreground",
              isArabic ? "font-ar-display" : "font-display"
            )}>
              {isArabic ? 'الصور' : 'Photos'}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {((request as any).photos as string[]).map((photo: string, index: number) => (
                <a
                  key={index}
                  href={photo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-xl border border-border hover:opacity-80 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </SoftCard>
        )}

        {/* Quotes Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={cn(
              "text-lg font-semibold text-foreground",
              isArabic ? "font-ar-display" : "font-display"
            )}>
              {request.quote_submissions?.filter((q: any) => q.status !== 'rejected').length || 0} {t.quotes}
            </h3>
            <div className="flex items-center gap-2">
              {requestContract && ['pending_seller', 'pending_buyer', 'executed'].includes(requestContract.status) && (
                <span className={cn("text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full", isArabic ? "font-ar-body" : "font-body")}>
                  {t.oneQuoteOnly}
                </span>
              )}
              {request.status === 'open' && request.quote_submissions?.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {isArabic ? 'نشط' : 'Active'}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {request.quote_submissions && request.quote_submissions.filter((q: any) => q.status !== 'rejected').length > 0 ? (
              request.quote_submissions.filter((q: any) => q.status !== 'rejected').map((quote: any, index: number) => {
                const startDateVal = getQuoteStartDate(quote);

                return (
                  <motion.div
                    key={quote.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SoftCard className="space-y-4">
                      {/* Provider Info */}
                      <div className="flex items-center gap-3">
                        {quote.seller?.avatar_url ? (
                          <img
                            src={quote.seller.avatar_url}
                            alt=""
                            className="size-12 rounded-full object-cover bg-muted"
                          />
                        ) : (
                          <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${quote.seller?.avatar_seed || quote.seller_id || quote.id}`}
                            alt=""
                            className="size-12 rounded-full object-cover bg-muted"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-semibold text-foreground truncate",
                            isArabic ? "font-ar-body" : "font-body"
                          )}>
                            {quote.seller?.company_name || quote.seller?.full_name || t.serviceProvider}
                          </p>
                          {quote.seller?.seller_rating ? (
                            <div className="flex items-center gap-1 text-sm bg-yellow-500/10 px-2 py-0.5 rounded-full">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              <span className="font-medium text-yellow-700 dark:text-yellow-400">{quote.seller.seller_rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{t.noReviews}</span>
                          )}
                        </div>
                      </div>

                      {/* Price and Date */}
                      <div className="flex items-center justify-between bg-muted/30 rounded-2xl p-4">
                        <div>
                          <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
                            {t.estimatedCost}
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {quote.price} <span className="text-sm">{t.sar}</span>
                          </p>
                        </div>
                        <div className="text-end">
                          <p className={cn("text-xs text-muted-foreground", isArabic ? "font-ar-body" : "font-body")}>
                            {t.availability}
                          </p>
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{startDateVal ? formatRelativeDate(startDateVal) : t.asap}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(`/app/buyer/quote/${quote.id}`)}
                          className={cn(
                            "flex-1 h-11 rounded-full bg-muted text-foreground font-medium text-sm flex items-center justify-center gap-2 transition-colors",
                            isArabic ? "font-ar-body" : "font-body"
                          )}
                        >
                          <Eye className="w-4 h-4" />
                          {t.viewQuote}
                        </motion.button>
                        {quote.status !== 'accepted' && !requestContract && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/app/buyer/quote/${quote.id}`)}
                            className={cn(
                              "flex-1 h-11 rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2",
                              isArabic ? "font-ar-body" : "font-body"
                            )}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {t.acceptOffer}
                          </motion.button>
                        )}
                      </div>
                    </SoftCard>
                  </motion.div>
                );
              })
            ) : (
              <SoftCard className="py-12 text-center">
                <FileEdit className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className={cn(
                  "text-foreground font-semibold mb-1",
                  isArabic ? "font-ar-display" : "font-display"
                )}>
                  {t.noQuotes}
                </h3>
                <p className={cn(
                  "text-muted-foreground text-sm",
                  isArabic ? "font-ar-body" : "font-body"
                )}>
                  {t.waitingForQuotes}
                </p>
              </SoftCard>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-background/95 backdrop-blur-md border-t border-border z-[101]">
        {request.status === 'open' ? (
          <div className="w-full max-w-md mx-auto flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={async () => {
                if (confirm(t.deleteConfirm)) {
                  const { error } = await supabase.from('maintenance_requests').delete().eq('id', id);
                  if (!error) {
                    toast.success(t.requestDeleted);
                    navigate('/app/buyer/requests');
                  }
                }
              }}
              className={cn(
                "flex-1 bg-destructive/10 text-destructive rounded-full px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 h-12",
                isArabic ? "font-ar-body" : "font-body"
              )}
            >
              <Trash2 className="w-4 h-4" />
              {t.cancel}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/app/buyer/request/${id}/edit`)}
              className={cn(
                "flex-1 bg-primary/5 border border-primary text-primary rounded-full px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 h-12",
                isArabic ? "font-ar-body" : "font-body"
              )}
            >
              <Edit2 className="w-4 h-4" />
              {t.edit}
            </motion.button>
          </div>
        ) : (
          <div className="w-full max-w-md mx-auto text-center">
            <p className={cn(
              "text-muted-foreground font-medium",
              isArabic ? "font-ar-body" : "font-body"
            )}>
              {isArabic ? "هذا الطلب لم يعد نشطاً" : "This request is no longer active"}
            </p>
          </div>
        )}
      </div>

      <QuoteTemplateManager
        requestId={id}
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};
