import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  gradient?: string;
  delay?: number;
}

export const StatsCard = ({ 
  icon: Icon, 
  label, 
  value, 
  trend,
  gradient = 'from-primary/10 to-accent/10',
  delay = 0
}: StatsCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-4 border border-border/50',
        `bg-gradient-to-br ${gradient}`
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-1',
              trend.positive ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.value}
            </p>
          )}
        </div>
        <div className="p-2 rounded-xl bg-background/50">
          <Icon size={20} className="text-primary" />
        </div>
      </div>
    </motion.div>
  );
};
