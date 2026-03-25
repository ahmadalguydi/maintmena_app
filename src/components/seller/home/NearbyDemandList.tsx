import { motion } from 'framer-motion';
import { MapPin, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemandData } from '@/hooks/useDemandData';

interface NearbyDemandListProps {
    currentLanguage: 'en' | 'ar';
}

export function NearbyDemandList({ currentLanguage }: NearbyDemandListProps) {
    const demandData = useDemandData();

    const content = {
        ar: {
            nearYou: 'بالقرب منك الآن',
            updated: 'محدث قبل 12 ث',
            requests: 'طلب',
        },
        en: {
            nearYou: 'Near You Right Now',
            updated: 'Updated 12s ago',
            requests: 'requests near you',
        },
    };

    const getTrendBadge = (trend: string, trendPercent?: number) => {
        if (trend === 'high') {
            return (
                <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                    {currentLanguage === 'ar' ? 'عالي' : 'High'}
                </span>
            );
        }
        if (trend === 'rising' && trendPercent) {
            return (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    +{trendPercent}%
                </span>
            );
        }
        return (
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-semibold">
                {currentLanguage === 'ar' ? 'مستقر' : 'Steady'}
            </span>
        );
    };

    return (
        <div className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary" />
                    <span className={cn(
                        "text-sm font-bold text-foreground",
                        currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                    )}>
                        {content[currentLanguage].nearYou}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">{content[currentLanguage].updated}</span>
                </div>
            </div>

            {/* Category List */}
            <div className="space-y-0">
                {demandData.categories.map((category, index) => (
                    <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: currentLanguage === 'ar' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between py-3 border-b border-border/40 last:border-b-0"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-[#f6ede6] flex items-center justify-center">
                                <span className="text-lg">{category.icon}</span>
                            </div>
                            <div>
                                <p className={cn(
                                    "text-sm font-semibold text-foreground",
                                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                )}>
                                    {currentLanguage === 'ar' ? category.nameAr : category.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    {category.requestCount} {content[currentLanguage].requests}
                                </p>
                            </div>
                        </div>
                        {getTrendBadge(category.trend, category.trendPercent)}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
