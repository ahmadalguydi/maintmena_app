import React from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useHaptics } from '@/hooks/useHaptics';
import { getAllCategories } from '@/lib/serviceCategories';
import {
  getBuyerRequestPresentationStatus,
  getRequestLocationLabel,
  isRequestTerminal,
} from '@/lib/maintenanceRequest';
import { GC_TIME, REFETCH_INTERVAL, STALE_TIME } from '@/lib/queryConfig';
import { RequestSummaryCard } from '@/components/mobile/RequestSummaryCard';
import * as jobService from '@/services/jobService';

interface BuyerActivityProps {
  currentLanguage: 'en' | 'ar';
}

const statusConfig: Record<
  string,
  { color: string; icon: React.ReactNode; labelEn: string; labelAr: string }
> = {
  matching: {
    color: 'bg-blue-500',
    icon: <Loader2 size={14} className="animate-spin" />,
    labelEn: 'Looking for providers',
    labelAr: 'ندور لك على فني',
  },
  open: {
    color: 'bg-blue-500',
    icon: <Loader2 size={14} className="animate-spin" />,
    labelEn: 'Looking for providers',
    labelAr: 'ندور لك على فني',
  },
  dispatching: {
    color: 'bg-amber-500',
    icon: <Loader2 size={14} className="animate-spin" />,
    labelEn: 'Matching',
    labelAr: 'جاري التطابق',
  },
  accepted: {
    color: 'bg-green-500',
    icon: <CheckCircle2 size={14} />,
    labelEn: 'Provider assigned',
    labelAr: 'تم تعيين الفني',
  },
  on_the_way: {
    color: 'bg-amber-500',
    icon: <MapPin size={14} />,
    labelEn: 'On the way',
    labelAr: 'في الطريق',
  },
  arrived: {
    color: 'bg-orange-500',
    icon: <MapPin size={14} />,
    labelEn: 'Provider arrived',
    labelAr: 'وصل الفني',
  },
  in_progress: {
    color: 'bg-primary',
    icon: <Clock size={14} />,
    labelEn: 'In progress',
    labelAr: 'العمل شغال',
  },
  awaiting_approval: {
    color: 'bg-amber-600',
    icon: <Clock size={14} />,
    labelEn: 'Awaiting your approval',
    labelAr: 'بانتظار موافقتك',
  },
  completed: {
    color: 'bg-green-600',
    icon: <CheckCircle2 size={14} />,
    labelEn: 'Completed',
    labelAr: 'مكتمل',
  },
  confirmed: {
    color: 'bg-slate-500',
    icon: <CheckCircle2 size={14} />,
    labelEn: 'Closed',
    labelAr: 'مغلق',
  },
  cancelled: {
    color: 'bg-red-500',
    icon: <XCircle size={14} />,
    labelEn: 'Cancelled',
    labelAr: 'ملغي',
  },
};

