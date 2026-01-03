import { Search, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface SearchHeroProps {
  currentLanguage?: 'en' | 'ar';
  onSearch?: (query: string) => void;
  onFilterClick?: () => void;
  placeholder?: string;
  layoutId?: string;
  onFocusClick?: () => void;
}

export const SearchHero = ({ 
  currentLanguage = 'en',
  onSearch,
  onFilterClick,
  placeholder,
  layoutId,
  onFocusClick
}: SearchHeroProps) => {
  const [query, setQuery] = useState('');

  const defaultPlaceholder = currentLanguage === 'ar' 
    ? 'ابحث عن خدمة...'
    : 'Search for a service...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <motion.div
      layoutId={layoutId}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div 
            className={cn(
              'flex-1 flex items-center gap-3',
              'h-14 px-5 rounded-full',
              'bg-muted/50 border border-border/30',
              'focus-within:border-primary/50 focus-within:bg-background',
              'transition-all duration-200',
              'cursor-pointer'
            )}
            onClick={onFocusClick}
          >
            <Search size={20} className="text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder || defaultPlaceholder}
              className={cn(
                'flex-1 bg-transparent border-none outline-none',
                'text-foreground placeholder:text-muted-foreground',
                'text-base'
              )}
              dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Filter Button */}
          <button
            type="button"
            onClick={onFilterClick}
            className={cn(
              'w-14 h-14 rounded-full',
              'bg-primary text-primary-foreground',
              'flex items-center justify-center',
              'hover:bg-primary/90 active:scale-95',
              'transition-all duration-200',
              'shadow-[0_4px_12px_rgb(0,0,0,0.1)]'
            )}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </form>
    </motion.div>
  );
};
