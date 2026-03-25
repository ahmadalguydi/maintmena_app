import { ReactNode } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface MenuItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface MenuGroupProps {
  items: MenuItem[];
  className?: string;
  currentLanguage?: 'en' | 'ar';
}

export const MenuGroup = ({ items, className, currentLanguage = 'en' }: MenuGroupProps) => {
  const isArabic = currentLanguage === 'ar';
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-background rounded-3xl p-2',
        'shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        'border border-border/30',
        className
      )}
    >
      {items.map((item, index) => (
        <div key={index}>
          <button
            onClick={item.onClick}
            className={cn(
              'w-full flex items-center justify-between p-4 rounded-2xl',
              'transition-all duration-200',
              'hover:bg-muted/50 active:scale-[0.98]',
              item.destructive && 'text-destructive'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-xl',
                  item.destructive ? 'bg-destructive/10' : 'bg-primary/10'
                )}
              >
                {item.icon}
              </div>
              <span className={cn(
                "font-medium",
                isArabic ? "font-ar-body" : "font-body"
              )}>{item.label}</span>
            </div>
            <ChevronIcon
              size={18}
              className={cn(
                'text-muted-foreground',
                item.destructive && 'text-destructive'
              )}
            />
          </button>
          {index < items.length - 1 && (
            <div className="h-px bg-border/30 mx-4" />
          )}
        </div>
      ))}
    </motion.div>
  );
};
