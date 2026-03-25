import { motion } from 'framer-motion';
import { Banknote, TrendingUp, Star, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';

interface EarningsSheetProps {
    currentLanguage: 'en' | 'ar';
    jobEarnings: number;
    totalJobsCompleted?: number;
    rating?: number;
    onContinue: () => void;
}

export const EarningsSheet = ({
    currentLanguage,
    jobEarnings,
    totalJobsCompleted = 1,
    rating,
    onContinue
}: EarningsSheetProps) => {
    const { formatAmount } = useCurrency();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        notificationSuccess();
    }, []);

    const content = {
        en: {
            title: 'Job Complete! 💰',
            subtitle: 'Another satisfied customer',
            thisJob: 'This Job',
            totalJobs: 'Total Jobs with MaintMENA',
            rating: 'Your Rating',
            encouragement: 'Keep building your reputation!',
            continue: 'Continue'
        },
        ar: {
            title: 'تم إنجاز العمل! 💰',
            subtitle: 'عميل آخر راضٍ',
            thisJob: 'هذا العمل',
            totalJobs: 'إجمالي الأعمال مع MaintMENA',
            rating: 'تقييمك',
            encouragement: 'استمر في بناء سمعتك!',
            continue: 'متابعة'
        }
    };

    const t = content[currentLanguage];

    return (
        <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md space-y-6"
            >
                {/* Money Icon */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                            <Banknote size={44} className="text-green-600" />
                        </div>
                        {/* Sparkles */}
                        <motion.div
                            animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1"
                        >
                            <Sparkles size={20} className="text-green-500" />
                        </motion.div>
                        {/* Glow */}
                        <div className="absolute inset-0 rounded-full bg-green-500/10 blur-xl animate-pulse" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center space-y-2"
                >
                    <Heading1 lang={currentLanguage} className="text-2xl">
                        {t.title}
                    </Heading1>
                    <Body lang={currentLanguage} className="text-muted-foreground">
                        {t.subtitle}
                    </Body>
                </motion.div>

                {/* Earnings Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <SoftCard className="space-y-4 border-2 border-green-500/30">
                        {/* This Job Earnings */}
                        <div className="text-center py-2">
                            <BodySmall lang={currentLanguage} className="text-muted-foreground mb-1">
                                {t.thisJob}
                            </BodySmall>
                            <Heading1 lang={currentLanguage} className="text-3xl text-green-600">
                                {formatAmount(jobEarnings, 'SAR')}
                            </Heading1>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Total Jobs */}
                            <div className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                    <TrendingUp size={16} />
                                </div>
                                <Heading3 lang={currentLanguage}>{totalJobsCompleted}</Heading3>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground text-xs">
                                    {t.totalJobs}
                                </BodySmall>
                            </div>

                            {/* Rating */}
                            {rating !== undefined && rating > 0 && (
                                <div className="text-center space-y-1">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                        <Star size={16} className="fill-yellow-500 text-yellow-500" />
                                    </div>
                                    <Heading3 lang={currentLanguage}>{rating.toFixed(1)}</Heading3>
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground text-xs">
                                        {t.rating}
                                    </BodySmall>
                                </div>
                            )}
                        </div>
                    </SoftCard>
                </motion.div>

                {/* Encouragement */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                >
                    <Body lang={currentLanguage} className="text-muted-foreground text-sm">
                        {t.encouragement} 👍
                    </Body>
                </motion.div>

                {/* Continue Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <Button
                        size="lg"
                        onClick={onContinue}
                        className="w-full h-14 rounded-full text-base font-semibold gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                        {t.continue}
                        <ArrowRight size={18} className={currentLanguage === 'ar' ? 'rotate-180' : ''} />
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
};
