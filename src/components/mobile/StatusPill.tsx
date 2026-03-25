import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatusPillProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  label: string;
  className?: string;
  animate?: boolean;
}

export const StatusPill = ({ status, label, className, animate = true }: StatusPillProps) => {
  const statusStyles = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-error/10 text-error border-error/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    pending: 'bg-muted/50 text-muted-foreground border-border'
  };

  const Component = animate ? motion.div : 'div';
  const animationProps = animate ? {
    initial: { scale: 0.9, opacity: 0, y: 2 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.9, opacity: 0 },
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 30,
    }
  } : {};

  return (
    <Component
      key={animate ? status : undefined}
      {...animationProps}
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full',
        'text-xs font-medium border',
        statusStyles[status],
        className
      )}
    >
      {label}
    </Component>
  );
};
