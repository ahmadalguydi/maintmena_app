import React from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapPin, Clock, ChevronRight, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
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
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BuyerActivityProps {
    currentLanguage: 'en' | 'ar';
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; labelEn: string; labelAr: string }> = {
    open: { color: 'bg-blue-500', icon: <Loader2 size={14} className="animate-spin" />, labelEn: 'Looking for providers', labelAr: 'جاري ندور لك على فني' },
    dispatching: { color: 'bg-amber-500', icon: <Loader2 size={14} className="animate-spin" />, labelEn: 'Matching', labelAr: 'جاري المطابقة' },
    accepted: { color: 'bg-green-500', icon: <CheckCircle2 size={14} />, labelEn: 'Provider assigned', labelAr: 'تم تعيين الفني' },
    en_route: { color: 'bg-amber-500', icon: <MapPin size={14} />, labelEn: 'On the way', labelAr: 'في الطريق' },
    arrived: { color: 'bg-orange-500', icon: <MapPin size={14} />, labelEn: 'Provider arrived', labelAr: 'وصل الفني' },
    in_progress: { color: 'bg-primary', icon: <Clock size={14} />, labelEn: 'In progress', labelAr: 'جاري التنفيذ' },
    awaiting_approval: { color: 'bg-amber-600', icon: <Clock size={14} />, labelEn: 'Awaiting your approval', labelAr: 'في انتظار موافقتك' },
    completed: { color: 'bg-green-600', icon: <CheckCircle2 size={14} />, labelEn: 'Completed', labelAr: 'مكتمل' },
    cancelled: { color: 'bg-red-500', icon: <XCircle size={14} />, labelEn: 'Cancelled', labelAr: 'ملغي' },
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

    const getCategoryInfo = (categoryKey: string) => {
        const cat = categories.find(c => c.key === categoryKey);
        return {
            icon: cat?.icon || '🔧',
            name: isRTL ? (cat?.ar || categoryKey) : (cat?.en || categoryKey),
        };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return format(date, 'MMM d · h:mm a', {
            locale: currentLanguage === 'ar' ? ar : undefined,
        });
    };

    const getRequestLocation = (request: any) =>
        getRequestLocationLabel(request, currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending');

    const getDisplayStatus = (request: any): string => getBuyerRequestPresentationStatus(request);

    const getStatusInfo = (request: any) => {
        const displayStatus = getDisplayStatus(request);
        return statusConfig[displayStatus] || statusConfig.open;
    };

    const handleRequestClick = async (id: string) => {
        await vibrate('light');
        navigate(`/app/buyer/request/${id}`);
    };

    const handleRebook = async (request: any) => {
        await vibrate('medium');
        // Navigate to home where ServiceFlowScreen can be opened
        navigate('/app/buyer/home');
    };

    // Split into featured (most recent) and past
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
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-32" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Content */}
            <div className="px-4 pt-safe">
                {/* Section header */}
                <div className="flex items-center justify-between py-4">
                    <h2 className={cn(
                        'text-lg font-semibold text-foreground',
                        isRTL ? 'font-ar-heading' : 'font-heading'
                    )}>
                        {t.past}
                    </h2>
                </div>

                {resolvedRequests.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-20 text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <Clock size={32} className="text-muted-foreground" />
                        </div>
                        <h3 className={cn(
                            'text-lg font-semibold text-foreground mb-2',
                            isRTL ? 'font-ar-heading' : 'font-heading'
                        )}>
                            {t.noActivity}
                        </h3>
                        <p className={cn(
                            'text-sm text-muted-foreground',
                            isRTL ? 'font-ar-body' : 'font-body'
                        )}>
                            {t.noActivitySub}
                        </p>
                    </motion.div>
                ) : (
                    <div className="space-y-3">
                        {/* Featured card (most recent) */}
                        {/* Featured card (most recent) */}
                        {featured && (
                            <RequestSummaryCard
                                currentLanguage={currentLanguage}
                                time={formatDate(featured.scheduledFor || featured.created_at)}
                                lat={(featured as any).latitude}
                                lng={(featured as any).longitude}
                                location={getRequestLocation(featured)}
                                category={featured.category}
                                categoryIcon={getCategoryInfo(featured.category).icon}
                                statusTitle={isRTL ? getStatusInfo(featured).labelAr : getStatusInfo(featured).labelEn}
                                statusColor={getStatusInfo(featured).color.replace('bg-', '')}
                                onClick={() => handleRequestClick(featured.id)}
                            >
                                {isRequestTerminal(featured.lifecycle) && (
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRebook(featured);
                                            }}
                                            className={cn(
                                                'inline-flex items-center gap-2 px-4 py-2 rounded-full',
                                                'bg-muted/50 text-foreground text-sm font-medium',
                                                'hover:bg-muted transition-colors',
                                                isRTL ? 'font-ar-body' : 'font-body'
                                            )}
                                        >
                                            <RefreshCw size={14} />
                                            {t.rebook}
                                        </button>
                                    </div>
                                )}
                            </RequestSummaryCard>
                        )}

                        {/* Past requests list */}
                        {pastRequests.map((request, index) => {
                            const catInfo = getCategoryInfo(request.category);
                            const status = getStatusInfo(request);

                            return (
                                <motion.div
                                    key={request.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        'flex items-center gap-3 p-4 rounded-xl',
                                        'bg-card border border-border/30',
                                        'active:scale-[0.98] transition-transform cursor-pointer'
                                    )}
                                    onClick={() => handleRequestClick(request.id)}
                                >
                                    {/* Category icon */}
                                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0">
                                        {catInfo.icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            'font-medium text-foreground truncate',
                                            isRTL ? 'font-ar-body' : 'font-body'
                                        )}>
                                            {getRequestLocation(request)}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <span>{formatDate(request.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Status + Action */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isRequestTerminal(request.lifecycle) ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRebook(request);
                                                }}
                                                className={cn(
                                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
                                                    'bg-muted/50 text-foreground text-xs font-medium',
                                                    'hover:bg-muted transition-colors',
                                                    isRTL ? 'font-ar-body' : 'font-body'
                                                )}
                                            >
                                                <RefreshCw size={12} />
                                                {t.rebook}
                                            </button>
                                        ) : (
                                            <span className={cn(
                                                'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full',
                                                status.color, 'text-white'
                                            )}>
                                                {status.icon}
                                                {isRTL ? status.labelAr : status.labelEn}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className={cn('text-muted-foreground', isRTL && 'rotate-180')} />
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
