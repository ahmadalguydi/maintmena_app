import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
        },
        en: {
            youreOffline: "You're Offline",
            readyToTake: isComplete ? 'Ready to take requests?' : 'Complete your profile setup first',
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col space-y-5"
        >
            {/* Hero Text */}
            <div className="text-center">
                <h2 className={cn(
                    "text-2xl font-extrabold text-foreground leading-tight",
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                    {content[currentLanguage].youreOffline}
                </h2>
                <p className={cn(
                    "text-sm text-muted-foreground mt-1",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {content[currentLanguage].readyToTake}
                </p>
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
