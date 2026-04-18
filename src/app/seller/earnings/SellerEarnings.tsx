import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ArrowUpRight, Gift, Shield, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useSellerEarnings } from '@/hooks/useSellerEarnings';
import { getAllCategories } from '@/lib/serviceCategories';
import { GradientHeader } from '@/components/mobile/GradientHeader';

interface SellerEarningsProps {
    currentLanguage: 'en' | 'ar';
}

const content = {
    ar: {
        title: 'الأرباح',
        totalEarnings: 'إجمالي الأرباح',
        platformFee: 'رسوم المنصة',
        freeIntro: 'مجاناً (فترة تعريفية)',
        yourShare: 'حصتك',
        fullEarnings: '100% من أرباحك',
        thisMonth: 'هذا الشهر',
        lastMonth: 'الشهر الماضي',
        completedJobs: 'المهام المكتملة',
        pendingPayments: 'مدفوعات معلقة',
        recentActivity: 'النشاط الأخير',
        noActivity: 'لا يوجد نشاط بعد',
        noActivityDesc: 'ستظهر هنا أرباحك ونشاطك عند إتمام أولى مهامك',
        billingInfo: 'معلومات الفوترة',
        billingDesc: 'خلال فترتك التعريفيةٌ جميع أرباحك لك بالكامل - بدون رسوم!',
        learnMore: 'اعرف المزيد',
        earned: 'ربحت',
    },
    en: {
        title: 'Earnings',
        totalEarnings: 'Total Earnings',
        platformFee: 'Platform Fee',
        freeIntro: 'Free (Introductory Period)',
        yourShare: 'Your Share',
        fullEarnings: '100% of your earnings',
        thisMonth: 'This Month',
        lastMonth: 'Last Month',
        completedJobs: 'Completed Jobs',
        pendingPayments: 'Pending Payments',
        recentActivity: 'Recent Activity',
        noActivity: 'No activity yet',
        noActivityDesc: 'Your earnings and activity will appear here once you complete your first job',
        billingInfo: 'Billing Info',
        billingDesc: 'During your introductory period, you keep 100% of your earnings — no platform fees!',
        learnMore: 'Learn more',
        earned: 'Earned',
    }
};

