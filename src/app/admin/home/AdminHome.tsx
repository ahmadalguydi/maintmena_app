import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AdminHomeProps {
    currentLanguage: 'en' | 'ar';
}

export const AdminHome = ({ currentLanguage }: AdminHomeProps) => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const isArabic = currentLanguage === 'ar';

    // Fetch priority stats - wrapped in try-catch for resilience
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-mobile-stats'],
        queryFn: async () => {
            let pendingReports = 0;
            let haltedJobs = 0;
            let totalUsers = 0;
            let openChats = 0;
            let pendingScores = 0;

            try {
                const { count } = await supabase.from('user_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending');
                pendingReports = count || 0;
            } catch (e) { /* table may not exist */ }

            try {
                const { count } = await supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('halted', true);
                haltedJobs = count || 0;
            } catch (e) { /* column may not exist */ }

            try {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
                totalUsers = count || 0;
            } catch (e) { /* unlikely */ }

            try {
                const { count } = await supabase.from('support_chats').select('id', { count: 'exact', head: true }).eq('status', 'open');
                openChats = count || 0;
            } catch (e) { /* table may not exist */ }

            try {
                // Use type assertion until types are regenerated
                const { count } = await (supabase.from('profiles').select('id', { count: 'exact', head: true }) as any).eq('trust_score_pending', true);
                pendingScores = count || 0;
            } catch (e) { /* column may not exist */ }

            return { pendingReports, haltedJobs, totalUsers, openChats, pendingScores };
        },
        refetchInterval: 30000,
    });

    const content = {
        en: {
            title: 'Admin',
            greeting: 'Welcome back',
            priorityQueue: 'Priority Queue',
            reports: 'User Reports',
            reportsSub: 'Pending moderation',
            disputes: 'Disputes',
            disputesSub: 'Halted jobs',
            support: 'Support Chats',
            supportSub: 'Open conversations',
            users: 'Users',
            usersSub: 'Total registered',
            quickActions: 'Quick Actions',
            viewAll: 'View All',
            settings: 'Settings',
            logout: 'Logout',
            trustScores: 'Trust Scores',
            trustScoresSub: 'Pending review',
        },
        ar: {
            title: 'الإدارة',
            greeting: 'أهلاً بعودتك',
            priorityQueue: 'قائمة الأولوية',
            reports: 'بلاغات المستخدمين',
            reportsSub: 'في انتظار المراجعة',
            disputes: 'النزاعات',
            disputesSub: 'الأعمال المتوقفة',
            support: 'الدعم الفني',
            supportSub: 'محادثات مفتوحة',
            users: 'المستخدمين',
            usersSub: 'إجمالي المسجلين',
            quickActions: 'إجراءات سريعة',
            viewAll: 'عرض الكل',
            settings: 'الإعدادات',
            logout: 'تسجيل خروج',
            trustScores: 'نقاط الثقة',
            trustScoresSub: 'في انتظار المراجعة',
        },
    };

    const t = content[currentLanguage];

    const priorityCards = [
        {
            id: 'reports',
            icon: Flag,
            label: t.reports,
            sublabel: t.reportsSub,
            count: stats?.pendingReports || 0,
            color: 'from-red-500 to-orange-500',
            bgColor: 'bg-red-500/10',
            path: '/app/admin/reports',
            urgent: (stats?.pendingReports || 0) > 0,
        },
        {
            id: 'disputes',
            icon: AlertTriangle,
            label: t.disputes,
            sublabel: t.disputesSub,
            count: stats?.haltedJobs || 0,
            color: 'from-amber-500 to-yellow-500',
            bgColor: 'bg-amber-500/10',
            path: '/app/admin/disputes',
            urgent: (stats?.haltedJobs || 0) > 0,
        },
        {
            id: 'support',
            icon: MessageCircle,
            label: t.support,
            sublabel: t.supportSub,
            count: stats?.openChats || 0,
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'bg-blue-500/10',
            path: '/app/admin/support',
            urgent: false,
        },
        {
            id: 'users',
            icon: Users,
            label: t.users,
            sublabel: t.usersSub,
            count: stats?.totalUsers || 0,
            color: 'from-purple-500 to-pink-500',
            bgColor: 'bg-purple-500/10',
            path: '/app/admin/users',
            urgent: false,
        },
        {
            id: 'scores',
            icon: Shield,
            label: t.trustScores,
            sublabel: t.trustScoresSub,
            count: stats?.pendingScores || 0,
            color: 'from-teal-500 to-emerald-500',
            bgColor: 'bg-teal-500/10',
            path: '/app/admin/scores',
            urgent: (stats?.pendingScores || 0) > 0,
        },
    ];

    const handleLogout = async () => {
        await signOut();
        navigate('/app');
    };

    return (
        <div className="pb-28 min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
            <GradientHeader title={t.title} />

            <div className="px-4 py-6 space-y-6">
                {/* Greeting */}
                <div className="flex items-center justify-between">
                    <div>
                        <Caption lang={currentLanguage} className="text-muted-foreground">
                            {t.greeting}
                        </Caption>
                        <Heading2 lang={currentLanguage} className="text-xl">
                            {user?.email}
                        </Heading2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        onClick={handleLogout}
                    >
                        <LogOut size={20} />
                    </Button>
                </div>

                {/* Priority Queue */}
                <div>
                    <Heading3 lang={currentLanguage} className="mb-4">
                        {t.priorityQueue}
                    </Heading3>

                    <div className="grid grid-cols-2 gap-3">
                        {priorityCards.map((card, index) => (
                            <motion.div
                                key={card.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <SoftCard
                                    className={cn(
                                        'p-4 cursor-pointer hover:shadow-lg transition-all relative overflow-hidden',
                                        card.urgent && 'ring-2 ring-red-500/30'
                                    )}
                                    onClick={() => navigate(card.path)}
                                >
                                    {/* Background Gradient */}
                                    <div
                                        className={cn(
                                            'absolute inset-0 opacity-5 bg-gradient-to-br',
                                            card.color
                                        )}
                                    />

                                    <div className="relative z-10">
                                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.bgColor)}>
                                            <card.icon size={20} className="text-foreground" />
                                        </div>

                                        <div className="flex items-end justify-between">
                                            <div>
                                                <Heading3 lang={currentLanguage} className="text-2xl font-bold">
                                                    {card.count}
                                                </Heading3>
                                                <BodySmall lang={currentLanguage} className="font-medium">
                                                    {card.label}
                                                </BodySmall>
                                                <Caption lang={currentLanguage} className="text-muted-foreground text-xs">
                                                    {card.sublabel}
                                                </Caption>
                                            </div>

                                            {card.urgent && (
                                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                        </div>
                                    </div>
                                </SoftCard>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <Heading3 lang={currentLanguage} className="mb-4">
                        {t.quickActions}
                    </Heading3>

                    <div className="space-y-2">
                        <SoftCard
                            className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => navigate('/app/admin/activity')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                                    <Activity size={20} className="text-green-600" />
                                </div>
                                <BodySmall lang={currentLanguage} className="font-medium">
                                    {isArabic ? 'سجل النشاط' : 'Activity Log'}
                                </BodySmall>
                            </div>
                            <ChevronRight size={18} className={cn('text-muted-foreground', isArabic && 'rotate-180')} />
                        </SoftCard>

                        <SoftCard
                            className="p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => navigate('/app/admin/settings')}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                                    <Settings size={20} className="text-slate-600" />
                                </div>
                                <BodySmall lang={currentLanguage} className="font-medium">
                                    {t.settings}
                                </BodySmall>
                            </div>
                            <ChevronRight size={18} className={cn('text-muted-foreground', isArabic && 'rotate-180')} />
                        </SoftCard>
                    </div>
                </div>
            </div>
        </div>
    );
};
