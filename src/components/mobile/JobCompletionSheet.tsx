import { motion } from 'framer-motion';
import { CheckCircle, MapPin, DollarSign, Clock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';

interface JobCompletionSheetProps {
    currentLanguage: 'en' | 'ar';
    jobTitle: string;
    providerName: string;
    providerId: string;
    finalAmount: number;
    location?: string;
    duration?: string;
    completedJobsCount?: number;
    onContinueToReview: () => void;
    onSkip?: () => void;
}

export const JobCompletionSheet = ({
    currentLanguage,
    jobTitle,
    providerName,
    providerId,
    finalAmount,
    location,
    duration,
    completedJobsCount = 1,
    onContinueToReview,
    onSkip
}: JobCompletionSheetProps) => {
    const { formatAmount } = useCurrency();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        // Haptic feedback on mount
        notificationSuccess();
    }, []);

    const content = {
        en: {
            title: 'Your home is taken care of',
            subtitle: 'Job completed successfully',
            problem: 'Service',
            provider: 'Provider',
            cost: 'Final Cost',
            duration: 'Duration',
            location: 'Location',
            milestone: `That's ${completedJobsCount} ${completedJobsCount === 1 ? 'problem' : 'problems'} solved with MaintMENA`,
            shareExperience: 'Share your experience',
            skip: 'Maybe later'
        },
        ar: {
            title: 'تم الاهتمام بمنزلك',
            subtitle: 'تم إنجاز العمل بنجاح',
            problem: 'الخدمة',
            provider: 'مقدم الخدمة',
            cost: 'التكلفة النهائية',
            duration: 'المدة',
            location: 'الموقع',
            milestone: `هذه المشكلة رقم ${completedJobsCount} التي حللتها مع MaintMENA`,
            shareExperience: 'شارك تجربتك',
            skip: 'لاحقاً'
        }
    };

    const t = content[currentLanguage];

    // Draw-in checkmark animation path
    const checkmarkPath = "M5 13l4 4L19 7";

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
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                className="text-green-600"
                            >
                                <motion.path
                                    d={checkmarkPath}
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                                />
                            </svg>
                        </div>
                        {/* Subtle glow */}
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

                {/* Job Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <SoftCard className="space-y-4">
                        {/* Provider */}
                        <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12">
                                <AvatarImage
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${providerId}`}
                                    alt={providerName}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                    {providerName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                    {t.provider}
                                </BodySmall>
                                <Heading3 lang={currentLanguage}>{providerName}</Heading3>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Service */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <User size={14} />
                                    {t.problem}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-medium truncate">
                                    {jobTitle}
                                </Body>
                            </div>

                            {/* Cost */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {t.cost}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-semibold text-primary">
                                    {formatAmount(finalAmount, 'SAR')}
                                </Body>
                            </div>

                            {/* Duration */}
                            {duration && (
                                <div className="space-y-1">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                        <Clock size={14} />
                                        {t.duration}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium">
                                        {duration}
                                    </Body>
                                </div>
                            )}

                            {/* Location */}
                            {location && (
                                <div className="space-y-1">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                        <MapPin size={14} />
                                        {t.location}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium truncate">
                                        {location}
                                    </Body>
                                </div>
                            )}
                        </div>
                    </SoftCard>
                </motion.div>

                {/* Milestone Message */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                >
                    <Body lang={currentLanguage} className="text-muted-foreground text-sm">
                        {t.milestone}
                    </Body>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="space-y-3"
                >
                    <Button
                        size="lg"
                        onClick={onContinueToReview}
                        className="w-full h-14 rounded-full text-base font-semibold gap-2"
                    >
                        {t.shareExperience}
                        <ArrowRight size={18} className={currentLanguage === 'ar' ? 'rotate-180' : ''} />
                    </Button>

                    {onSkip && (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={onSkip}
                            className="w-full h-12 rounded-full text-muted-foreground"
                        >
                            {t.skip}
                        </Button>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};
