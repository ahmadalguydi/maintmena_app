import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';
import { MessageCircle } from 'lucide-react';
import { getCategoryIcon } from '@/lib/serviceCategories';

interface ActiveRequestCardProps {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  priceRange?: string;
  quotesCount?: number;
  status?: string;
  onClick?: () => void;
  index?: number;
  currentLanguage?: 'en' | 'ar';
}

export const ActiveRequestCard = ({
  id,
  title,
  description,
  imageUrl,
  category,
  priceRange,
  quotesCount = 0,
  status,
  onClick,
  index = 0,
  currentLanguage = 'en'
}: ActiveRequestCardProps) => {
  const content = {
    ar: {
      viewQuotes: 'عرض العروض',
      quotes: 'عروض'
    },
    en: {
      viewQuotes: 'View Quotes',
      quotes: 'quotes'
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="min-w-[220px] max-w-[220px]"
    >
      <SoftCard
        onClick={onClick}
        animate={false}
        className="p-0 overflow-hidden h-full"
      >
        {/* Image Section */}
        <div className="relative h-32 bg-gradient-to-br from-muted to-muted/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <span className="text-5xl opacity-80">{category ? getCategoryIcon(category) : '🏠'}</span>
            </div>
          )}

          {/* Status Badge */}
          {status && (
            <div className={cn(
              'absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold',
              'bg-background/90 backdrop-blur-sm border border-border/50',
              status === 'open' && 'text-amber-600',
              status === 'in_progress' && 'text-blue-600',
              status === 'completed' && 'text-green-600'
            )}>
              {status === 'open' && (currentLanguage === 'ar' ? 'مفتوح' : 'Open')}
              {status === 'in_progress' && (currentLanguage === 'ar' ? 'قيد التنفيذ' : 'In Progress')}
              {status === 'completed' && (currentLanguage === 'ar' ? 'مكتمل' : 'Completed')}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className={cn(
            'font-semibold text-foreground text-sm line-clamp-1 min-h-[1.5rem] mb-1',
            /[\u0600-\u06FF]/.test(title) ? 'font-ar-display' : 'font-display'
          )}>
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className={cn(
              "text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem] leading-relaxed",
              currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}>
              {description}
            </p>
          )}

          {/* Price Range */}
          {priceRange && (
            <p className={cn(
              'text-primary font-bold text-base',
              currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
            )}>
              {priceRange}
            </p>
          )}

          {/* Quotes Count */}
          {quotesCount > 0 && (
            <div className={cn(
              'flex items-center gap-2 text-muted-foreground text-xs',
              currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}>
              <MessageCircle size={14} />
              <span>{quotesCount} {content[currentLanguage].quotes}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className={cn(
              'w-full py-2.5 rounded-full min-h-[44px]',
              'bg-primary text-primary-foreground',
              'font-semibold text-sm',
              'hover:bg-primary/90 active:scale-95',
              'transition-all duration-200',
              'shadow-[0_2px_8px_rgb(0,0,0,0.1)]',
              currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}
          >
            {content[currentLanguage].viewQuotes}
          </button>
        </div>
      </SoftCard>
    </motion.div>
  );
};
