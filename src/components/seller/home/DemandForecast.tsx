import { motion } from 'framer-motion';
import { TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemandData } from '@/hooks/useDemandData';

interface DemandForecastProps {
    currentLanguage: 'en' | 'ar';
}

export function DemandForecast({ currentLanguage }: DemandForecastProps) {
    const demandData = useDemandData();

    const content = {
        ar: {
            demandRising: 'الطلب يتصاعد',
            peakExpected: 'ذروة الطلب متوقعة خلال',
            minutes: 'دقيقة',
        },
        en: {
            demandRising: 'Demand Rising',
            peakExpected: 'Peak demand expected in',
            minutes: 'min',
        },
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-card shadow-soft p-5 border border-border/40"
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <h3 className={cn(
                    "text-sm font-bold text-foreground",
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                )}>
                    {content[currentLanguage].demandRising}
                </h3>
            </div>

            {/* Forecast Items - Category : Peak Time */}
            <div className="space-y-3">
                {demandData.forecasts.map((forecast, index) => (
                    <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground">
                                {forecast.icon || '❄️'} {currentLanguage === 'ar' ? forecast.categoryAr : forecast.category}
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">
                            ↑ {currentLanguage === 'ar' ? forecast.peakTimeAr : forecast.peakTime}
                        </span>
                    </div>
                ))}
            </div>

            {/* Peak Timer Pill */}
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-2">
                <Clock size={14} className="text-orange-500" />
                <span className={cn(
                    "text-xs text-muted-foreground",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {content[currentLanguage].peakExpected}{' '}
                    <span className="font-semibold text-foreground">
                        {demandData.peakInMinutes} {content[currentLanguage].minutes}
                    </span>
                </span>
            </div>
        </motion.div>
    );
}
