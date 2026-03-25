import { motion } from 'framer-motion';
import { FileCheck, Calendar, MapPin, DollarSign, User, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Heading1, Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { useCurrency } from '@/hooks/useCurrency';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';

interface ContractExecutedSheetProps {
    currentLanguage: 'en' | 'ar';
    userRole: 'buyer' | 'seller';
    otherPartyName: string;
    jobTitle: string;
    amount: number;
    scheduledDate?: string;
    location?: string;
    onContinue: () => void;
    onAddToCalendar?: () => void;
}

export const ContractExecutedSheet = ({
    currentLanguage,
    userRole,
    otherPartyName,
    jobTitle,
    amount,
    scheduledDate,
    location,
    onContinue,
    onAddToCalendar
}: ContractExecutedSheetProps) => {
    const { formatAmount } = useCurrency();
    const { notificationSuccess } = useHaptics();

    useEffect(() => {
        notificationSuccess();
    }, []);

    const content = {
        en: {
            buyer: {
                title: 'All Set!',
                subtitle: `${otherPartyName} is preparing for your visit`,
                reminder: "We'll remind you before the scheduled time"
            },
            seller: {
                title: 'Job Confirmed!',
                subtitle: 'Save this time in your schedule',
                reminder: 'Get ready for the visit'
            },
            jobLabel: 'Service',
            amount: 'Amount',
            date: 'Scheduled',
            location: 'Location',
            provider: 'Provider',
            client: 'Client',
            addToCalendar: 'Add to Calendar',
            continue: 'View Details'
        },
        ar: {
            buyer: {
                title: 'كل شيء جاهز!',
                subtitle: `${otherPartyName} يستعد لزيارتك`,
                reminder: 'سنذكّرك قبل الموعد المحدد'
            },
            seller: {
                title: 'تم تأكيد العمل!',
                subtitle: 'احفظ هذا الموعد في جدولك',
                reminder: 'استعد للزيارة'
            },
            jobLabel: 'الخدمة',
            amount: 'المبلغ',
            date: 'الموعد',
            location: 'الموقع',
            provider: 'مقدم الخدمة',
            client: 'العميل',
            addToCalendar: 'أضف للتقويم',
            continue: 'عرض التفاصيل'
        }
    };

    const t = content[currentLanguage];
    const roleContent = t[userRole];

    // Checkmark path for draw animation
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
                {/* Success Icon with animated checkmark */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="text-primary-foreground"
                                >
                                    <motion.path
                                        d={checkmarkPath}
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0, opacity: 0 }}
                                        animate={{ pathLength: 1, opacity: 1 }}
                                        transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                                    />
                                </svg>
                            </div>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-center space-y-2"
                >
                    <Heading1 lang={currentLanguage} className="text-2xl">
                        {roleContent.title}
                    </Heading1>
                    <Body lang={currentLanguage} className="text-muted-foreground">
                        {roleContent.subtitle}
                    </Body>
                </motion.div>

                {/* Job Details Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <SoftCard className="space-y-4">
                        {/* Job Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileCheck size={20} className="text-primary" />
                            </div>
                            <div>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground">
                                    {t.jobLabel}
                                </BodySmall>
                                <Heading3 lang={currentLanguage}>{jobTitle}</Heading3>
                            </div>
                        </div>

                        <div className="h-px bg-border/50" />

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Other Party */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <User size={14} />
                                    {userRole === 'buyer' ? t.provider : t.client}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-medium">
                                    {otherPartyName}
                                </Body>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign size={14} />
                                    {t.amount}
                                </BodySmall>
                                <Body lang={currentLanguage} className="font-semibold text-primary">
                                    {formatAmount(amount, 'SAR')}
                                </Body>
                            </div>

                            {/* Scheduled Date */}
                            {scheduledDate && (
                                <div className="space-y-1">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground flex items-center gap-1">
                                        <Calendar size={14} />
                                        {t.date}
                                    </BodySmall>
                                    <Body lang={currentLanguage} className="font-medium">
                                        {new Date(scheduledDate).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')}
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

                {/* Reminder */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center"
                >
                    <BodySmall lang={currentLanguage} className="text-muted-foreground">
                        {roleContent.reminder}
                    </BodySmall>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="space-y-3"
                >
                    {/* Add to Calendar - for seller */}
                    {userRole === 'seller' && onAddToCalendar && scheduledDate && (
                        <Button
                            size="lg"
                            variant="outline"
                            onClick={onAddToCalendar}
                            className="w-full h-12 rounded-full text-base font-medium gap-2"
                        >
                            <Calendar size={18} />
                            {t.addToCalendar}
                        </Button>
                    )}

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
