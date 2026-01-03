import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CategoryCircleProps {
  icon: string;
  label: string;
  onClick?: () => void;
  index?: number;
  className?: string;
  disabled?: boolean;
}

export const CategoryCircle = ({ icon, label, onClick, index = 0, className, disabled }: CategoryCircleProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-2 min-w-[80px]',
        'transition-transform duration-200',
        'active:scale-95',
        disabled && 'cursor-not-allowed',
        className
      )}
    >
      {/* Circle Container */}
      <div className={cn(
        'w-16 h-16 rounded-full',
        'bg-gradient-to-br from-muted/80 to-muted/40',
        'border border-border/30',
        'flex items-center justify-center',
        'shadow-[0_4px_12px_rgb(0,0,0,0.03)]',
        'hover:shadow-[0_6px_16px_rgb(0,0,0,0.06)]',
        'transition-all duration-200'
      )}>
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Label */}
      <span className={cn(
        'text-xs font-medium text-foreground text-center leading-tight max-w-[80px]',
        /[\u0600-\u06FF]/.test(label) ? 'font-ar-body' : 'font-body'
      )}>
        {label}
      </span>
    </motion.button>
  );
};
