import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  disabled?: boolean;
}

export const TouchCard = ({
  children,
  onClick,
  onLongPress,
  className,
  variant = 'default',
  disabled = false
}: TouchCardProps) => {
  const { vibrate } = useHaptics();

  const handleClick = async () => {
    if (!disabled && onClick) {
      await vibrate('light');
      onClick();
    }
  };

  const handleLongPress = async () => {
    if (!disabled && onLongPress) {
      await vibrate('medium');
      onLongPress();
    }
  };

  const baseStyles = 'rounded-2xl p-4 transition-all duration-200 active:scale-[0.98]';
  
  const variantStyles = {
    default: 'bg-card border border-border',
    elevated: 'bg-card shadow-lg shadow-black/5',
    outlined: 'bg-transparent border-2 border-border'
  };

  return (
    <motion.div
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      className={cn(
        baseStyles,
        variantStyles[variant],
        onClick && !disabled && 'cursor-pointer hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.div>
  );
};
