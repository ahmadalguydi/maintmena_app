import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SoftCard } from './SoftCard';
import { Heading3, Body, BodySmall, Caption } from './Typography';

export type DeclineReason =
    | 'too_far'
    | 'not_my_skill'
    | 'not_available'
    | 'price_too_low'
    | 'other';

interface DeclineReasonModalProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
    onDecline: (reason: DeclineReason) => void;
}

const content = {
    ar: {
        title: 'رفض الطلب',
        subtitle: 'ساعدنا نحسن خدمتك - ليش رفضت؟',
        tooFar: 'بعيد عني',
        notMySkill: 'خارج تخصصي',
        notAvailable: 'مشغول حالياً',
        priceTooLow: 'السعر المتوقع قليل',
        other: 'سبب آخر',
        decline: 'رفض',
        cancel: 'إلغاء',
    },
    en: {
        title: 'Decline Request',
        subtitle: 'Help us serve you better - why decline?',
        tooFar: 'Too far away',
        notMySkill: 'Not my specialty',
        notAvailable: 'Currently busy',
        priceTooLow: 'Expected price too low',
        other: 'Other reason',
        decline: 'Decline',
        cancel: 'Cancel',
    }
};

const reasons: { key: DeclineReason; icon: string }[] = [
    { key: 'too_far', icon: '📍' },
    { key: 'not_my_skill', icon: '🔧' },
    { key: 'not_available', icon: '⏰' },
    { key: 'price_too_low', icon: '💰' },
    { key: 'other', icon: '💬' },
];

export const DeclineReasonModal = ({
    currentLanguage,
    isOpen,
    onClose,
    onDecline,
}: DeclineReasonModalProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';
    const [selectedReason, setSelectedReason] = useState<DeclineReason | null>(null);

    const getReasonLabel = (key: DeclineReason) => {
        const labels: Record<DeclineReason, string> = {
            too_far: t.tooFar,
            not_my_skill: t.notMySkill,
            not_available: t.notAvailable,
            price_too_low: t.priceTooLow,
            other: t.other,
        };
        return labels[key];
    };

    const handleDecline = () => {
        if (selectedReason) {
            onDecline(selectedReason);
            setSelectedReason(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-background rounded-3xl overflow-hidden"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        {/* Header */}
                        <div className="px-5 pt-5 pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Heading3 lang={currentLanguage}>{t.title}</Heading3>
                                    <Caption lang={currentLanguage} className="text-muted-foreground">
                                        {t.subtitle}
                                    </Caption>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Reasons */}
                        <div className="px-5 pb-3 space-y-2">
                            {reasons.map((reason) => (
                                <motion.button
                                    key={reason.key}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedReason(reason.key)}
                                    className={cn(
                                        "w-full p-3 rounded-xl border-2 transition-all",
                                        selectedReason === reason.key
                                            ? "border-primary bg-primary/5"
                                            : "border-border hover:border-primary/30"
                                    )}
                                >
                                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                                        <span className="text-xl">{reason.icon}</span>
                                        <Body lang={currentLanguage} className={cn(
                                            "flex-1",
                                            isRTL ? "text-right" : "text-left"
                                        )}>
                                            {getReasonLabel(reason.key)}
                                        </Body>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 p-5 border-t border-border/30">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                            >
                                {t.cancel}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDecline}
                                disabled={!selectedReason}
                                className="flex-1"
                            >
                                {t.decline}
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
