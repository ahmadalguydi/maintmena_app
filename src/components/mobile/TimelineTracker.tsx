import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'future';
}

interface TimelineTrackerProps {
  steps: TimelineStep[];
  className?: string;
}

export const TimelineTracker = ({ steps, className }: TimelineTrackerProps) => {
  return (
    <div className={cn('space-y-0', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        return (
          <div key={index} className="flex gap-3">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all',
                  step.status === 'completed' && 'bg-primary border-primary',
                  step.status === 'current' && 'bg-background border-primary animate-pulse',
                  step.status === 'future' && 'bg-background border-border'
                )}
              >
                {step.status === 'completed' && (
                  <Check size={14} className="text-primary-foreground" />
                )}
                {step.status === 'current' && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </motion.div>

              {/* Connecting line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 h-8 transition-all',
                    step.status === 'completed' ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>

            {/* Label */}
            <div className={cn('pb-8', isLast && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium transition-colors',
                  step.status === 'completed' && 'text-foreground',
                  step.status === 'current' && 'text-primary font-semibold',
                  step.status === 'future' && 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
