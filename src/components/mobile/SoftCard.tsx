import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface SoftCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export const SoftCard = ({ children, className, onClick, animate = true }: SoftCardProps) => {
  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClick}
        className={cn(
          'bg-background rounded-3xl p-4',
          'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
          'border border-border/30',
          'transition-all duration-300',
          onClick && 'cursor-pointer hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:scale-[0.98]',
          className
        )}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-background rounded-3xl p-4',
        'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        'border border-border/30',
        'transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] active:scale-[0.98]',
        className
      )}
    >
      {children}
    </div>
  );
};
