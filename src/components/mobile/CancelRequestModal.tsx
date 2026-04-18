import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, UserX, AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SoftCard } from './SoftCard';
import { Heading3, Body, BodySmall, Caption } from './Typography';

export type CancelReason =
    | 'found_other'
    | 'wrong_time'
    | 'wrong_service'
    | 'price_too_high'
    | 'provider_issue'
    | 'change_provider'
    | 'changed_mind'
    | 'other';

interface CancelRequestModalProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
    onCancel: (reason: CancelReason, wantsDifferentProvider?: boolean) => void;
    onReschedule?: () => void;
    hasProvider?: boolean;
}

const content = {
    ar: {
        title: 'إلغاء الطلب',
        subtitle: 'وش السبب اللي خلاك تلغي؟',
        foundOther: 'وجدت مقدم خدمة آخر',
        wrongTime: 'الوقت غير مناسب',
        wrongService: 'الخدمة غير صحيحة',
        priceTooHigh: 'السعر عالي',
        providerIssue: 'مشكلة مع الفني',
        changeProvider: 'أبي فني ثاني',
        changedMind: 'غيرت رأيي',
        other: 'سبب آخر',
        cancelRequest: 'إلغاء الطلب',
        findDifferent: 'دور لي على فني غيره',
        rescheduleInstead: 'غيّر الموعد بدال الإلغاء',
        keepRequest: 'الاحتفاظ بالطلب',
        warningTitle: 'هل متأكد؟',
        warningText: 'إذا ألغيت بعد تعيين الفني ممكن تتأثر تجربتك',
    },
    en: {
        title: 'Cancel Request',
        subtitle: 'Why do you want to cancel?',
        foundOther: 'Found another provider',
        wrongTime: 'Wrong timing',
        wrongService: 'Wrong service',
        priceTooHigh: 'Price too high',
        providerIssue: 'Issue with provider',
        changeProvider: 'I want a different provider',
        changedMind: 'Changed my mind',
        other: 'Other reason',
        cancelRequest: 'Cancel Request',
        findDifferent: 'Find Different Provider',
        rescheduleInstead: 'Reschedule instead of cancelling',
        keepRequest: 'Keep Request',
        warningTitle: 'Are you sure?',
        warningText: 'Cancelling after provider acceptance may affect your experience',
    }
};

const reasons: { key: CancelReason; icon: string; showFindDifferent?: boolean; showReschedule?: boolean }[] = [
    { key: 'wrong_time', icon: '🕐', showReschedule: true },
    { key: 'change_provider', icon: '🔄', showFindDifferent: true },
    { key: 'price_too_high', icon: '💰', showFindDifferent: true },
    { key: 'provider_issue', icon: '👤', showFindDifferent: true },
    { key: 'wrong_service', icon: '🔧' },
    { key: 'found_other', icon: '✅' },
    { key: 'changed_mind', icon: '💭' },
    { key: 'other', icon: '📝' },
];

export const CancelRequestModal = ({
    currentLanguage,
    isOpen,
    onClose,
    onCancel,
    onReschedule,
    hasProvider = false,
}: CancelRequestModalProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';
    const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
    const [showWarning, setShowWarning] = useState(false);

    const getReasonLabel = (key: CancelReason) => {
        const labels: Record<CancelReason, string> = {
            found_other: t.foundOther,
            wrong_time: t.wrongTime,
            wrong_service: t.wrongService,
            price_too_high: t.priceTooHigh,
            provider_issue: t.providerIssue,
            change_provider: t.changeProvider,
            changed_mind: t.changedMind,
            other: t.other,
        };
        return labels[key];
    };

    const handleCancelClick = () => {
        if (hasProvider && !showWarning) {
            setShowWarning(true);
            return;
        }
        if (selectedReason) {
            onCancel(selectedReason);
            setSelectedReason(null);
            setShowWarning(false);
        }
    };

    const handleFindDifferent = () => {
        if (selectedReason) {
            onCancel(selectedReason, true);
            setSelectedReason(null);
        }
    };

    const selectedReasonData = reasons.find(r => r.key === selectedReason);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-3xl",
                            "max-h-[85vh] overflow-y-auto pb-safe"
                        )}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-background px-5 pt-5 pb-3 border-b border-border/30">
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

                        {/* Warning for provider assigned */}
                        {showWarning && hasProvider && (
                            <div className="px-5 pt-4">
                                <SoftCard className="p-3 bg-amber-50 border-amber-200">
                                    <div className={cn("flex items-start gap-3", isRTL && "flex-row-reverse")}>
                                        <AlertTriangle className="text-amber-600 mt-0.5" size={20} />
                                        <div className={isRTL ? "text-right" : "text-left"}>
                                            <Body lang={currentLanguage} className="font-medium text-amber-800">
                                                {t.warningTitle}
                                            </Body>
                                            <Caption lang={currentLanguage} className="text-amber-700">
                                                {t.warningText}
                                            </Caption>
                                        </div>
                                    </div>
                                </SoftCard>
                            </div>
                        )}

                        {/* Reasons */}
                        <div className="px-5 py-4 space-y-2">
                            {reasons.map((reason) => (
                                <motion.button
                                    key={reason.key}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedReason(reason.key)}
                                    className={cn(
                                        "w-full p-3 rounded-xl border-2 transition-all",
                                        selectedReason === reason.key
                                            ? "border-destructive bg-destructive/5"
                                            : "border-border hover:border-destructive/30"
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
                        <div className="flex flex-col gap-2 p-5 border-t border-border/30">
                            {selectedReasonData?.showReschedule && hasProvider && onReschedule && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onClose();
                                        onReschedule();
                                    }}
                                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                                >
                                    <CalendarClock size={18} className={cn(isRTL ? "ml-2" : "mr-2")} />
                                    {t.rescheduleInstead}
                                </Button>
                            )}
                            {selectedReasonData?.showFindDifferent && hasProvider && (
                                <Button
                                    variant="outline"
                                    onClick={handleFindDifferent}
                                    disabled={!selectedReason}
                                    className="w-full"
                                >
                                    <RefreshCw size={18} className={cn(isRTL ? "ml-2" : "mr-2")} />
                                    {t.findDifferent}
                                </Button>
                            )}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1"
                                >
                                    {t.keepRequest}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleCancelClick}
                                    disabled={!selectedReason}
                                    className="flex-1"
                                >
                                    {t.cancelRequest}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
