import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading2, Heading3, Body, BodySmall, Caption } from '@/components/mobile/Typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Flag,
    Users,
    MessageCircle,
    AlertTriangle,
    Activity,
    Settings,
    ChevronRight,
    LogOut,
    Shield,
    Briefcase,
    TrendingUp,
    Zap,
    Clock,
    CheckCircle2,
    XCircle,
    Radio,
    BarChart3,
    DollarSign,
    MapPin,
    RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { smartTimeAgo, getGreeting } from '@/lib/smartTime';

interface AdminHomeProps {
    currentLanguage: 'en' | 'ar';
}

export const AdminHome = ({ currentLanguage }: AdminHomeProps) => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const isArabic = currentLanguage === 'ar';

    // ─── Platform-wide statistics ───
    const { data: stats, isLoading, refetch: refetchStats } = useQuery({
        queryKey: ['admin-dashboard-stats'],
        queryFn: async () => {
            let pendingReports = 0;
            let haltedJobs = 0;
            let totalUsers = 0;
            let totalBuyers = 0;
            let totalSellers = 0;
            let openChats = 0;
            let pendingScores = 0;
            let activeJobs = 0;
            let completedToday = 0;
            let cancelledToday = 0;
            let newUsersToday = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayISO = today.toISOString();

            // user_reports table does not exist in schema

            try {
                const { count } = await supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).in('status', ['dispatching', 'accepted', 'in_route', 'arrived', 'in_progress']);
                activeJobs = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('status', 'completed').gte('updated_at', todayISO);
                completedToday = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('status', 'cancelled').gte('updated_at', todayISO);
                cancelledToday = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('status', 'disputed');
                haltedJobs = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
                totalUsers = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'buyer');
                totalBuyers = count || 0;
            } catch { /* */ }

            try {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('user_type', 'seller');
                totalSellers = count || 0;
            } catch { /* */ }

            // support_chats table does not exist in schema

            try {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO);
                newUsersToday = count || 0;
            } catch { /* */ }

            // trust_score_pending does not exist in schema

            return {
                pendingReports, haltedJobs, totalUsers, totalBuyers, totalSellers,
                openChats, pendingScores, activeJobs, completedToday, cancelledToday, newUsersToday,
            };
        },
        refetchInterval: 30000,
    });

    // ─── Recent Activity Feed ───
    const { data: recentActivity = [] } = useQuery({
        queryKey: ['admin-recent-activity'],
        queryFn: async () => {
            try {
                const { data: requests } = await supabase
                    .from('maintenance_requests')
                    .select('id, status, title, category, created_at, updated_at')
                    .order('updated_at', { ascending: false })
                    .limit(8);

                return (requests || []).map(r => ({
                    id: r.id,
                    type: r.status === 'completed' ? 'completed' :
                          r.status === 'cancelled' ? 'cancelled' :
                          r.status === 'dispatching' ? 'dispatching' : 'updated',
                    title: r.title || r.category || 'Job',
                    time: r.updated_at || r.created_at,
                    status: r.status,
                }));
            } catch {
                return [];
            }
        },
        refetchInterval: 30000,
    });

    const content = {
        en: {
            title: 'Command Center',
            greeting: getGreeting('en'),
            liveMetrics: 'Live Metrics',
            platformHealth: 'Platform Health',
            priorityQueue: 'Priority Queue',
            activityFeed: 'Recent Activity',
            quickNav: 'Quick Navigation',
            reports: 'Reports',
            reportsSub: 'Pending review',
            disputes: 'Disputes',
            disputesSub: 'Halted jobs',
            support: 'Support',
            supportSub: 'Open chats',
            users: 'Users',
            usersSub: 'Total registered',
            trustScores: 'Trust Scores',
            trustScoresSub: 'Pending review',
            activeJobs: 'Active Jobs',
            completedToday: 'Completed Today',
            cancelledToday: 'Cancelled Today',
            newUsers: 'New Today',
            buyers: 'Buyers',
            sellers: 'Sellers',
            allJobs: 'All Jobs',
            sellersDir: 'Sellers Directory',
            financials: 'Financials',
            dispatch: 'Dispatch',
            demand: 'Demand Signals',
            activityLog: 'Activity Log',
            settings: 'Settings',
            logout: 'Logout',
            healthy: 'Healthy',
            attention: 'Needs Attention',
            critical: 'Critical',
            refresh: 'Refresh',
            viewAll: 'View All',
        },
        ar: {
            title: 'مركز القيادة',
            greeting: getGreeting('ar'),
            liveMetrics: 'المقاييس الحية',
            platformHealth: 'صحة المنصة',
            priorityQueue: 'قائمة الأولوية',
            activityFeed: 'النشاط الأخير',
            quickNav: 'التنقل السريع',
            reports: 'البلاغات',
            reportsSub: 'في انتظار المراجعة',
            disputes: 'النزاعات',
            disputesSub: 'أعمال متوقفة',
            support: 'الدعم',
            supportSub: 'محادثات مفتوحة',
            users: 'المستخدمين',
            usersSub: 'إجمالي المسجلين',
            trustScores: 'نقاط الثقة',
            trustScoresSub: 'في انتظار المراجعة',
            activeJobs: 'المهام النشطة',
            completedToday: 'مكتمل اليوم',
            cancelledToday: 'ملغي اليوم',
            newUsers: 'جديد اليوم',
            buyers: 'المشترين',
            sellers: 'البائعين',
            allJobs: 'جميع المهام',
            sellersDir: 'دليل مقدمي الخدمة',
            financials: 'المالية',
            dispatch: 'التوزيع',
            demand: 'إشارات الطلب',
            activityLog: 'سجل النشاط',
            settings: 'الإعدادات',
            logout: 'خروج',
            healthy: 'سليم',
            attention: 'يحتاج انتباه',
            critical: 'حرج',
            refresh: 'تحديث',
            viewAll: 'عرض الكل',
        },
    };

    const t = content[currentLanguage];

    // Platform health calculation
    const healthStatus = (): { label: string; color: string; dotColor: string } => {
        const reports = stats?.pendingReports || 0;
        const halted = stats?.haltedJobs || 0;

        if (reports > 5 || halted > 3) return { label: t.critical, color: 'text-red-600', dotColor: 'bg-red-500' };
        if (reports > 0 || halted > 0) return { label: t.attention, color: 'text-amber-600', dotColor: 'bg-amber-500' };
        return { label: t.healthy, color: 'text-green-600', dotColor: 'bg-green-500' };
    };

    const health = healthStatus();

    const priorityCards = [
        {
            id: 'reports', icon: Flag, label: t.reports, sublabel: t.reportsSub,
            count: stats?.pendingReports || 0, gradient: 'from-red-500/10 to-red-600/5',
            iconBg: 'bg-red-500/15', iconColor: 'text-red-600',
            path: '/app/admin/reports', urgent: (stats?.pendingReports || 0) > 0,
        },
        {
            id: 'disputes', icon: AlertTriangle, label: t.disputes, sublabel: t.disputesSub,
            count: stats?.haltedJobs || 0, gradient: 'from-amber-500/10 to-amber-600/5',
            iconBg: 'bg-amber-500/15', iconColor: 'text-amber-600',
            path: '/app/admin/disputes', urgent: (stats?.haltedJobs || 0) > 0,
        },
        {
            id: 'support', icon: MessageCircle, label: t.support, sublabel: t.supportSub,
            count: stats?.openChats || 0, gradient: 'from-blue-500/10 to-blue-600/5',
            iconBg: 'bg-blue-500/15', iconColor: 'text-blue-600',
            path: '/app/admin/support', urgent: false,
        },
        {
            id: 'scores', icon: Shield, label: t.trustScores, sublabel: t.trustScoresSub,
            count: stats?.pendingScores || 0, gradient: 'from-teal-500/10 to-teal-600/5',
            iconBg: 'bg-teal-500/15', iconColor: 'text-teal-600',
            path: '/app/admin/scores', urgent: (stats?.pendingScores || 0) > 0,
        },
    ];

    const quickNavItems = [
        { icon: Briefcase, label: t.allJobs, path: '/app/admin/jobs', color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
        { icon: Users, label: t.users, path: '/app/admin/users', color: 'text-purple-600', bg: 'bg-purple-500/10' },
        { icon: BarChart3, label: t.sellersDir, path: '/app/admin/sellers', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
        { icon: DollarSign, label: t.financials, path: '/app/admin/financials', color: 'text-green-600', bg: 'bg-green-500/10' },
        { icon: Radio, label: t.dispatch, path: '/app/admin/dispatch', color: 'text-orange-600', bg: 'bg-orange-500/10' },
        { icon: MapPin, label: t.demand, path: '/app/admin/demand', color: 'text-pink-600', bg: 'bg-pink-500/10' },
    ];

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'completed': return <CheckCircle2 size={14} className="text-green-600" />;
            case 'cancelled': return <XCircle size={14} className="text-red-500" />;
            case 'dispatching': return <Radio size={14} className="text-blue-500" />;
            default: return <Activity size={14} className="text-muted-foreground" />;
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/app');
    };

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader title={t.title} />

            <div className="px-4 py-5 space-y-6">
                {/* ─── Greeting + Health ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start justify-between"
                >
                    <div>
                        <Caption lang={currentLanguage} className="text-muted-foreground">
                            {t.greeting}
                        </Caption>
                        <Heading2 lang={currentLanguage} className="text-lg">
                            {user?.email?.split('@')[0]}
                        </Heading2>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Health Badge */}
                        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border/50 shadow-sm')}>
                            <div className={cn('w-2 h-2 rounded-full animate-pulse', health.dotColor)} />
                            <span className={cn('text-xs font-medium', health.color)}>{health.label}</span>
                        </div>

                        <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleLogout}>
                            <LogOut size={18} />
                        </Button>
                    </div>
                </motion.div>

                {/* ─── Live Metrics Strip ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <Heading3 lang={currentLanguage} className="text-sm font-semibold">{t.liveMetrics}</Heading3>
                        <button onClick={() => refetchStats()} className="text-xs text-primary flex items-center gap-1 hover:underline">
                            <RefreshCw size={12} />
                            {t.refresh}
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: t.activeJobs, value: stats?.activeJobs || 0, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                            { label: t.completedToday, value: stats?.completedToday || 0, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                            { label: t.cancelledToday, value: stats?.cancelledToday || 0, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
                            { label: t.newUsers, value: stats?.newUsersToday || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                        ].map((metric, i) => (
                            <motion.div
                                key={metric.label}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className={cn('rounded-xl p-3 text-center', metric.bg)}
                            >
                                <p className={cn('text-xl font-bold tabular-nums', metric.color)}>{metric.value}</p>
                                <p className="text-[10px] text-muted-foreground leading-tight mt-1">{metric.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* User breakdown bar */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Users size={12} />
                        <span className="font-medium">{stats?.totalUsers || 0} {t.users}</span>
                        <span className="text-border">|</span>
                        <span>{stats?.totalBuyers || 0} {t.buyers}</span>
                        <span className="text-border">|</span>
                        <span>{stats?.totalSellers || 0} {t.sellers}</span>
                    </div>
                </motion.div>

                {/* ─── Priority Queue ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.priorityQueue}</Heading3>

                    <div className="grid grid-cols-2 gap-2.5">
                        {priorityCards.map((card, index) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 + index * 0.06 }}
                            >
                                <SoftCard
                                    className={cn(
                                        'p-3.5 cursor-pointer hover:shadow-md transition-all relative overflow-hidden active:scale-[0.97]',
                                        card.urgent && 'ring-1.5 ring-red-500/20'
                                    )}
                                    onClick={() => navigate(card.path)}
                                >
                                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', card.gradient)} />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', card.iconBg)}>
                                                <card.icon size={18} className={card.iconColor} />
                                            </div>
                                            {card.urgent && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                        </div>

                                        <Heading3 lang={currentLanguage} className="text-xl font-bold tabular-nums">
                                            {card.count}
                                        </Heading3>
                                        <BodySmall lang={currentLanguage} className="font-medium text-xs">
                                            {card.label}
                                        </BodySmall>
                                        <Caption lang={currentLanguage} className="text-muted-foreground text-[10px]">
                                            {card.sublabel}
                                        </Caption>
                                    </div>
                                </SoftCard>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* ─── Quick Navigation ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.quickNav}</Heading3>

                    <div className="grid grid-cols-3 gap-2">
                        {quickNavItems.map((item, idx) => (
                            <motion.button
                                key={item.path}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 + idx * 0.04 }}
                                onClick={() => navigate(item.path)}
                                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background border border-border/40 hover:shadow-md hover:border-primary/20 transition-all active:scale-95"
                            >
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', item.bg)}>
                                    <item.icon size={20} className={item.color} />
                                </div>
                                <span className={cn('text-[11px] font-medium text-center leading-tight', isArabic && 'font-ar-body')}>
                                    {item.label}
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>

                {/* ─── Recent Activity Feed ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Heading3 lang={currentLanguage} className="text-sm font-semibold mb-3">{t.activityFeed}</Heading3>

                    <SoftCard className="divide-y divide-border/30">
                        {recentActivity.length === 0 ? (
                            <div className="py-8 text-center">
                                <Activity size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                    {isArabic ? 'لا يوجد نشاط حديث' : 'No recent activity'}
                                </BodySmall>
                            </div>
                        ) : (
                            recentActivity.map((item, i) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: isArabic ? 10 : -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 + i * 0.03 }}
                                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/30 rounded-lg px-1 -mx-1 transition-colors"
                                    onClick={() => navigate(`/app/admin/jobs`)}
                                >
                                    <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                                        {getActivityIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <BodySmall lang={currentLanguage} className="text-xs font-medium truncate">
                                            {item.title}
                                        </BodySmall>
                                        <Caption lang={currentLanguage} className="text-muted-foreground text-[10px] capitalize">
                                            {item.status}
                                        </Caption>
                                    </div>
                                    <Caption lang={currentLanguage} className="text-muted-foreground text-[10px] shrink-0">
                                        {smartTimeAgo(item.time, currentLanguage)}
                                    </Caption>
                                </motion.div>
                            ))
                        )}
                    </SoftCard>
                </motion.div>

                {/* ─── Settings + Activity Log ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="space-y-2"
                >
                    {[
                        { icon: Activity, label: t.activityLog, path: '/app/admin/activity', color: 'text-green-600', bg: 'bg-green-500/10' },
                        { icon: Settings, label: t.settings, path: '/app/settings', color: 'text-slate-600', bg: 'bg-slate-500/10' },
                    ].map((item) => (
                        <SoftCard
                            key={item.path}
                            className="p-3.5 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                            onClick={() => navigate(item.path)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', item.bg)}>
                                    <item.icon size={18} className={item.color} />
                                </div>
                                <BodySmall lang={currentLanguage} className="font-medium text-sm">
                                    {item.label}
                                </BodySmall>
                            </div>
                            <ChevronRight size={16} className={cn('text-muted-foreground', isArabic && 'rotate-180')} />
                        </SoftCard>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
