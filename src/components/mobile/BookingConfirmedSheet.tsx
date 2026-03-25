import { motion } from 'framer-motion';
import { CheckCircle, Shield, Clock, ArrowRight, BadgeCheck, Calendar, User, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';

interface BookingConfirmedSheetProps {
    currentLanguage: 'en' | 'ar';
    providerName: string;
    providerId: string;
    providerRating?: number;
    providerJobsCompleted?: number;
    isVerified?: boolean;
    amount: number;
    estimatedDuration?: string;
    startDate?: string;
    onContinue: () => void;
}

export const BookingConfirmedSheet = ({
    currentLanguage,
    providerName,
    providerId,
    providerRating = 0,
    providerJobsCompleted = 0,
    isVerified = false,
    amount,
    estimatedDuration,
    startDate,
    onContinue
}: BookingConfirmedSheetProps) => {
    const { formatAmount } = useCurrency();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        notificationSuccess();
    }, []);

    const content = {
        en: {
            title: "You're in good hands",
            subtitle: "Your service provider is confirmed",
            providerLabel: 'Your Provider',
            verified: 'Verified',
            jobsCompleted: 'jobs completed',
            amount: 'Total',
            duration: 'Duration',
            startDate: 'Start Date',
            trustBadge1: 'MaintMENA Protection',
            trustBadge2: 'No Hidden Fees',
            trustBadge3: 'Quality Guaranteed',
            whatsNext: "What happens next",
            step1: 'Contract sent to provider',
            step2: 'Provider signs & confirms',
            step3: 'Job begins on scheduled date',
            socialProof: `${providerName} has helped ${providerJobsCompleted} homeowners like you`,
            continue: 'View Contract Details'
        },
        ar: {
            title: 'أنت في أيدٍ أمينة',
            subtitle: 'تم تأكيد مقدم الخدمة',
            providerLabel: 'مقدم الخدمة',
            verified: 'موثق',
            jobsCompleted: 'عمل منجز',
            amount: 'المبلغ',
            duration: 'المدة',
            startDate: 'تاريخ البدء',
            trustBadge1: 'حماية MaintMENA',
            trustBadge2: 'بدون رسوم مخفية',
            trustBadge3: 'جودة مضمونة',
            whatsNext: 'الخطوات القادمة',
            step1: 'تم إرسال العقد للفني',
            step2: 'الفني يوقع ويؤكد',
            step3: 'يبدأ العمل في الموعد المحدد',
            socialProof: `${providerName} ساعد ${providerJobsCompleted} عائلة مثلك`,
            continue: 'عرض تفاصيل العقد'
        }
    };

    const t = content[currentLanguage];

    return (
        <div
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md space-y-5 my-6"
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <CheckCircle size={40} className="text-primary" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center space-y-1"
                >
                    <Heading1 lang={currentLanguage} className="text-2xl">
                        {t.title}
                    </Heading1>
                    <Body lang={currentLanguage} className="text-muted-foreground">
                        {t.subtitle}
                    </Body>
                </motion.div>

                {/* Provider Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <SoftCard className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                                <AvatarImage
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${providerId}`}
                                    alt={providerName}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {providerName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Heading3 lang={currentLanguage} className="truncate">
                                        {providerName}
                                    </Heading3>
                                    {isVerified && (
                                        <BadgeCheck size={18} className="text-primary fill-primary/20 shrink-0" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {providerRating > 0 && (
                                        <span className="flex items-center gap-1">
                                            ⭐ {providerRating.toFixed(1)}
                                        </span>
                                    )}
                                    {providerJobsCompleted > 0 && (
                                        <span>• {providerJobsCompleted} {t.jobsCompleted}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Job Details */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {t.amount}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-semibold text-primary">
                                    {formatAmount(amount, 'SAR')}
                                </Body>
                            </div>
                            {estimatedDuration && (
                                <div className="space-y-1">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                        <Clock size={14} />
                                        {t.duration}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium">
                                        {estimatedDuration}
                                    </Body>
                                </div>
                            )}
                        </div>
                    </SoftCard>
                </motion.div>

                {/* Trust Badges */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center gap-2 flex-wrap"
                >
                    {[t.trustBadge1, t.trustBadge2].map((badge, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-700 text-xs font-medium"
                        >
                            <Shield size={12} />
                            {badge}
                        </div>
                    ))}
                </motion.div>

                {/* Timeline - What's Next */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <SoftCard className="space-y-3">
                        <Heading3 lang={currentLanguage} className="text-sm">
                            {t.whatsNext}
                        </Heading3>
                        <div className="space-y-3">
                            {[
                                { label: t.step1, done: true },
                                { label: t.step2, done: false },
                                { label: t.step3, done: false }
                            ].map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step.done
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {step.done ? '✓' : i + 1}
                                    </div>
                                    <BodySmall lang={currentLanguage} className={step.done ? 'text-foreground' : 'text-muted-foreground'}>
                                        {step.label}
                                    </BodySmall>
                                </div>
                            ))}
                        </div>
                    </SoftCard>
                </motion.div>

                {/* Social Proof */}
                {providerJobsCompleted > 5 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-center"
                    >
                        <BodySmall lang={currentLanguage} className="text-muted-foreground">
                            {t.socialProof}
                        </BodySmall>
                    </motion.div>
                )}

                {/* Continue Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <Button
                        size="lg"
                        onClick={onContinue}
                        className="w-full h-14 rounded-full text-base font-semibold gap-2"
                    >
                        {t.continue}
                        <ArrowRight size={18} className={currentLanguage === 'ar' ? 'rotate-180' : ''} />
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
};
