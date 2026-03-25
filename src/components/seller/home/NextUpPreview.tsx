import { motion } from 'framer-motion';
import { Zap, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextUpPreviewProps {
    currentLanguage: 'en' | 'ar';
    title: string;
    time: string;
    onClick?: () => void;
}

export function NextUpPreview({ currentLanguage, title, time, onClick }: NextUpPreviewProps) {
    const content = {
        ar: {
            afterThis: 'بعد هذه المهمة',
        },
        en: {
            afterThis: 'AFTER THIS',
        },
    };

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className="w-full flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-200/50"
        >
            <div className="p-2 rounded-xl bg-amber-100">
                <Zap size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 text-start">
                <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">
                    {content[currentLanguage].afterThis}
                </p>
                <p className={cn(
                    "text-sm font-medium text-foreground",
                    currentLanguage === 'ar' ? 'font-ar-body text-end' : 'font-body'
                )}>
                    {title}
                </p>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
                <Clock size={12} />
                <span className="text-xs">{time}</span>
            </div>
        </motion.button>
    );
}
