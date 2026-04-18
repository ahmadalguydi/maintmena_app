import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption, Heading3 } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Radio,
    MapPin,
    Clock,
    AlertTriangle,
    User,
    Briefcase,
    DollarSign,
    RefreshCw,
    CheckCircle2,
    Zap,
} from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';

interface AdminDispatchProps {
    currentLanguage: 'en' | 'ar';
}

interface DispatchJob {
    id: string;
    title: string | null;
    category: string;
    status: string;
    budget: number | null;
    created_at: string;
    updated_at: string;
    city: string | null;
    buyer_id: string | null;
    buyer_name: string | null;
    waitMinutes: number;
}

export function AdminDispatch({ currentLanguage }: AdminDispatchProps) {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const currencyLabel = isArabic ? 'ر.س' : 'SAR';
    const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);

    const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['admin-dispatch-queue'],
        queryFn: async () => {
            // dispatching = system is looking for a seller
            const { data: jobs, error } = await supabase
                .from('maintenance_requests')
                .select('id, title, category, status, budget, created_at, updated_at, city, buyer_id')
                .in('status', ['submitted', 'dispatching'])
                .order('created_at', { ascending: true }) // oldest first = highest priority
                .limit(50);

            if (error) throw error;
            if (!jobs || jobs.length === 0) return { queue: [], stats: { total: 0, stale: 0, avgWait: 0 } };

            const buyerIds = [...new Set(jobs.map(j => j.buyer_id).filter(Boolean))] as string[];
            let profileMap: Record<string, string> = {};
            if (buyerIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, company_name')
                    .in('id', buyerIds);
                (profiles || []).forEach(p => {
                    profileMap[p.id] = p.company_name || p.full_name || '';
                });
            }

            const now = new Date();
            const queue: DispatchJob[] = jobs.map(j => ({
                id: j.id,
                title: j.title,
                category: j.category,
                status: j.status,
                budget: j.budget,
                created_at: j.created_at,
                updated_at: j.updated_at,
                city: j.city,
                buyer_id: j.buyer_id,
                buyer_name: j.buyer_id ? (profileMap[j.buyer_id] || null) : null,
                waitMinutes: differenceInMinutes(now, new Date(j.created_at)),
            }));

            const stale = queue.filter(j => j.waitMinutes > 15).length;
            const avgWait = queue.length > 0
                ? Math.round(queue.reduce((s, j) => s + j.waitMinutes, 0) / queue.length)
                : 0;

            return { queue, stats: { total: queue.length, stale, avgWait } };
        },
        refetchInterval: 20000,
    });

    // ─── Seller Supply vs Demand Heatmap ───
    const { data: supplyDemand } = useQuery({
        queryKey: ['admin-supply-demand'],
        queryFn: async () => {
            // Demand: count requests per city in queue
            const demandByCity: Record<string, number> = {};
            const { data: pendingRequests } = await supabase
                .from('maintenance_requests')
                .select('city')
                .in('status', ['submitted', 'dispatching']);
            (pendingRequests || []).forEach((r: { city: string | null }) => {
                const city = r.city || 'Unknown';
                demandByCity[city] = (demandByCity[city] || 0) + 1;
            });

            // Supply: count active sellers per city
            const supplyByCity: Record<string, number> = {};
            const { data: sellers } = await supabase
                .from('profiles')
                .select('city')
                .eq('user_type', 'seller');
            (sellers || []).forEach((s: { city: string | null }) => {
                const city = s.city || 'Unknown';
                supplyByCity[city] = (supplyByCity[city] || 0) + 1;
            });

            // Combine into a list
            const allCities = new Set([...Object.keys(demandByCity), ...Object.keys(supplyByCity)]);
            const heatmap = Array.from(allCities)
                .filter(c => c !== 'Unknown')
                .map(city => ({
                    city,
                    demand: demandByCity[city] || 0,
                    supply: supplyByCity[city] || 0,
                    gap: (demandByCity[city] || 0) - (supplyByCity[city] || 0),
                }))
                .filter(c => c.demand > 0 || c.supply > 0)
                .sort((a, b) => b.gap - a.gap); // Worst gaps first

            return heatmap;
        },
        refetchInterval: 30000,
    });

    const queue = data?.queue ?? [];
    const stats = data?.stats ?? { total: 0, stale: 0, avgWait: 0 };

    const t = {
        en: {
            title: 'Dispatch Queue', inQueue: 'In Queue', stale: 'Waiting >15m',
            avgWait: 'Avg Wait', mins: 'min', noQueue: 'Queue is empty',
            allClear: 'All requests have been assigned.', buyer: 'Buyer',
            budget: 'Budget', city: 'City', waitTime: 'Waiting', close: 'Close',
            refresh: 'Refresh', viewJob: 'View Job', lastUpdated: 'Last updated',
            supplyDemand: 'Supply vs Demand', demand: 'Demand', supply: 'Sellers',
            shortage: 'Shortage', surplus: 'Surplus', balanced: 'Balanced',
        },
        ar: {
            title: 'قائمة التوزيع', inQueue: 'في الطابور', stale: 'انتظار >15د',
            avgWait: 'متوسط الانتظار', mins: 'د', noQueue: 'الطابور فارغ',
            allClear: 'تم تعيين جميع الطلبات.', buyer: 'العميل',
            budget: 'الميزانية', city: 'المدينة', waitTime: 'وقت الانتظار', close: 'إغلاق',
            refresh: 'تحديث', viewJob: 'عرض المهمة', lastUpdated: 'آخر تحديث',
            supplyDemand: 'العرض والطلب', demand: 'طلب', supply: 'فنيين',
            shortage: 'نقص', surplus: 'فائض', balanced: 'متوازن',
        },
    }[currentLanguage];

    const getUrgencyColor = (mins: number) => {
        if (mins > 30) return 'text-red-600';
        if (mins > 15) return 'text-amber-600';
        return 'text-green-600';
    };

    const getUrgencyBg = (mins: number) => {
        if (mins > 30) return 'border-l-4 border-red-500';
        if (mins > 15) return 'border-l-4 border-amber-500';
        return '';
    };

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
                rightContent={
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-1.5 text-xs text-primary"
                    >
                        <RefreshCw size={13} />
                        {t.refresh}
                    </button>
                }
            />

            <div className="px-4 py-5 space-y-5">
                {/* Stats strip */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-3 gap-2"
                >
                    {[
                        { label: t.inQueue, value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Radio },
                        { label: t.stale, value: stats.stale, color: stats.stale > 0 ? 'text-amber-600' : 'text-green-600', bg: stats.stale > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-green-50 dark:bg-green-900/20', icon: Clock },
                        { label: t.avgWait, value: `${stats.avgWait}${t.mins}`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: Zap },
                    ].map((m, i) => (
                        <motion.div
                            key={m.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05 + i * 0.04 }}
                            className={cn('rounded-xl p-3 text-center', m.bg)}
                        >
                            <m.icon size={15} className={cn('mx-auto mb-1', m.color)} />
                            <p className={cn('text-xl font-bold tabular-nums', m.color)}>{m.value}</p>
                            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{m.label}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Supply vs Demand Heatmap */}
                {supplyDemand && supplyDemand.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-2">
                            {t.supplyDemand}
                        </Heading3>
                        <SoftCard className="p-3 space-y-2">
                            {supplyDemand.slice(0, 6).map((item) => {
                                const maxVal = Math.max(item.demand, item.supply, 1);
                                const gapLabel = item.gap > 0
                                    ? `${t.shortage} (${item.gap})`
                                    : item.gap < 0
                                        ? `${t.surplus} (${Math.abs(item.gap)})`
                                        : t.balanced;
                                const gapColor = item.gap > 0 ? 'text-red-600' : item.gap < 0 ? 'text-green-600' : 'text-muted-foreground';
                                return (
                                    <div key={item.city} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={10} className="text-muted-foreground" />
                                                <span className="font-medium text-foreground">{item.city}</span>
                                            </div>
                                            <span className={cn('text-[10px] font-semibold', gapColor)}>{gapLabel}</span>
                                        </div>
                                        <div className="flex gap-1 h-2">
                                            <div
                                                className="rounded-full bg-red-400/70 dark:bg-red-500/50 transition-all"
                                                style={{ width: `${(item.demand / maxVal) * 50}%`, minWidth: item.demand > 0 ? '8px' : '0' }}
                                                title={`${t.demand}: ${item.demand}`}
                                            />
                                            <div
                                                className="rounded-full bg-green-400/70 dark:bg-green-500/50 transition-all"
                                                style={{ width: `${(item.supply / maxVal) * 50}%`, minWidth: item.supply > 0 ? '8px' : '0' }}
                                                title={`${t.supply}: ${item.supply}`}
                                            />
                                        </div>
                                        <div className="flex gap-3 text-[9px] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-2 h-2 rounded-full bg-red-400/70" />
                                                {t.demand}: {item.demand}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-2 h-2 rounded-full bg-green-400/70" />
                                                {t.supply}: {item.supply}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </SoftCard>
                    </motion.div>
                )}

                {/* Queue list */}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : queue.length > 0 ? (
                    <>
                        <Heading3 lang={currentLanguage} className="text-sm font-semibold">
                            {isArabic ? `${queue.length} طلب في الطابور` : `${queue.length} request${queue.length !== 1 ? 's' : ''} in queue`}
                        </Heading3>
                        <div className="space-y-2.5">
                            {queue.map((job, i) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <SoftCard
                                        className={cn(
                                            'p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]',
                                            getUrgencyBg(job.waitMinutes)
                                        )}
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                <Radio size={18} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1 gap-2">
                                                    <BodySmall lang={currentLanguage} className="font-medium truncate">
                                                        {job.title || getCategoryLabel(job.category, currentLanguage)}
                                                    </BodySmall>
                                                    <span className={cn('text-xs font-bold tabular-nums flex-shrink-0 flex items-center gap-1', getUrgencyColor(job.waitMinutes))}>
                                                        <Clock size={11} />
                                                        {job.waitMinutes}{t.mins}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    {job.buyer_name && (
                                                        <span className="flex items-center gap-1 truncate max-w-[100px]">
                                                            <User size={10} />
                                                            {job.buyer_name}
                                                        </span>
                                                    )}
                                                    {job.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={10} />
                                                            {job.city}
                                                        </span>
                                                    )}
                                                    {job.budget && (
                                                        <span className="flex items-center gap-1 text-foreground font-medium">
                                                            <DollarSign size={10} />
                                                            {job.budget} {currencyLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </SoftCard>
                                </motion.div>
                            ))}
                        </div>

                        {dataUpdatedAt > 0 && (
                            <Caption className="text-center text-muted-foreground text-[10px]">
                                {t.lastUpdated}: {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true, locale: isArabic ? ar : enUS })}
                            </Caption>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-green-500" />
                        </div>
                        <Body lang={currentLanguage} className="font-semibold">{t.noQueue}</Body>
                        <Caption lang={currentLanguage} className="text-muted-foreground mt-1">{t.allClear}</Caption>
                    </div>
                )}
            </div>

            {/* Detail Sheet */}
            <Sheet open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className={isArabic ? 'text-right font-ar-display' : ''}>
                            {selectedJob?.title || getCategoryLabel(selectedJob?.category ?? '', currentLanguage)}
                        </SheetTitle>
                    </SheetHeader>

                    {selectedJob && (
                        <div className="mt-5 space-y-3" dir={isArabic ? 'rtl' : 'ltr'}>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                                <Clock size={16} className="text-amber-600 flex-shrink-0" />
                                <div>
                                    <Caption lang={currentLanguage} className="text-amber-700 font-medium">
                                        {t.waitTime}: {selectedJob.waitMinutes}{t.mins}
                                    </Caption>
                                    <Caption lang={currentLanguage} className="text-muted-foreground text-[10px]">
                                        {formatDistanceToNow(new Date(selectedJob.created_at), {
                                            addSuffix: true,
                                            locale: isArabic ? ar : enUS,
                                        })}
                                    </Caption>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.buyer}</Caption>
                                    <BodySmall lang={currentLanguage} className="font-medium">{selectedJob.buyer_name || '—'}</BodySmall>
                                </div>
                                {selectedJob.city && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.city}</Caption>
                                        <BodySmall lang={currentLanguage}>{selectedJob.city}</BodySmall>
                                    </div>
                                )}
                                {selectedJob.budget && (
                                    <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                        <Caption lang={currentLanguage} className="text-muted-foreground">{t.budget}</Caption>
                                        <BodySmall lang={currentLanguage} className="font-semibold">{selectedJob.budget} {currencyLabel}</BodySmall>
                                    </div>
                                )}
                                <div className="p-3 bg-muted rounded-xl flex items-center justify-between">
                                    <Caption lang={currentLanguage} className="text-muted-foreground">Category</Caption>
                                    <BodySmall lang={currentLanguage}>{getCategoryLabel(selectedJob.category, currentLanguage)}</BodySmall>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setSelectedJob(null)}>
                                    {t.close}
                                </Button>
                                <Button
                                    className="flex-1 gap-2"
                                    onClick={() => {
                                        setSelectedJob(null);
                                        navigate('/app/admin/jobs');
                                    }}
                                >
                                    <Briefcase size={15} />
                                    {t.viewJob}
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

