import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingShimmerProps {
  className?: string;
  lines?: number;
  type?: 'text' | 'card' | 'avatar' | 'button';
}

export const LoadingShimmer = ({ className, lines = 3, type = 'text' }: LoadingShimmerProps) => {
  if (type === 'avatar') {
    return (
      <div className={cn('relative overflow-hidden rounded-full bg-muted', className)}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
    );
  }

  if (type === 'button') {
    return (
      <div className={cn('relative overflow-hidden rounded-lg bg-muted h-10', className)}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={cn('relative overflow-hidden rounded-xl bg-muted p-6 space-y-4', className)}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
        <div className="h-6 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
        <div className="h-4 bg-muted-foreground/20 rounded w-5/6" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="relative overflow-hidden rounded bg-muted h-4">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear', delay: i * 0.1 }}
          />
        </div>
      ))}
    </div>
  );
};
