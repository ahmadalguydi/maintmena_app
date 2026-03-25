import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  className?: string;
  rightAction?: React.ReactNode;
}

export const GradientHeader = ({ 
  title, 
  subtitle, 
  showBack = false, 
  onBack,
  className,
  rightAction 
}: GradientHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const isArabic = /[\u0600-\u06FF]/.test(title);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'relative bg-gradient-to-br from-primary/10 via-accent/5 to-transparent',
        'border-b border-border/50 backdrop-blur-sm',
        className
      )}
    >
      <div className="px-4 py-6">
        <div className="flex items-center justify-between gap-4">
          {showBack && (
            <button 
              onClick={handleBack}
              className="p-2 -m-2 hover:bg-accent/10 rounded-lg transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className={cn(
              'text-2xl font-bold text-foreground',
              isArabic ? 'font-ar-display' : 'font-display'
            )}>
              {title}
            </h1>
            {subtitle && (
              <p className={cn(
                'text-sm text-muted-foreground mt-1',
                isArabic ? 'font-ar-body' : 'font-body'
              )}>
                {subtitle}
              </p>
            )}
          </div>
          
          {rightAction && (
            <div className="flex-shrink-0">
              {rightAction}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
