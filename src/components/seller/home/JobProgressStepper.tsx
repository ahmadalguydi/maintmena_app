import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type JobStep = 'accepted' | 'en_route' | 'working' | 'completed';

interface JobProgressStepperProps {
    currentLanguage: 'en' | 'ar';
    currentStep: JobStep;
}

export function JobProgressStepper({ currentLanguage, currentStep }: JobProgressStepperProps) {
    const steps: { key: JobStep; labelEn: string; labelAr: string }[] = [
        { key: 'accepted', labelEn: 'Accepted', labelAr: 'تم القبول' },
        { key: 'en_route', labelEn: 'En Route', labelAr: 'في الطريق' },
        { key: 'working', labelEn: 'Working', labelAr: 'جاري العمل' },
        { key: 'completed', labelEn: 'Completed', labelAr: 'الانتهاء' },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
        <div className="flex items-start justify-between relative w-full px-2" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
            {/* Background line connecting all dots */}
            <div className="absolute top-[7px] left-6 right-6 h-[2px] bg-border/40 rounded-full z-0" />

            {/* Active tracking line */}
            <motion.div
                className="absolute top-[7px] h-[2px] bg-primary rounded-full z-0"
                style={{
                    [currentLanguage === 'ar' ? 'right' : 'left']: '1.5rem',
                    width: `calc(${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}% - 3rem)`
                }}
                layout
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />

            {steps.map((step, index) => {
                const isComplete = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isPending = index > currentIndex;

                return (
                    <div key={step.key} className="flex flex-col items-center relative z-10 w-12">
                        {/* Step point */}
                        <motion.div
                            initial={false}
                            animate={{
                                scale: isCurrent ? 1.1 : 1,
                            }}
                            className={cn(
                                "flex items-center justify-center transition-all duration-500",
                                isComplete ? "w-[16px] h-[16px] rounded-full bg-primary shadow-[0_0_10px_rgba(205,107,31,0.3)]" :
                                    isCurrent ? "w-[16px] h-[16px] rounded-full bg-background border-4 border-primary shadow-[0_0_12px_rgba(205,107,31,0.4)]" :
                                        "w-[12px] h-[12px] rounded-full bg-border/60 mt-[2px]"
                            )}
                        >
                            {isComplete && <Check size={10} className="text-primary-foreground stroke-[3]" />}
                        </motion.div>

                        {/* Label */}
                        <span className={cn(
                            "text-[10px] mt-2 text-center leading-tight transition-colors duration-300",
                            isComplete ? "text-primary font-bold" :
                                isCurrent ? "text-foreground font-extrabold" :
                                    "text-muted-foreground/60 font-medium",
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            {currentLanguage === 'ar' ? step.labelAr : step.labelEn}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
