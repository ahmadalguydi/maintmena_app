import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Phone, Camera, X, Calendar, MessageCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManageJobSheetProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
    onRunningLate: () => void;
    onCustomerNotResponding: () => void;
    onAddPhotoNote: () => void;
    onCancelJob: () => void;
    onReschedule: () => void;
    onContactSupport: () => void;
}

export function ManageJobSheet({
    currentLanguage,
    isOpen,
    onClose,
    onRunningLate,
    onCustomerNotResponding,
    onAddPhotoNote,
    onCancelJob,
    onReschedule,
    onContactSupport,
}: ManageJobSheetProps) {
    const content = {
        ar: {
            manageJob: 'إدارة المهمة',
            runningLate: 'متأخر',
            runningLateDesc: 'إرسال تحديث للعميل',
            customerNotResponding: 'العميل لا يرد',
            addPhotoNote: 'إضافة صورة/ملاحظة',
            cancelJob: 'إلغاء المهمة',
            reschedule: 'إعادة الجدولة',
            contactSupport: 'تواصل مع الدعم',
        },
        en: {
            manageJob: 'Manage Job',
            runningLate: 'Running Late',
            runningLateDesc: 'Send update to customer',
            customerNotResponding: 'Customer Not Responding',
            addPhotoNote: 'Add Photo Note',
            cancelJob: 'Cancel Job',
            reschedule: 'Reschedule',
            contactSupport: 'Contact Support',
        },
    };

    const actions = [
        {
            label: content[currentLanguage].runningLate,
            desc: content[currentLanguage].runningLateDesc,
            icon: Clock,
            onClick: onRunningLate,
            color: 'text-amber-600 bg-amber-50',
            warning: true,
        },
        {
            label: content[currentLanguage].customerNotResponding,
            icon: Phone,
            onClick: onCustomerNotResponding,
            color: 'text-orange-600 bg-orange-50',
        },
        {
            label: content[currentLanguage].addPhotoNote,
            icon: Camera,
            onClick: onAddPhotoNote,
            color: 'text-blue-600 bg-blue-50',
        },
        {
            label: content[currentLanguage].reschedule,
            icon: Calendar,
            onClick: onReschedule,
            color: 'text-purple-600 bg-purple-50',
        },
        {
            label: content[currentLanguage].contactSupport,
            icon: MessageCircle,
            onClick: onContactSupport,
            color: 'text-gray-600 bg-gray-100',
        },
        {
            label: content[currentLanguage].cancelJob,
            icon: X,
            onClick: onCancelJob,
            color: 'text-red-600 bg-red-50',
            danger: true,
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[80vh] overflow-auto"
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1 rounded-full bg-gray-300" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-4">
                            <h2 className={cn(
                                "text-lg font-semibold text-foreground",
                                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                            )}>
                                {content[currentLanguage].manageJob}
                            </h2>
                        </div>

                        {/* Actions */}
                        <div className="px-5 pb-8 space-y-2">
                            {actions.map((action, index) => (
                                <motion.button
                                    key={index}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        action.onClick();
                                        onClose();
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl transition-colors",
                                        action.color
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        action.danger ? "bg-red-100" : action.warning ? "bg-amber-100" : "bg-white/50"
                                    )}>
                                        <action.icon size={20} />
                                    </div>
                                    <div className="flex-1 text-start">
                                        <p className={cn(
                                            "text-sm font-medium",
                                            currentLanguage === 'ar' ? 'font-ar-body text-end' : 'font-body'
                                        )}>
                                            {action.label}
                                        </p>
                                        {action.desc && (
                                            <p className={cn(
                                                "text-xs opacity-70",
                                                currentLanguage === 'ar' ? 'text-end' : ''
                                            )}>
                                                {action.desc}
                                            </p>
                                        )}
                                    </div>
                                    {action.warning && (
                                        <AlertTriangle size={16} className="text-amber-600" />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
