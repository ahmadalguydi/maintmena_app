import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JourneyStage } from '@/lib/journeyStages';

interface JourneyTimelineProps {
    stages: JourneyStage[];
    currentStageIndex: number;
    currentLanguage: 'en' | 'ar';
    animate?: boolean;
    className?: string;
}

/**
 * Horizontal journey timeline component with RTL support
 * Shows progress through booking/quote stages
 */
export const JourneyTimeline = ({
    stages,
    currentStageIndex,
    currentLanguage,
    animate = true,
    className,
}: JourneyTimelineProps) => {
    const isRTL = currentLanguage === 'ar';
    const isFinalStage = currentStageIndex === stages.length - 1;

    return (
        <div className={cn('w-full py-4', className)} dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Timeline container */}
            <div className={cn(
                'relative flex items-start justify-between px-2',
                isRTL && 'flex-row-reverse'
            )}>
                {/* Background line */}
                <div
                    className="absolute top-4 h-0.5 bg-border/50 rounded-full"
                    style={{
                        left: '1rem',
                        right: '1rem',
                    }}
                />

                {/* Progress line */}
                <motion.div
                    className="absolute top-4 h-0.5 bg-primary rounded-full origin-left"
                    style={{
                        left: isRTL ? 'auto' : '1rem',
                        right: isRTL ? '1rem' : 'auto',
                        transformOrigin: isRTL ? 'right' : 'left',
                    }}
                    initial={{ width: 0 }}
                    animate={{
                        width: `calc(${(currentStageIndex / (stages.length - 1)) * 100}% - 2rem)`,
                    }}
                    transition={animate ? { duration: 0.6, ease: 'easeOut' } : { duration: 0 }}
                />

                {/* Stage circles */}
                {stages.map((stage, index) => {
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const isFuture = index > currentStageIndex;

                    return (
                        <motion.div
                            key={stage.id}
                            className="flex flex-col items-center z-10"
                            initial={animate ? { opacity: 0, y: 10 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            {/* Circle */}
                            <motion.div
                                className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                                    isCompleted && 'bg-primary border-primary',
                                    isCurrent && 'bg-primary border-primary ring-4 ring-primary/20',
                                    isFuture && 'bg-background border-border'
                                )}
                                initial={animate && isCurrent ? { scale: 0.8 } : false}
                                animate={isCurrent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                                transition={
                                    isCurrent
                                        ? { repeat: 2, duration: 0.4, ease: 'easeInOut' }
                                        : { duration: 0.2 }
                                }
                            >
                                {isCompleted && <Check size={16} className="text-primary-foreground" />}
                                {isCurrent && isFinalStage && (
                                    <Sparkles size={16} className="text-primary-foreground" />
                                )}
                                {isCurrent && !isFinalStage && (
                                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                )}
                            </motion.div>

                            {/* Label */}
                            <motion.span
                                className={cn(
                                    'mt-2 text-xs text-center max-w-[4.5rem] leading-tight',
                                    isCompleted && 'text-muted-foreground',
                                    isCurrent && 'text-primary font-semibold',
                                    isFuture && 'text-muted-foreground/50'
                                )}
                                initial={animate ? { opacity: 0 } : false}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.1 + 0.2 }}
                            >
                                {currentLanguage === 'ar' ? stage.labelAr : stage.labelEn}
                            </motion.span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
