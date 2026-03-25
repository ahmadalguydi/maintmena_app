import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemandData } from '@/hooks/useDemandData';
import { useCurrency } from '@/hooks/useCurrency';

interface EarningsTeaserProps {
    currentLanguage: 'en' | 'ar';
}

export function EarningsTeaser({ currentLanguage }: EarningsTeaserProps) {
    const demandData = useDemandData();
    const { formatAmount } = useCurrency();

    const content = {
        ar: {
            estimatedEarnings: 'الأرباح المتوقعة إذا اتصلت الآن',
            nextHours: 'الـ 3 ساعات القادمة',
            basedOn: 'بناءً على الطلب القريب',
        },
        en: {
            estimatedEarnings: 'ESTIMATED EARNINGS IF ONLINE NOW',
            nextHours: 'next 3 hours',
            basedOn: 'Based on nearby demand',
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl p-5 text-center bg-card shadow-soft border border-border/40"
        >
            {/* Header */}
            <p className={cn(
                "text-xs font-medium uppercase tracking-wider mb-1",
                currentLanguage === 'ar' ? 'font-ar-body text-muted-foreground' : 'font-body text-muted-foreground'
            )}>
                {content[currentLanguage].estimatedEarnings}
            </p>

            {/* Main Amount */}
            <div className="flex items-baseline justify-center gap-1">
                <span className={cn(
                    "text-3xl font-extrabold tracking-tight",
                    currentLanguage === 'ar'
                        ? 'font-ar-display text-primary'
                        : 'font-display text-primary'
                )}>
                    SAR {demandData.estimatedEarnings.min} – {demandData.estimatedEarnings.max}
                </span>
            </div>

            {/* Subtext */}
            <p className="text-[10px] text-muted-foreground mt-1">
                {content[currentLanguage].nextHours} · {content[currentLanguage].basedOn}
            </p>
        </motion.div>
    );
}
