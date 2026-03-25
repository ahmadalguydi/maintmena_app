import { motion } from 'framer-motion';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoOnlineButtonProps {
    currentLanguage: 'en' | 'ar';
    onPress: () => void;
    isLoading?: boolean;
}

export function GoOnlineButton({ currentLanguage, onPress, isLoading }: GoOnlineButtonProps) {
    const content = {
        ar: {
            goOnline: 'اتصل الآن',
            connecting: 'جاري الاتصال...',
        },
        en: {
            goOnline: 'Go Online',
            connecting: 'Connecting...',
        },
    };

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={onPress}
            disabled={isLoading}
            className={cn(
                "w-full h-14 rounded-full flex items-center justify-center gap-2.5",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "text-base font-bold",
                "shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] active:scale-95",
                "transition-all duration-300",
                "disabled:opacity-70 disabled:cursor-not-allowed",
                currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                !isLoading && "animate-cta-pulse"
            )}
        >
            <motion.div
                animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: 'linear' }}
            >
                <Power size={20} />
            </motion.div>
            <span>
                {isLoading
                    ? content[currentLanguage].connecting
                    : content[currentLanguage].goOnline}
            </span>
        </motion.button>
    );
}
