import React from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, Briefcase, Check, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

export interface ProviderData {
    id: string;
    name: string;
    companyName?: string;
    avatarUrl?: string;
    rating: number;
    reviewCount: number;
    completedJobs: number;
    responseTime: number; // in minutes
    priceBand: {
        min: number;
        max: number;
    };
    isVerified: boolean;
    isOnline: boolean;
    matchScore?: number; // 0-100 ranking score
}

interface ProviderCardEnhancedProps {
    currentLanguage: 'en' | 'ar';
    provider: ProviderData;
    isSelected: boolean;
    onSelect: (providerId: string) => void;
    rank?: number;
}

const content = {
    ar: {
        jobs: 'عمل',
        minResponse: 'د استجابة',
        typical: 'السعر المتوقع',
        sar: 'ر.س',
        verified: 'موثق',
        online: 'متاح الآن',
        topMatch: 'أفضل تطابق',
    },
    en: {
        jobs: 'jobs',
        minResponse: 'min response',
        typical: 'Typical visit',
        sar: 'SAR',
        verified: 'Verified',
        online: 'Online now',
        topMatch: 'Top Match',
    },
};

export const ProviderCardEnhanced = ({
    currentLanguage,
    provider,
    isSelected,
    onSelect,
    rank,
}: ProviderCardEnhancedProps) => {
    const { vibrate } = useHaptics();
    const t = content[currentLanguage];

    const handleSelect = async () => {
        await vibrate('medium');
        onSelect(provider.id);
    };

    const displayName = provider.companyName || provider.name;
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={handleSelect}
            className={cn(
                'relative p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer',
                isSelected
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border/50 bg-card hover:border-border',
            )}
        >
            {/* Top Match Badge */}
            {rank === 1 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                        'absolute -top-2 left-4 px-2 py-0.5 rounded-full',
                        'bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}
                >
                    ⭐ {t.topMatch}
                </motion.div>
            )}

            <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative">
                    <div className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold',
                        'bg-gradient-to-br from-primary/20 to-primary/5 text-primary'
                    )}>
                        {provider.avatarUrl ? (
                            <img
                                src={provider.avatarUrl}
                                alt={displayName}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    {/* Online indicator */}
                    {provider.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={cn(
                            'font-semibold text-foreground truncate',
                            currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                        )}>
                            {displayName}
                        </h3>
                        {provider.isVerified && (
                            <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                        )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mt-0.5">
                        <Star size={14} className="text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium text-foreground">
                            {provider.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            ({provider.reviewCount})
                        </span>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Briefcase size={12} />
                            <span>{provider.completedJobs} {t.jobs}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{provider.responseTime} {t.minResponse}</span>
                        </div>
                    </div>
                </div>

                {/* Selection Checkbox */}
                <div className="flex flex-col items-end justify-between">
                    <motion.div
                        animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                        className={cn(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                            isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                        )}
                    >
                        {isSelected && <Check size={14} className="text-primary-foreground" />}
                    </motion.div>

                    {/* Price Band */}
                    <div className={cn(
                        'text-right mt-2',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        <div className="text-[10px] text-muted-foreground">{t.typical}</div>
                        <div className="text-sm font-semibold text-foreground">
                            {provider.priceBand.min}-{provider.priceBand.max} {t.sar}
                        </div>
                    </div>
                </div>
            </div>

            {/* Online status tag */}
            {provider.isOnline && (
                <div className={cn(
                    'mt-3 inline-flex items-center gap-1 px-2 py-1 rounded-full',
                    'bg-green-500/10 text-green-600 text-xs font-medium'
                )}>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {t.online}
                </div>
            )}
        </motion.div>
    );
};
