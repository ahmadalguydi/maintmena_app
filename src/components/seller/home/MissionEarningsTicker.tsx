import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MissionEarningsTickerProps {
    currentLanguage: 'en' | 'ar';
    todayEarnings: number;
    currentJobEarnings?: number;
}

export function MissionEarningsTicker({
    currentLanguage,
    todayEarnings,
    currentJobEarnings
}: MissionEarningsTickerProps) {
    const content = {
        ar: {
            todaysEarnings: 'أرباح اليوم:',
        },
        en: {
            todaysEarnings: "Today's Earnings:",
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-2"
        >
            <DollarSign size={14} className="text-muted-foreground" />
            <span className={cn(
                "text-xs text-muted-foreground",
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}>
                {content[currentLanguage].todaysEarnings}
            </span>
            <span className="text-sm font-semibold text-foreground">
                SAR {todayEarnings.toLocaleString()}
            </span>
            {currentJobEarnings !== undefined && currentJobEarnings > 0 && (
                <span className="text-xs text-emerald-600 font-medium">
                    (+SAR {currentJobEarnings.toLocaleString()})
                </span>
            )}
        </motion.div>
    );
}
