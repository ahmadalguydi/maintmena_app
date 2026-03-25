import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';

interface StickySearchBarProps {
    currentLanguage?: 'en' | 'ar';
    isVisible: boolean;
    onFocusClick?: () => void;
    placeholder?: string;
}
export const StickySearchBar = ({
    currentLanguage = 'en',
    isVisible,
    onFocusClick,
    placeholder
}: StickySearchBarProps) => {
    const { vibrate } = useHaptics();

    const defaultPlaceholder = currentLanguage === 'ar'
        ? 'وش تحتاج اليوم؟'
        : 'Search for a service...';
        
    const displayPlaceholder = placeholder || defaultPlaceholder;

    const handleClick = async () => {
        await vibrate('light');
        onFocusClick?.();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{
                        type: 'spring',
                        damping: 25,
                        stiffness: 300
                    }}
                    className={cn(
                        'fixed top-0 left-0 right-0 z-40',
                        'pt-safe px-4 pb-3',
                        'bg-background/90 backdrop-blur-xl',
                        'border-b border-border/30',
                        'shadow-[0_4px_20px_rgb(0,0,0,0.08)]'
                    )}
                >
                    {/* Spacer for safe area */}
                    <div className="h-2" />

                    {/* Search Container */}
                    <button
                        onClick={handleClick}
                        className={cn(
                            'w-full flex items-center gap-3',
                            currentLanguage === 'ar' && 'flex-row-reverse',
                            'h-12 px-4 rounded-full',
                            'bg-muted/60 border border-border/30',
                            'transition-all duration-200',
                            'active:scale-[0.98]',
                            'hover:bg-muted/80'
                        )}
                    >
                        <Search size={18} className="text-muted-foreground" />
                        <span className={cn(
                            'flex-1 text-muted-foreground text-sm',
                            currentLanguage === 'ar' ? 'text-right font-ar-body' : 'text-left font-body'
                        )}>
                            {displayPlaceholder}
                        </span>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
