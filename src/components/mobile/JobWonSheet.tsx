import { motion } from 'framer-motion';
import { Trophy, Calendar, MapPin, DollarSign, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';

interface JobWonSheetProps {
    currentLanguage: 'en' | 'ar';
    jobTitle: string;
    buyerName: string;
    amount: number;
    location?: string;
    startDate?: string;
    onViewDetails: () => void;
    onDismiss?: () => void;
}

export const JobWonSheet = ({
    currentLanguage,
    jobTitle,
    buyerName,
    amount,
    location,
    startDate,
    onViewDetails,
    onDismiss
}: JobWonSheetProps) => {
    const { formatAmount } = useCurrency();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        notificationSuccess();
    }, []);

    const content = {
        en: {
            title: 'You won the job!',
            subtitle: 'Your offer stood out',
            client: 'Client',
            amount: 'Amount',
            location: 'Location',
            startDate: 'Start Date',
            encouragement: 'Get the job done and build your reputation.',
            viewDetails: 'View Job Details',
            later: 'Later'
        },
        ar: {
            title: 'فزت بالعمل!',
            subtitle: 'عرضك كان مميز',
            client: 'العميل',
            amount: 'المبلغ',
            location: 'الموقع',
            startDate: 'تاريخ البدء',
            encouragement: 'أنجز العمل وابنِ سمعتك.',
            viewDetails: 'عرض تفاصيل العمل',
            later: 'لاحقاً'
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
                {/* Trophy Icon with glow */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center">
                            <Trophy size={44} className="text-yellow-600" />
                        </div>
                        {/* Sparkles */}
                        <motion.div
                            animate={{ y: [-2, 2, -2], rotate: [-5, 5, -5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1 -right-1"
                        >
                            <Sparkles size={20} className="text-yellow-500" />
                        </motion.div>
                        <motion.div
                            animate={{ y: [2, -2, 2], rotate: [5, -5, 5] }}
                            transition={{ duration: 2.5, repeat: Infinity }}
                            className="absolute -bottom-1 -left-1"
                        >
                            <Sparkles size={16} className="text-amber-500" />
                        </motion.div>
                        {/* Glow */}
                        <div className="absolute inset-0 rounded-full bg-yellow-500/10 blur-xl animate-pulse" />
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
                    <SoftCard className="space-y-4 border-2 border-yellow-500/30">
                        {/* Job Title */}
                        <Heading3 lang={currentLanguage} className="text-center">
                            {jobTitle}
                        </Heading3>

                        <div className="h-px bg-border/50" />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Client */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                    {t.client}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-medium">
                                    {buyerName}
                                </Body>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {t.amount}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-semibold text-green-600">
                                    {formatAmount(amount, 'SAR')}
                                </Body>
                            </div>

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

                            {/* Start Date */}
                            {startDate && (
                                <div className="space-y-1">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                        <Calendar size={14} />
                                        {t.startDate}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium">
                                        {new Date(startDate).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')}
                                    </Body>
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
                        {t.encouragement}
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
                        onClick={onViewDetails}
                        className="w-full h-14 rounded-full text-base font-semibold gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700"
                    >
                        {t.viewDetails}
                        <ArrowRight size={18} className={currentLanguage === 'ar' ? 'rotate-180' : ''} />
                    </Button>

                    {onDismiss && (
                        <Button
                            variant="ghost"
                            size="lg"
                            onClick={onDismiss}
                            className="w-full h-12 rounded-full text-muted-foreground"
                        >
                            {t.later}
                        </Button>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
};