export const SellerEarnings = ({ currentLanguage: propLanguage }: SellerEarningsProps) => {
    const navigate = useNavigate();
    const currentLanguage = propLanguage || ((typeof window !== 'undefined' ? localStorage.getItem('preferredLanguage') : null) as 'en' | 'ar') || 'ar';
    const isRTL = currentLanguage === 'ar';
    const currencyLabel = isRTL ? 'ر.س' : 'SAR';
    const t = content[currentLanguage];

    // Real earnings data from Supabase
    const { earnings, isLoading } = useSellerEarnings();
    const allCategories = getAllCategories();

    // Resolve a category icon from the service category key string
    const getCategoryIcon = (categoryKey: string): string => {
        const found = allCategories.find(
            c => c.key === categoryKey || c.en.toLowerCase() === categoryKey.toLowerCase()
        );
        return found?.icon ?? '🔧';
    };

    return (
        <div className="min-h-screen bg-background pb-32" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />

            <div className="p-4 space-y-5">
                {/* Earnings Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)',
                    }}
                >
                    <div className="p-6 text-primary-foreground">
                        <div className="flex items-center gap-2 mb-1 opacity-80">
                            <DollarSign size={16} />
                            <span className={cn("text-sm", isRTL && "font-ar-body")}>
                                {t.thisMonth}
                            </span>
                        </div>
                        <div className={cn("text-4xl font-bold mb-6", isRTL && "font-ar-heading")}>
                            {isLoading ? '...' : `${currencyLabel} ${earnings.thisMonth.toLocaleString()}`}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Completed Jobs Badge */}
                            <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <Briefcase size={16} className="text-primary-foreground" />
                                </div>
                                <div>
                                    <div className={cn("text-xs opacity-70", isRTL && "font-ar-body")}>
                                        {t.completedJobs}
                                    </div>
                                    <div className="text-xl font-bold leading-tight">
                                        {isLoading ? '...' : earnings.completedJobs}
                                    </div>
                                </div>
                            </div>

                            {/* Pending Payments */}
                            <div className="bg-white/10 rounded-2xl p-3">
                                <div className={cn("text-xs opacity-70 mb-1", isRTL && "font-ar-body")}>
                                    {t.pendingPayments}
                                </div>
                                <div className="text-xl font-bold">
                                    {isLoading ? '...' : `${currencyLabel} ${earnings.pendingPayments.toLocaleString()}`}
                                </div>
                            </div>

                            {/* Month comparison line graph */}
                            <div className="bg-white/10 rounded-2xl p-3 col-span-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn("text-xs opacity-70", isRTL && "font-ar-body")}>
                                        {t.thisMonth} vs {t.lastMonth}
                                    </span>
                                    {!isLoading && earnings.lastMonth > 0 && (
                                        <span className={cn(
                                            "text-[11px] font-bold flex items-center gap-0.5",
                                            earnings.thisMonth >= earnings.lastMonth ? "text-emerald-300" : "text-red-300"
                                        )}>
                                            <ArrowUpRight
                                                size={12}
                                                className={cn("shrink-0", earnings.thisMonth < earnings.lastMonth && "rotate-90")}
                                            />
                                            {Math.round(Math.abs(((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth) * 100))}%
                                        </span>
                                    )}
                                </div>

                                {/* SVG line graph */}
                                {isLoading ? (
                                    <div className="h-14 w-full animate-pulse rounded bg-white/10" />
                                ) : (
                                    <svg
                                        viewBox="0 0 200 56"
                                        preserveAspectRatio="none"
                                        className="w-full h-14"
                                    >
                                        <defs>
                                            <linearGradient id="earningsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="rgba(255,255,255,0.30)" />
                                                <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                                            </linearGradient>
                                        </defs>
                                        {(() => {
                                            const padV = 6;
                                            const h = 56 - padV * 2;
                                            const max = Math.max(earnings.thisMonth, earnings.lastMonth, 1);
                                            const x1 = 16, x2 = 184;
                                            const y1 = padV + h - (earnings.lastMonth / max) * h;
                                            const y2 = padV + h - (earnings.thisMonth / max) * h;
                                            const bottom = 56 - padV + 4;
                                            return (
                                                <>
                                                    <path
                                                        d={`M ${x1},${y1} L ${x2},${y2} L ${x2},${bottom} L ${x1},${bottom} Z`}
                                                        fill="url(#earningsAreaGrad)"
                                                    />
                                                    <line
                                                        x1={x1} y1={y1} x2={x2} y2={y2}
                                                        stroke="rgba(255,255,255,0.85)"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                    />
                                                    <circle cx={x1} cy={y1} r="3.5" fill="rgba(255,255,255,0.55)" />
                                                    <circle cx={x2} cy={y2} r="5" fill="white" />
                                                </>
                                            );
                                        })()}
                                    </svg>
                                )}

                                <div className={cn("flex justify-between mt-1 text-xs font-semibold opacity-90", isRTL && "flex-row-reverse")}>
                                    <span className="opacity-60">{t.lastMonth}: {currencyLabel} {isLoading ? '...' : earnings.lastMonth.toLocaleString()}</span>
                                    <span>{t.thisMonth}: {currencyLabel} {isLoading ? '...' : earnings.thisMonth.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Billing Info Card — Phase 0 Free Period */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-5"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <Gift size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className={cn(
                                "font-semibold text-emerald-800 dark:text-emerald-300 mb-1",
                                isRTL && "font-ar-heading"
                            )}>
                                {t.platformFee}
                            </h3>
                            <div className={cn(
                                "text-2xl font-bold text-emerald-700 dark:text-emerald-400 mb-1",
                                isRTL && "font-ar-heading"
                            )}>
                                {currencyLabel} 0
                            </div>
                            <p className={cn(
                                "text-sm text-emerald-600/80 dark:text-emerald-400/80",
                                isRTL && "font-ar-body"
                            )}>
                                {t.freeIntro}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-emerald-500/10 flex items-center gap-2">
                        <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
                        <span className={cn("text-xs text-emerald-600/80 dark:text-emerald-400/80", isRTL && "font-ar-body")}>
                            {t.billingDesc}
                        </span>
                    </div>
                </motion.div>

                {/* Your Share Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="rounded-2xl border border-border/50 bg-card p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={cn("font-semibold", isRTL && "font-ar-heading")}>
                            {t.yourShare}
                        </h3>
                        <span className="text-2xl font-bold text-primary">100%</span>
                    </div>
                    <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden">
                        <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                    <p className={cn("text-sm text-muted-foreground mt-2", isRTL && "font-ar-body")}>
                        {t.fullEarnings}
                    </p>
                </motion.div>

                {/* Recent Activity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-2xl border border-border/50 bg-card p-5"
                >
                    <h3 className={cn("font-semibold mb-4", isRTL && "font-ar-heading")}>
                        {t.recentActivity}
                    </h3>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : earnings.recentTransactions.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <TrendingUp size={28} className="text-muted-foreground/50" />
                            </div>
                            <p className={cn("text-sm font-medium text-muted-foreground mb-1", isRTL && "font-ar-heading")}>
                                {t.noActivity}
                            </p>
                            <p className={cn("text-xs text-muted-foreground/60 max-w-[200px]", isRTL && "font-ar-body")}>
                                {t.noActivityDesc}
                            </p>
                        </div>
                    ) : (
                        /* Real transactions list */
                        <div className="space-y-3">
                            {earnings.recentTransactions.map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-base leading-none select-none">
                                            {getCategoryIcon(tx.service_type)}
                                        </div>
                                        <div>
                                            <p className={cn("text-sm font-medium capitalize", isRTL && "font-ar-body")}>
                                                {tx.service_type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={cn("block text-sm font-semibold text-emerald-600 dark:text-emerald-400", isRTL && "font-ar-heading")}>
                                            +{currencyLabel} {tx.amount.toLocaleString()}
                                        </span>
                                        <span className="block text-xs text-muted-foreground capitalize">{tx.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};




