import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  progress: number;
  isRefreshing: boolean;
  currentLanguage: 'en' | 'ar';
}

export const PullToRefreshIndicator = ({
  progress,
  isRefreshing,
  currentLanguage
}: PullToRefreshIndicatorProps) => {
  const text = currentLanguage === 'ar' ? 'اسحب للتحديث' : 'Pull to refresh';
  const refreshingText = currentLanguage === 'ar' ? 'جاري التحديث...' : 'Refreshing...';

  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ 
        opacity: progress > 0 ? 1 : 0,
        y: progress > 0 ? Math.min(progress * 60, 40) : -40
      }}
      className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-50"
    >
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-background/95 backdrop-blur-sm border border-border/50',
        'shadow-lg'
      )}>
        <motion.div
          animate={isRefreshing ? { rotate: 360 } : { rotate: progress * 360 }}
          transition={isRefreshing ? {
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          } : {
            duration: 0
          }}
        >
          <RefreshCw size={16} className={cn(
            'transition-colors',
            progress >= 1 ? 'text-primary' : 'text-muted-foreground'
          )} />
        </motion.div>
        <span className="text-sm font-medium">
          {isRefreshing ? refreshingText : text}
        </span>
      </div>
    </motion.div>
  );
};
