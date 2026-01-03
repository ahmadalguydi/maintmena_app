import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { X, PartyPopper, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JourneyTimeline } from './JourneyTimeline';
import { JourneyStage } from '@/lib/journeyStages';
import { useConfetti } from '@/hooks/useConfetti';
import { cn } from '@/lib/utils';

interface JourneyTimelineOverlayProps {
    open: boolean;
    onClose: () => void;
    stages: JourneyStage[];
    currentStageIndex: number;
    currentLanguage: 'en' | 'ar';
    flowTitle?: string;
    isCompleted?: boolean;
    /** Optional URL to navigate to (e.g., booking/quote detail page) */
    navigationUrl?: string;
    /** Optional label for navigation button */
    navigationLabel?: string;
    /** Callback when navigation button clicked */
    onNavigate?: () => void;
}

/**
 * Modal overlay showing journey timeline with celebration for new stages
 */
export const JourneyTimelineOverlay = ({
    open,
    onClose,
    stages,
    currentStageIndex,
    currentLanguage,
    flowTitle,
    isCompleted = false,
    navigationUrl,
    navigationLabel,
    onNavigate,
}: JourneyTimelineOverlayProps) => {
    const { fire: fireConfetti } = useConfetti();
    const isRTL = currentLanguage === 'ar';

    // Fire confetti when overlay opens for completed jobs
    useEffect(() => {
        if (open && isCompleted) {
            // Small delay for the overlay to appear first
            const timer = setTimeout(() => {
                fireConfetti();
            }, 400);
            return () => clearTimeout(timer);
        }
    }, [open, isCompleted, fireConfetti]);

    const content = {
        en: {
            progressTitle: 'Your Progress',
            completedTitle: 'Job Active!',
            completedMessage: 'Contract signed by both parties. Your job is now active!',
            progressMessage: 'Track your journey through this booking',
            dismiss: 'Got it',
            viewDetails: 'View Details',
        },
        ar: {
            progressTitle: 'تقدمك',
            completedTitle: 'العمل فعّال!',
            completedMessage: 'تم توقيع العقد من الطرفين. عملك الآن فعّال!',
            progressMessage: 'تتبع رحلتك في هذا الحجز',
            dismiss: 'حسناً',
            viewDetails: 'عرض التفاصيل',
        },
    };

    const t = content[currentLanguage];

    const handleNavigate = () => {
        onClose();
        if (onNavigate) {
            onNavigate();
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={cn(
                            'fixed left-4 right-4 z-50 bg-card border border-border rounded-3xl p-6 shadow-xl',
                            'top-1/2 -translate-y-1/2 max-w-md mx-auto'
                        )}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                'absolute top-4 p-2 rounded-full hover:bg-muted transition-colors',
                                isRTL ? 'left-4' : 'right-4'
                            )}
                        >
                            <X size={20} className="text-muted-foreground" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            {isCompleted ? (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
                                >
                                    <PartyPopper className="w-8 h-8 text-primary" />
                                </motion.div>
                            ) : null}

                            <h2 className="text-xl font-bold text-foreground">
                                {isCompleted ? t.completedTitle : t.progressTitle}
                            </h2>

                            {flowTitle && (
                                <p className="text-sm text-muted-foreground mt-1">{flowTitle}</p>
                            )}

                            <p className="text-sm text-muted-foreground mt-2">
                                {isCompleted ? t.completedMessage : t.progressMessage}
                            </p>
                        </div>

                        {/* Timeline */}
                        <JourneyTimeline
                            stages={stages}
                            currentStageIndex={currentStageIndex}
                            currentLanguage={currentLanguage}
                            animate={true}
                            className="mb-6"
                        />

                        {/* Action buttons */}
                        <div className="space-y-2">
                            {/* Navigation button (primary if available) */}
                            {(navigationUrl || onNavigate) && (
                                <Button
                                    onClick={handleNavigate}
                                    className="w-full h-12 rounded-full gap-2"
                                    variant="default"
                                >
                                    {navigationLabel || t.viewDetails}
                                    <ArrowRight size={18} className={isRTL ? 'rotate-180' : ''} />
                                </Button>
                            )}

                            {/* Dismiss button */}
                            <Button
                                onClick={onClose}
                                className="w-full h-12 rounded-full"
                                variant={(navigationUrl || onNavigate) ? 'outline' : (isCompleted ? 'default' : 'outline')}
                            >
                                {t.dismiss}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
