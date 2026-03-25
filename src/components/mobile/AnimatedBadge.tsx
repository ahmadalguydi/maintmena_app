import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedBadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'pulse';
    className?: string;
    show?: boolean;
}

const variantStyles = {
    default: 'bg-muted text-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pulse: 'bg-primary text-primary-foreground',
};

/**
 * Animated badge with bounce entrance and optional pulse
 */
export const AnimatedBadge = ({
    children,
    variant = 'default',
    className,
    show = true,
}: AnimatedBadgeProps) => {
    return (
        <AnimatePresence>
            {show && (
                <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 25,
                    }}
                    className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                        variantStyles[variant],
                        variant === 'pulse' && 'relative',
                        className
                    )}
                >
                    {variant === 'pulse' && (
                        <motion.span
                            className="absolute inset-0 rounded-full bg-primary/30"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 0, 0.5],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                    )}
                    <span className="relative">{children}</span>
                </motion.span>
            )}
        </AnimatePresence>
    );
};

interface StatusBadgeProps {
    status: 'open' | 'in_progress' | 'completed' | 'pending' | 'accepted' | 'rejected' | string;
    currentLanguage?: 'en' | 'ar';
    className?: string;
    animated?: boolean;
}

const statusConfig = {
    open: {
        variant: 'warning' as const,
        en: 'Open',
        ar: 'مفتوح',
        pulse: true,
    },
    pending: {
        variant: 'warning' as const,
        en: 'Pending',
        ar: 'قيد الانتظار',
        pulse: true,
    },
    in_progress: {
        variant: 'info' as const,
        en: 'In Progress',
        ar: 'قيد التنفيذ',
        pulse: true,
    },
    accepted: {
        variant: 'success' as const,
        en: 'Accepted',
        ar: 'مقبول',
        pulse: false,
    },
    completed: {
        variant: 'success' as const,
        en: 'Completed',
        ar: 'مكتمل',
        pulse: false,
    },
    rejected: {
        variant: 'error' as const,
        en: 'Rejected',
        ar: 'مرفوض',
        pulse: false,
    },
};

/**
 * Status-specific badge with appropriate styling and animations
 */
export const StatusBadge = ({
    status,
    currentLanguage = 'en',
    className,
    animated = true,
}: StatusBadgeProps) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
        variant: 'default' as const,
        en: status,
        ar: status,
        pulse: false,
    };

    const label = currentLanguage === 'ar' ? config.ar : config.en;
    const finalVariant = config.pulse && animated ? 'pulse' : config.variant;

    if (animated) {
        return (
            <AnimatedBadge
                variant={finalVariant}
                className={cn(
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                    className
                )}
            >
                {label}
            </AnimatedBadge>
        );
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                variantStyles[config.variant],
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                className
            )}
        >
            {label}
        </span>
    );
};

interface CountBadgeProps {
    count: number;
    className?: string;
    maxCount?: number;
}

/**
 * Animated count badge with bounce effect on count change
 */
export const CountBadge = ({ count, className, maxCount = 99 }: CountBadgeProps) => {
    const displayCount = count > maxCount ? `${maxCount}+` : count;

    return (
        <AnimatePresence mode="wait">
            {count > 0 && (
                <motion.span
                    key={count}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 20,
                    }}
                    className={cn(
                        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full',
                        'bg-primary text-primary-foreground text-xs font-bold',
                        className
                    )}
                >
                    {displayCount}
                </motion.span>
            )}
        </AnimatePresence>
    );
};

/**
 * New indicator dot with pulse animation
 */
export const NewIndicator = ({ className }: { className?: string }) => (
    <motion.span
        className={cn('relative flex h-2 w-2', className)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
    </motion.span>
);