export const BuyerActivity = ({ currentLanguage }: BuyerActivityProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vibrate } = useHaptics();
  const isRTL = currentLanguage === 'ar';
  const categories = getAllCategories();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['buyer-activity', user?.id],
    enabled: !!user?.id,
    queryFn: () => jobService.fetchBuyerActivityRequests(user!.id),
    staleTime: STALE_TIME.DYNAMIC,
    gcTime: GC_TIME.STANDARD,
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL.OPPORTUNITIES,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const resolvedRequests = requests ?? [];

  const getCategoryInfo = (categoryKey?: string | null) => {
    const category = categories.find((item) => item.key === categoryKey);

    return {
      icon: category?.icon || '🔧',
      name: isRTL
        ? category?.ar || categoryKey || 'الخدمة'
        : category?.en || categoryKey || 'Service',
    };
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) {
      return currentLanguage === 'ar' ? 'الآن' : 'Now';
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return currentLanguage === 'ar' ? 'الآن' : 'Now';
    }

    return format(date, 'MMM d · h:mm a', {
      locale: currentLanguage === 'ar' ? ar : undefined,
    });
  };

  const getRequestLocation = (request: any) =>
    getRequestLocationLabel(
      request,
      currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending',
    );

  const getDisplayStatus = (request: any): string =>
    getBuyerRequestPresentationStatus(request);

  const getStatusInfo = (request: any) => {
    const displayStatus = getDisplayStatus(request);
    return statusConfig[displayStatus] || statusConfig.open;
  };

  const handleRequestClick = async (id: string) => {
    await vibrate('light');
    navigate(`/app/buyer/request/${id}`);
  };

  const handleRebook = async () => {
    await vibrate('medium');
    navigate('/app/buyer/home');
  };

  const [featured, ...pastRequests] = resolvedRequests;

  const content = {
    ar: {
      past: 'طلباتك السابقة',
      noActivity: 'لا يوجد نشاط بعد',
      noActivitySub: 'أول ما تطلب خدمة بيظهر سجل طلباتك هنا',
      rebook: 'اطلب مرة ثانية',
    },
    en: {
      past: 'Past',
      noActivity: 'No activity yet',
      noActivitySub: 'Your request history will appear here',
      rebook: 'Rebook',
    },
  };

  const t = content[currentLanguage];

  if (isLoading && resolvedRequests.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="min-h-app bg-background pb-32"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="px-4 pt-safe">
        <div className="flex items-center justify-between py-4">
          <h2
            className={cn(
              'text-lg font-semibold text-foreground',
              isRTL ? 'font-ar-heading' : 'font-heading',
            )}
          >
            {t.past}
          </h2>
        </div>

        {resolvedRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Clock size={32} className="text-muted-foreground" />
            </div>
            <h3
              className={cn(
                'mb-2 text-lg font-semibold text-foreground',
                isRTL ? 'font-ar-heading' : 'font-heading',
              )}
            >
              {t.noActivity}
            </h3>
            <p
              className={cn(
                'text-sm text-muted-foreground',
                isRTL ? 'font-ar-body' : 'font-body',
              )}
            >
              {t.noActivitySub}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {featured ? (
              <RequestSummaryCard
                currentLanguage={currentLanguage}
                time={formatDate(featured.scheduledFor || featured.created_at)}
                lat={(featured as any).latitude}
                lng={(featured as any).longitude}
                location={getRequestLocation(featured)}
                category={getCategoryInfo(featured.category).name}
                categoryIcon={getCategoryInfo(featured.category).icon}
                statusTitle={
                  isRTL
                    ? getStatusInfo(featured).labelAr
                    : getStatusInfo(featured).labelEn
                }
                statusColor={getStatusInfo(featured).color}
                onClick={() => handleRequestClick(featured.id)}
              >
                {isRequestTerminal(featured.lifecycle) ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRebook();
                      }}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
                        'bg-muted/50 text-foreground transition-colors hover:bg-muted',
                        isRTL ? 'font-ar-body' : 'font-body',
                      )}
                    >
                      <RefreshCw size={14} />
                      {t.rebook}
                    </button>
                  </div>
                ) : null}
              </RequestSummaryCard>
            ) : null}

            {pastRequests.map((request, index) => {
              const categoryInfo = getCategoryInfo(request.category);
              const status = getStatusInfo(request);

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-xl border border-border/30 bg-card p-4',
                    'transition-transform active:scale-[0.98]',
                  )}
                  onClick={() => handleRequestClick(request.id)}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-2xl">
                    {categoryInfo.icon}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate font-medium text-foreground',
                        isRTL ? 'font-ar-body' : 'font-body',
                      )}
                    >
                      {getRequestLocation(request)}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isRequestTerminal(request.lifecycle) ? (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRebook();
                        }}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                          'bg-muted/50 text-foreground transition-colors hover:bg-muted',
                          isRTL ? 'font-ar-body' : 'font-body',
                        )}
                      >
                        <RefreshCw size={12} />
                        {t.rebook}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white',
                          status.color,
                        )}
                      >
                        {status.icon}
                        {isRTL ? status.labelAr : status.labelEn}
                      </span>
                    )}
                    <ChevronRight
                      size={16}
                      className={cn('text-muted-foreground', isRTL && 'rotate-180')}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
