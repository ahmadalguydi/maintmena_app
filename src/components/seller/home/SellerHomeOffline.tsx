import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import { DemandHeatmap } from './DemandHeatmap';
import { NearbyDemandList } from './NearbyDemandList';
import { DemandForecast } from './DemandForecast';
import { EarningsTeaser } from './EarningsTeaser';
import { GoOnlineButton } from './GoOnlineButton';
import { ServiceRadiusSelector } from './ServiceRadiusSelector';
import { SellerSetupChecklist } from './SellerSetupChecklist';
import type { ProfileCompleteness } from './SellerSetupChecklist';

interface SellerHomeOfflineProps {
    currentLanguage: 'en' | 'ar';
    onGoOnline: () => void;
    isConnecting?: boolean;
    serviceRadius: number;
    onRadiusChange: (radius: number) => void;
    profileCompleteness: ProfileCompleteness;
}

export function SellerHomeOffline({
    currentLanguage,
    onGoOnline,
    isConnecting,
    serviceRadius,
    onRadiusChange,
    profileCompleteness,
}: SellerHomeOfflineProps) {
    const isComplete = profileCompleteness.isComplete;

    const content = {
        ar: {
            youreOffline: 'أنت غير متصل',
            readyToTake: isComplete ? 'هل أنت جاهز لاستقبال الطلبات؟' : 'أكمل إعداد ملفك الشخصي أولاً',
            statusOffline: 'غير متصل',
            goOnlineHint: 'اتصل لتبدأ استقبال الطلبات',
            profileNeeded: 'أكمل ملفك الشخصي',
        },
        en: {
            youreOffline: "You're Offline",
            readyToTake: isComplete ? 'Ready to take requests?' : 'Complete your profile setup first',
            statusOffline: 'Offline',
            goOnlineHint: 'Go online to start receiving requests',
            profileNeeded: 'Complete your profile first',
        },
    };

    const t = content[currentLanguage];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col space-y-5"
        >
            {/* Hero Section */}
            <div className="rounded-3xl bg-card border border-border/40 p-6 text-center relative overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 60%), radial-gradient(circle at 80% 50%, hsl(var(--primary)) 0%, transparent 60%)',
                }} />

                <div className="relative">
                    {/* Offline indicator */}
                    <div className="inline-flex items-center gap-2 mb-4">
                        <div className="relative flex h-3 w-3">
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-muted-foreground/30" />
                        </div>
                        <span className={cn(
                            "text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            {t.statusOffline}
                        </span>
                    </div>

                    <h2 className={cn(
                        "text-2xl font-extrabold text-foreground leading-tight",
                        currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                    )}>
                        {t.youreOffline}
                    </h2>
                    <p className={cn(
                        "text-sm text-muted-foreground mt-1.5",
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        {isComplete ? t.goOnlineHint : t.profileNeeded}
                    </p>

                    {/* Earnings potential hint */}
                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40"
                        >
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className={cn("text-xs font-semibold text-emerald-700 dark:text-emerald-300", currentLanguage === 'ar' ? 'font-ar-body' : '')}>
                                {currentLanguage === 'ar' ? 'طلبات متاحة في منطقتك' : 'Requests available in your area'}
                            </span>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Setup Checklist (only shown if profile is incomplete) */}
            {!isComplete && (
                <SellerSetupChecklist
                    currentLanguage={currentLanguage}
                    completeness={profileCompleteness}
                />
            )}

            <div className="space-y-4">
                {/* Combined Map & Demand Card */}
                <div className="rounded-3xl bg-card shadow-soft overflow-hidden border border-border/40">
                    <DemandHeatmap currentLanguage={currentLanguage} />
                    <NearbyDemandList currentLanguage={currentLanguage} />
                </div>

                <DemandForecast currentLanguage={currentLanguage} />
                <ServiceRadiusSelector
                    currentLanguage={currentLanguage}
                    radius={serviceRadius}
                    onRadiusChange={onRadiusChange}
                />
                <EarningsTeaser currentLanguage={currentLanguage} />
                {/* GoOnlineButton is visually dimmed and non-functional when profile is incomplete */}
                <div className={cn(!isComplete && 'opacity-40 pointer-events-none select-none')}>
                    <GoOnlineButton
                        currentLanguage={currentLanguage}
                        onPress={onGoOnline}
                        isLoading={isConnecting}
                    />
                </div>
            </div>
        </motion.div>
    );
}
