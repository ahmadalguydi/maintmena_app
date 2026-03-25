import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { ReactNode, forwardRef } from 'react';

interface PressableCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
    variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
    pressScale?: number;
    hoverScale?: number;
}

const variantStyles = {
    default: 'bg-background rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border/30',
    elevated: 'bg-background rounded-3xl p-4 shadow-lg border border-border/20',
    outlined: 'bg-transparent rounded-3xl p-4 border-2 border-border',
    ghost: 'bg-transparent rounded-3xl p-4',
};

/**
 * PressableCard - An interactive card with haptic feedback and press animations
 * 
 * Features:
 * - Smooth scale animation on press
 * - Optional hover lift effect
 * - Haptic feedback on tap
 * - Customizable press/hover scales
 */
export const PressableCard = forwardRef<HTMLDivElement, PressableCardProps>(({
    children,
    className,
    onClick,
    disabled = false,
    hapticFeedback = 'light',
    variant = 'default',
    pressScale = 0.97,
    hoverScale = 1.01,
    ...props
}, ref) => {
    const handleTap = () => {
        if (disabled) return;

        // Trigger haptic feedback
        if (hapticFeedback !== 'none') {
            switch (hapticFeedback) {
                case 'light':
                    haptics.light();
                    break;
                case 'medium':
                    haptics.medium();
                    break;
                case 'heavy':
                    haptics.heavy();
                    break;
            }
        }

        onClick?.();
    };

    return (
        <motion.div
            ref={ref}
            onClick={handleTap}
            whileHover={!disabled ? {
                scale: hoverScale,
                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
            } : undefined}
            whileTap={!disabled ? {
                scale: pressScale,
            } : undefined}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
            }}
            className={cn(
                variantStyles[variant],
                'cursor-pointer transition-colors',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            role="button"
            aria-disabled={disabled}
            {...props}
        >
            {children}
        </motion.div>
    );
});

PressableCard.displayName = 'PressableCard';

interface PressableButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
}

const buttonVariantStyles = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-muted text-foreground hover:bg-muted/80',
    ghost: 'bg-transparent hover:bg-muted/50',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const buttonSizeStyles = {
    sm: 'h-9 px-4 text-sm rounded-lg',
    md: 'h-11 px-6 text-sm rounded-xl',
    lg: 'h-14 px-8 text-base rounded-2xl',
};

/**
 * PressableButton - An interactive button with haptic feedback and press animations
 */
export const PressableButton = forwardRef<HTMLButtonElement, PressableButtonProps>(({
    children,
    className,
    onClick,
    disabled = false,
    hapticFeedback = 'medium',
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    ...props
}, ref) => {
    const handleTap = () => {
        if (disabled) return;

        if (hapticFeedback !== 'none') {
            switch (hapticFeedback) {
                case 'light':
                    haptics.light();
                    break;
                case 'medium':
                    haptics.medium();
                    break;
                case 'heavy':
                    haptics.heavy();
                    break;
            }
        }

        onClick?.();
    };

    return (
        <motion.button
            ref={ref}
            onClick={handleTap}
            whileHover={!disabled ? { scale: 1.02 } : undefined}
            whileTap={!disabled ? { scale: 0.95 } : undefined}
            transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
            }}
            disabled={disabled}
            className={cn(
                'font-semibold transition-colors',
                buttonVariantStyles[variant],
                buttonSizeStyles[size],
                fullWidth && 'w-full',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
});

PressableButton.displayName = 'PressableButton';

/**
 * Utility hook for adding press feedback to any element
 */
export const usePressAnimation = (options?: {
    pressScale?: number;
    hoverScale?: number;
    disabled?: boolean;
}) => {
    const { pressScale = 0.97, hoverScale = 1.01, disabled = false } = options || {};

    return {
        whileHover: !disabled ? { scale: hoverScale } : undefined,
        whileTap: !disabled ? { scale: pressScale } : undefined,
        transition: {
            type: 'spring' as const,
            stiffness: 400,
            damping: 25,
        },
    };
};
