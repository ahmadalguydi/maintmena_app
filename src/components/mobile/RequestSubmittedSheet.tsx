import { motion } from 'framer-motion';
import { CheckCircle, Wrench, Calendar, MapPin, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptics } from '@/hooks/useHaptics';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/serviceCategories';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { SAUDI_CITIES_BILINGUAL } from "@/lib/saudiCities";

interface RequestSubmittedSheetProps {
    currentLanguage: 'en' | 'ar';
    requestId: string;
    serviceCategory: string;
    date?: string | null;
    timeSlot?: string | null;
    location: string;
    buyerName?: string;
    onClose: () => void;
}

export const RequestSubmittedSheet = ({
    currentLanguage,
    requestId,
    serviceCategory,
    date,
    timeSlot,
    location,
    buyerName = '',
    onClose
}: RequestSubmittedSheetProps) => {
    const { notificationSuccess } = useHaptics();
    const navigate = useNavigate();

    useEffect(() => {
        notificationSuccess();
    }, []);

    const t = {
        title: currentLanguage === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Request Submitted Successfully!',
        subtitle: currentLanguage === 'ar'
            ? `شكراً لك${buyerName ? ` ${buyerName}` : ''}. تم إرسال طلبك لمقدمي الخدمات الموثوقين.`
            : `Thank you${buyerName ? `, ${buyerName}` : ''}. Your request has been sent to our top-rated providers.`,
        requestSummary: currentLanguage === 'ar' ? 'ملخص الطلب' : 'Request Summary',
        serviceType: currentLanguage === 'ar' ? 'نوع الخدمة' : 'Service Type',
        dateTime: currentLanguage === 'ar' ? 'التاريخ والوقت' : 'Date & Time',
        locationLabel: currentLanguage === 'ar' ? 'الموقع' : 'Location',
        requestId: currentLanguage === 'ar' ? 'رقم الطلب' : 'Request ID',
        trackStatus: currentLanguage === 'ar' ? 'تتبع حالة الطلب' : 'Track Request Status',
        flexible: currentLanguage === 'ar' ? 'مرن' : 'Flexible',
        morning: currentLanguage === 'ar' ? 'صباحاً' : 'Morning',
        afternoon: currentLanguage === 'ar' ? 'ظهراً' : 'Afternoon',
        night: currentLanguage === 'ar' ? 'مساءً' : 'Night',
    };

    const getTimeLabel = (slot: string | null | undefined) => {
        if (!slot) return t.flexible;
        switch (slot) {
            case 'morning': return t.morning;
            case 'afternoon': return t.afternoon;
            case 'night': return t.night;
            default: return slot;
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return t.flexible;
        try {
            return format(new Date(dateStr), 'MMM dd, yyyy', { locale: currentLanguage === 'ar' ? ar : enUS });
        } catch {
            return dateStr;
        }
    };

    const getLocalizedCity = (locationStr: string | null | undefined) => {
        if (!locationStr) return null;

        // 1. Try exact match
        const exactMatch = SAUDI_CITIES_BILINGUAL.find(c =>
            c.en.toLowerCase() === locationStr.toLowerCase() || c.ar === locationStr
        );
        if (exactMatch) return currentLanguage === 'ar' ? exactMatch.ar : exactMatch.en;

        // 2. Try partial match for replacement (e.g. "Street, Jeddah" -> "Street, جدة")
        if (currentLanguage === 'ar') {
            const cityMatch = SAUDI_CITIES_BILINGUAL.find(c =>
                locationStr.toLowerCase().includes(c.en.toLowerCase())
            );

            if (cityMatch) {
                // Return the string with the city name replaced
                const regex = new RegExp(cityMatch.en, 'i');
                return locationStr.replace(regex, cityMatch.ar);
            }
        }

        return locationStr;
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-background flex flex-col"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
            {/* Header - X Button Actions */}
            <div className="flex items-center justify-end p-4">
                <button
                    onClick={() => navigate('/app/buyer/home')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-400" />
                </button>
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
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>
                        {t.title}
                    </h1>
                    <p className={cn(
                        "text-muted-foreground",
                        currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                    )}>
                        {t.subtitle}
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
                            currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                        )}>
                            {t.requestSummary}
                        </span>
                        {/* Wrench icon removed */}
                    </div>

                    {/* Service Type */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className={cn(
                                "text-xs text-muted-foreground",
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>{t.serviceType}</p>
                            <p className={cn(
                                "font-semibold",
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>
                                {getCategoryLabel(serviceCategory, currentLanguage)}
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
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>{t.dateTime}</p>
                            <p className={cn(
                                "font-semibold",
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>
                                {formatDate(date)}
                                {timeSlot && <span className="text-muted-foreground font-normal"> • {getTimeLabel(timeSlot)}</span>}
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
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>{t.locationLabel}</p>
                            <p className={cn(
                                "font-semibold",
                                currentLanguage === 'ar' && "font-['Noto_Sans_Arabic']"
                            )}>
                                {getLocalizedCity(location)}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Actions - Simplified */}
            <div className="p-4 pb-safe bg-white border-t border-gray-50">
                <Button
                    size="lg"
                    onClick={() => navigate(`/app/buyer/booking/${requestId}`)}
                    className="w-full h-14 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                >
                    <ArrowRight className={cn("w-5 h-5 mr-2", currentLanguage === 'ar' && "rotate-180")} />
                    {t.trackStatus}
                </Button>
            </div>
        </div>
    );
};
