import { motion } from 'framer-motion';
import { CheckCircle, Calendar, MapPin, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuccessScreenProps {
    currentLanguage: 'en' | 'ar';
    title: string;
    subtitle: string;
    summary: {
        serviceIcon: React.ReactNode;
        serviceName: string;
        date: string;
        location: string;
    };
    primaryActionLabel: string;
    onPrimaryAction: () => void;
    onClose?: () => void; // Added optional close handler
    isRedirecting?: boolean;
}

export const SuccessScreen = ({
    currentLanguage,
    title,
    subtitle,
    summary,
    primaryActionLabel,
    onPrimaryAction,
    onClose,
    isRedirecting = false
}: SuccessScreenProps) => {
    const isArabic = currentLanguage === 'ar';

    const t = {
        requestSummary: isArabic ? 'ملخص الطلب' : 'Request Summary',
        serviceType: isArabic ? 'نوع الخدمة' : 'Service Type',
        dateTime: isArabic ? 'التاريخ والوقت' : 'Date & Time',
        location: isArabic ? 'الموقع' : 'Location',
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-background flex flex-col"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Header - X Button Actions */}
            <div className="flex items-center justify-end p-4">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    className="flex justify-center mb-6"
                >
                    <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center mb-8"
                >
                    <h1 className={cn(
                        "text-2xl font-bold text-foreground mb-2",
                        isArabic && "font-['Noto_Sans_Arabic']"
                    )}>
                        {title}
                    </h1>
                    <p className={cn(
                        "text-muted-foreground",
                        isArabic && "font-['Noto_Sans_Arabic']"
                    )}>
                        {subtitle}
                    </p>
                </motion.div>

                {/* Request Summary Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <span className={cn(
                            "text-xs font-medium text-primary uppercase tracking-wide",
                            isArabic && "font-['Noto_Sans_Arabic']"
                        )}>
                            {t.requestSummary}
                        </span>
                    </div>

                    {/* Service Type */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl text-primary">
                            {summary.serviceIcon}
                        </div>
                        <div>
                            <p className={cn(
                                "text-xs text-muted-foreground",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>{t.serviceType}</p>
                            <p className={cn(
                                "font-semibold",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>
                                {summary.serviceName}
                            </p>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className={cn(
                                "text-xs text-muted-foreground",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>{t.dateTime}</p>
                            <p className={cn(
                                "font-semibold flex items-center gap-1",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>
                                <span dir="ltr">{summary.date}</span>
                            </p>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className={cn(
                                "text-xs text-muted-foreground",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>{t.location}</p>
                            <p className={cn(
                                "font-semibold",
                                isArabic && "font-['Noto_Sans_Arabic']"
                            )}>
                                {summary.location}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 pb-safe bg-white border-t border-gray-50">
                <Button
                    size="lg"
                    onClick={onPrimaryAction}
                    className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                    disabled={isRedirecting}
                >
                    {isArabic && <ArrowRight className="w-5 h-5 rotate-180 ml-2" />}
                    <span>{primaryActionLabel}</span>
                    {!isArabic && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
            </div>
        </div>
    );
};
