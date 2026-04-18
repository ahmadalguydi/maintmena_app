import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption, Heading3 } from '@/components/mobile/Typography';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    MapPin,
    TrendingUp,
    TrendingDown,
    Minus,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import { subDays, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';

interface AdminDemandProps {
    currentLanguage: 'en' | 'ar';
}

type PeriodFilter = '7d' | '30d' | '90d';

interface CategoryStat {
    category: string;
    count: number;
    pct: number;
    trend: 'up' | 'down' | 'flat';
    trendDiff: number;
}

interface CityStat {
    city: string;
    count: number;
    pct: number;
}

interface DemandData {
    categories: CategoryStat[];
    cities: CityStat[];
    totalRequests: number;
    periodLabel: string;
}

export function AdminDemand({ currentLanguage }: AdminDemandProps) {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';
    const [period, setPeriod] = useState<PeriodFilter>('30d');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-demand', period],
        queryFn: async (): Promise<DemandData> => {
            const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
            const halfDays = Math.floor(days / 2);
            const now = new Date();
            const periodStart = startOfDay(subDays(now, days)).toISOString();
            const halfStart = startOfDay(subDays(now, halfDays)).toISOString();

            // Current period
            const { data: current } = await supabase
                .from('maintenance_requests')
                .select('category, city, created_at')
                .gte('created_at', periodStart)
                .limit(1000);

            // Prior half for trend comparison
            const priorStart = startOfDay(subDays(now, days * 2)).toISOString();
            const { data: prior } = await supabase
                .from('maintenance_requests')
                .select('category')
                .gte('created_at', priorStart)
                .lt('created_at', periodStart)
                .limit(1000);

            const all = current || [];
            const priorAll = prior || [];
            const total = all.length;

            // Category aggregation — current period
            const catCurrent: Record<string, number> = {};
            all.forEach(r => { catCurrent[r.category] = (catCurrent[r.category] || 0) + 1; });

            // Category aggregation — prior period
            const catPrior: Record<string, number> = {};
            priorAll.forEach(r => { catPrior[r.category] = (catPrior[r.category] || 0) + 1; });

            const categories: CategoryStat[] = Object.entries(catCurrent)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([category, count]) => {
                    const prev = catPrior[category] || 0;
                    const diff = prev > 0 ? Math.round(((count - prev) / prev) * 100) : 0;
                    return {
                        category,
                        count,
                        pct: total > 0 ? Math.round((count / total) * 100) : 0,
                        trend: diff > 5 ? 'up' : diff < -5 ? 'down' : 'flat',
                        trendDiff: diff,
                    };
                });

            // City aggregation
            const cityMap: Record<string, number> = {};
            all.forEach(r => {
                if (r.city) {
                    cityMap[r.city] = (cityMap[r.city] || 0) + 1;
                }
            });
            const cities: CityStat[] = Object.entries(cityMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([city, count]) => ({
                    city,
                    count,
                    pct: total > 0 ? Math.round((count / total) * 100) : 0,
                }));

            const periodLabel = period === '7d' ? (isArabic ? '٧ أيام' : '7 days')
                : period === '30d' ? (isArabic ? '٣٠ يوم' : '30 days')
                : (isArabic ? '٩٠ يوم' : '90 days');

            return { categories, cities, totalRequests: total, periodLabel };
        },
        refetchInterval: 120000,
    });

    const t = {
        en: {
            title: 'Demand Signals', last: 'Last', requests: 'requests',
            topCategories: 'Top Categories', cityBreakdown: 'City Breakdown',
            noData: 'No demand data yet', trend: 'vs prev period', refresh: 'Refresh',
        },
        ar: {
            title: 'إشارات الطلب', last: 'آخر', requests: 'طلب',
            topCategories: 'أبرز الفئات', cityBreakdown: 'التوزيع الجغرافي',
            noData: 'لا توجد بيانات طلب بعد', trend: 'مقارنةً بالفترة السابقة', refresh: 'تحديث',
        },
    }[currentLanguage];

    const periodTabs: { key: PeriodFilter; label: string }[] = [
        { key: '7d', label: isArabic ? '٧ أيام' : '7d' },
        { key: '30d', label: isArabic ? '٣٠ يوم' : '30d' },
        { key: '90d', label: isArabic ? '٩٠ يوم' : '90d' },
    ];

    const maxCatCount = Math.max(...(data?.categories.map(c => c.count) || [1]), 1);
    const maxCityCount = Math.max(...(data?.cities.map(c => c.count) || [1]), 1);

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
                rightContent={
                    <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-primary">
                        <RefreshCw size={13} />
                        {t.refresh}
                    </button>
                }
            />

            <div className="px-4 py-5 space-y-6">
                {/* Period filter */}
                <div className="flex gap-2">
                    {periodTabs.map(({ key, label }) => (
                        <Button
                            key={key}
                            variant={period === key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPeriod(key)}
                            className="rounded-full flex-1"
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-40 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : data && data.totalRequests > 0 ? (
                    <>
                        {/* Total requests pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl"
                        >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BarChart3 size={20} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold tabular-nums text-primary">{data.totalRequests}</p>
                                <Caption lang={currentLanguage} className="text-muted-foreground">
                                    {t.requests} · {t.last} {data.periodLabel}
                                </Caption>
                            </div>
                        </motion.div>

                        {/* Top categories */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.topCategories}</Heading3>
                            <SoftCard className="divide-y divide-border/30">
                                {data.categories.map((cat, i) => {
                                    const barPct = (cat.count / maxCatCount) * 100;
                                    const TrendIcon = cat.trend === 'up' ? TrendingUp : cat.trend === 'down' ? TrendingDown : Minus;
                                    const trendColor = cat.trend === 'up' ? 'text-green-600' : cat.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
                                    return (
                                        <motion.div
                                            key={cat.category}
                                            initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + i * 0.04 }}
                                            className="py-3 first:pt-0 last:pb-0"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <BodySmall lang={currentLanguage} className="text-xs font-medium">
                                                    {getCategoryLabel(cat.category, currentLanguage)}
                                                </BodySmall>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('flex items-center gap-0.5 text-[11px] font-medium', trendColor)}>
                                                        <TrendIcon size={11} />
                                                        {cat.trendDiff !== 0 && `${Math.abs(cat.trendDiff)}%`}
                                                    </span>
                                                    <Caption className="font-semibold text-foreground tabular-nums">
                                                        {cat.count} <span className="text-muted-foreground font-normal">({cat.pct}%)</span>
                                                    </Caption>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${barPct}%` }}
                                                    transition={{ duration: 0.5, delay: 0.15 + i * 0.04 }}
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        i === 0 ? 'bg-primary' : i === 1 ? 'bg-primary/80' : i === 2 ? 'bg-primary/60' : 'bg-primary/40'
                                                    )}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </SoftCard>
                        </motion.div>

                        {/* City breakdown */}
                        {data.cities.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.cityBreakdown}</Heading3>
                                <SoftCard className="divide-y divide-border/30">
                                    {data.cities.map((city, i) => {
                                        const barPct = (city.count / maxCityCount) * 100;
                                        return (
                                            <motion.div
                                                key={city.city}
                                                initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + i * 0.04 }}
                                                className="py-3 first:pt-0 last:pb-0"
                                            >
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <BodySmall lang={currentLanguage} className="text-xs font-medium flex items-center gap-1.5">
                                                        <MapPin size={12} className="text-muted-foreground" />
                                                        {city.city}
                                                    </BodySmall>
                                                    <Caption className="font-semibold text-foreground tabular-nums">
                                                        {city.count} <span className="text-muted-foreground font-normal">({city.pct}%)</span>
                                                    </Caption>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${barPct}%` }}
                                                        transition={{ duration: 0.4, delay: 0.2 + i * 0.04 }}
                                                        className="h-full rounded-full bg-blue-500"
                                                    />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </SoftCard>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noData}</Body>
                    </div>
                )}
            </div>
        </div>
    );
}
