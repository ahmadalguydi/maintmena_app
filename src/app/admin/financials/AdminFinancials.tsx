import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Body, BodySmall, Caption, Heading3 } from '@/components/mobile/Typography';
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Calendar,
    BarChart3,
    ArrowRight,
} from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';

interface AdminFinancialsProps {
    currentLanguage: 'en' | 'ar';
}

interface FinancialStats {
    totalRevenue: number;
    todayRevenue: number;
    weekRevenue: number;
    monthRevenue: number;
    totalCompleted: number;
    avgJobValue: number;
    recentJobs: { id: string; title: string | null; category: string; budget: number; completed_at: string; city: string | null }[];
    categoryRevenue: { category: string; total: number; count: number }[];
    last7Days: { date: string; revenue: number; count: number }[];
}

export function AdminFinancials({ currentLanguage }: AdminFinancialsProps) {
    const navigate = useNavigate();
    const isArabic = currentLanguage === 'ar';

    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-financials'],
        queryFn: async (): Promise<FinancialStats> => {
            const now = new Date();
            const todayStart = startOfDay(now).toISOString();
            const weekStart = startOfWeek(now, { weekStartsOn: 0 }).toISOString();
            const monthStart = startOfMonth(now).toISOString();

            // All completed jobs with budget
            const { data: jobs } = await supabase
                .from('maintenance_requests')
                .select('id, title, category, budget, updated_at, city')
                .in('status', ['completed', 'closed'])
                .not('budget', 'is', null)
                .order('updated_at', { ascending: false })
                .limit(500);

            const allJobs = (jobs || []).filter(j => j.budget && j.budget > 0);

            const totalRevenue = allJobs.reduce((s, j) => s + (j.budget || 0), 0);
            const todayRevenue = allJobs.filter(j => j.updated_at >= todayStart).reduce((s, j) => s + (j.budget || 0), 0);
            const weekRevenue = allJobs.filter(j => j.updated_at >= weekStart).reduce((s, j) => s + (j.budget || 0), 0);
            const monthRevenue = allJobs.filter(j => j.updated_at >= monthStart).reduce((s, j) => s + (j.budget || 0), 0);
            const avgJobValue = allJobs.length > 0 ? totalRevenue / allJobs.length : 0;

            // Category breakdown
            const catMap: Record<string, { total: number; count: number }> = {};
            allJobs.forEach(j => {
                if (!catMap[j.category]) catMap[j.category] = { total: 0, count: 0 };
                catMap[j.category].total += j.budget || 0;
                catMap[j.category].count++;
            });
            const categoryRevenue = Object.entries(catMap)
                .map(([category, v]) => ({ category, ...v }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 6);

            // Last 7 days daily breakdown
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = subDays(now, 6 - i);
                const dayStr = format(date, 'yyyy-MM-dd');
                const dayJobs = allJobs.filter(j => j.updated_at.startsWith(dayStr));
                return {
                    date: dayStr,
                    revenue: dayJobs.reduce((s, j) => s + (j.budget || 0), 0),
                    count: dayJobs.length,
                };
            });

            const recentJobs = allJobs.slice(0, 15).map(j => ({
                id: j.id,
                title: j.title,
                category: j.category,
                budget: j.budget!,
                completed_at: j.updated_at,
                city: j.city,
            }));

            return {
                totalRevenue, todayRevenue, weekRevenue, monthRevenue,
                totalCompleted: allJobs.length, avgJobValue,
                recentJobs, categoryRevenue, last7Days,
            };
        },
        refetchInterval: 60000,
    });

    const t = {
        en: {
            title: 'Financials', totalRevenue: 'Total Revenue', today: 'Today',
            thisWeek: 'This Week', thisMonth: 'This Month', avgJob: 'Avg. Job Value',
            totalJobs: 'Completed Jobs', recentJobs: 'Recent Completions',
            byCategory: 'Revenue by Category', dailyTrend: '7-Day Trend',
            noData: 'No revenue data yet', sar: 'SAR',
        },
        ar: {
            title: 'المالية', totalRevenue: 'إجمالي الإيرادات', today: 'اليوم',
            thisWeek: 'هذا الأسبوع', thisMonth: 'هذا الشهر', avgJob: 'متوسط قيمة العمل',
            totalJobs: 'أعمال مكتملة', recentJobs: 'آخر الأعمال المكتملة',
            byCategory: 'الإيرادات حسب الفئة', dailyTrend: 'الاتجاه (7 أيام)',
            noData: 'لا توجد بيانات إيرادات بعد', sar: 'ر.س',
        },
    }[currentLanguage];

    const fmt = (n: number) => n.toLocaleString(isArabic ? 'ar-SA' : 'en-US', { maximumFractionDigits: 0 });

    const maxBar = Math.max(...(stats?.last7Days.map(d => d.revenue) || [1]), 1);

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader
                title={t.title}
                showBack
                onBack={() => navigate('/app/admin/home')}
            />

            <div className="px-4 py-5 space-y-6">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-28 animate-pulse bg-muted rounded-3xl" />
                        ))}
                    </div>
                ) : stats ? (
                    <>
                        {/* Hero revenue card */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <SoftCard className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-200/50 dark:border-green-700/30">
                                <Caption lang={currentLanguage} className="text-green-700 dark:text-green-400 font-medium mb-1">
                                    {t.totalRevenue}
                                </Caption>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-bold tabular-nums text-green-800 dark:text-green-300">
                                        {fmt(stats.totalRevenue)}
                                    </p>
                                    <Caption lang={currentLanguage} className="text-green-700 dark:text-green-400 pb-1">
                                        {t.sar}
                                    </Caption>
                                </div>
                                <Caption lang={currentLanguage} className="text-green-600/80 mt-1">
                                    {stats.totalCompleted} {t.totalJobs} Â· {isArabic ? 'متوسط' : 'avg'} {fmt(stats.avgJobValue)} {t.sar}
                                </Caption>
                            </SoftCard>
                        </motion.div>

                        {/* Period breakdown */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: t.today, value: stats.todayRevenue, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                                    { label: t.thisWeek, value: stats.weekRevenue, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                                    { label: t.thisMonth, value: stats.monthRevenue, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                                ].map((m, i) => (
                                    <motion.div
                                        key={m.label}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 + i * 0.04 }}
                                        className={cn('rounded-xl p-3 text-center', m.bg)}
                                    >
                                        <p className={cn('text-lg font-bold tabular-nums', m.color)}>{fmt(m.value)}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{t.sar}</p>
                                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 7-day bar chart */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.dailyTrend}</Heading3>
                            <SoftCard className="p-4">
                                <div className="flex items-end gap-1.5 h-24">
                                    {stats.last7Days.map((day, i) => {
                                        const heightPct = maxBar > 0 ? (day.revenue / maxBar) * 100 : 0;
                                        return (
                                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${Math.max(heightPct, 4)}%` }}
                                                    transition={{ delay: 0.15 + i * 0.04, duration: 0.4 }}
                                                    className={cn(
                                                        'w-full rounded-t-md',
                                                        day.revenue > 0 ? 'bg-green-500' : 'bg-muted'
                                                    )}
                                                    style={{ minHeight: 4 }}
                                                    title={`${fmt(day.revenue)} SAR`}
                                                />
                                                <Caption className="text-[9px] text-muted-foreground">
                                                    {format(new Date(day.date), 'EEE', { locale: isArabic ? ar : enUS }).slice(0, 2)}
                                                </Caption>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SoftCard>
                        </motion.div>

                        {/* Category breakdown */}
                        {stats.categoryRevenue.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.byCategory}</Heading3>
                                <SoftCard className="divide-y divide-border/30">
                                    {stats.categoryRevenue.map(cat => {
                                        const pct = stats.totalRevenue > 0 ? (cat.total / stats.totalRevenue) * 100 : 0;
                                        return (
                                            <div key={cat.category} className="py-3 first:pt-0 last:pb-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <BodySmall lang={currentLanguage} className="text-xs font-medium">
                                                        {getCategoryLabel(cat.category, currentLanguage)}
                                                    </BodySmall>
                                                    <div className="flex items-center gap-2">
                                                        <Caption className="text-muted-foreground">{cat.count} jobs</Caption>
                                                        <Caption className="font-semibold text-foreground tabular-nums">
                                                            {fmt(cat.total)} {t.sar}
                                                        </Caption>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${pct}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className="h-full bg-green-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </SoftCard>
                            </motion.div>
                        )}

                        {/* Recent completions */}
                        {stats.recentJobs.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <div className="flex items-center justify-between mb-3">
                                    <Heading3 lang={currentLanguage} className="text-sm font-semibold">{t.recentJobs}</Heading3>
                                </div>
                                <SoftCard className="divide-y divide-border/30">
                                    {stats.recentJobs.map(job => (
                                        <div key={job.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                            <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle2 size={14} className="text-green-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <BodySmall lang={currentLanguage} className="text-xs font-medium truncate">
                                                    {job.title || getCategoryLabel(job.category, currentLanguage)}
                                                </BodySmall>
                                                <Caption lang={currentLanguage} className="text-muted-foreground text-[10px]">
                                                    {format(new Date(job.completed_at), 'PP', { locale: isArabic ? ar : enUS })}
                                                    {job.city && ` Â· ${job.city}`}
                                                </Caption>
                                            </div>
                                            <BodySmall lang={currentLanguage} className="font-semibold text-green-600 tabular-nums flex-shrink-0">
                                                {fmt(job.budget)} {t.sar}
                                            </BodySmall>
                                        </div>
                                    ))}
                                </SoftCard>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16">
                        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                        <Body lang={currentLanguage} className="text-muted-foreground">{t.noData}</Body>
                    </div>
                )}
            </div>
        </div>
    );
}


