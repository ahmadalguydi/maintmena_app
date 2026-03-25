import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { VendorCardSelectable, SelectableVendorData } from './VendorCardSelectable';

interface ProviderStackProps {
    currentLanguage: 'en' | 'ar';
    providers: SelectableVendorData[];
    selectedProviders: string[];
    onProviderToggle: (providerId: string) => void;
    onViewDetails?: (providerId: string) => void;
    isLoading?: boolean;
    onRefresh?: () => void;
    maxSelection?: number;
}

const content = {
    ar: {
        availablePros: 'المحترفون المتاحون',
        selectUpTo: 'اختر حتى',
        providers: 'مقدمي خدمة',
        selected: 'محدد',
        noProviders: 'لا يوجد مقدمي خدمة متاحين',
        tryAgain: 'حاول مرة أخرى',
        expanding: 'جاري البحث في مناطق أوسع...',
        loading: 'جاري البحث عن أفضل المحترفين...',
        refreshList: 'تحديث القائمة',
    },
    en: {
        availablePros: 'Available Pros',
        selectUpTo: 'Select up to',
        providers: 'providers',
        selected: 'selected',
        noProviders: 'No providers available',
        tryAgain: 'Try again',
        expanding: 'Expanding search to wider area...',
        loading: 'Finding the best pros for you...',
        refreshList: 'Refresh list',
    },
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring' as const,
            damping: 15,
            stiffness: 300,
        },
    },
};

export const ProviderStack = ({
    currentLanguage,
    providers,
    selectedProviders,
    onProviderToggle,
    onViewDetails,
    isLoading = false,
    onRefresh,
    maxSelection = 3,
}: ProviderStackProps) => {
    const { vibrate } = useHaptics();
    const t = content[currentLanguage];

    const handleProviderSelect = async (providerId: string) => {
        // Check if already selected or under limit
        if (selectedProviders.includes(providerId)) {
            onProviderToggle(providerId);
        } else if (selectedProviders.length < maxSelection) {
            await vibrate('medium');
            onProviderToggle(providerId);
        } else {
            // Max reached - give feedback
            await vibrate('light');
        }
    };

    const handleRefresh = async () => {
        await vibrate('light');
        onRefresh?.();
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="py-8">
                <div className="flex flex-col items-center justify-center gap-4">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        className="w-12 h-12 rounded-full border-3 border-primary border-t-transparent"
                    />
                    <p className={cn(
                        'text-muted-foreground text-center',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        {t.loading}
                    </p>
                </div>
            </div>
        );
    }

    // Empty state
    if (providers.length === 0) {
        return (
            <div className="py-8">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                        <Users size={32} className="text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <p className={cn(
                            'text-foreground font-medium',
                            currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                        )}>
                            {t.noProviders}
                        </p>
                        <p className={cn(
                            'text-sm text-muted-foreground mt-1',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}>
                            {t.expanding}
                        </p>
                    </div>
                    {onRefresh && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRefresh}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-full',
                                'bg-primary text-primary-foreground font-medium',
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                            )}
                        >
                            <RefreshCw size={16} />
                            {t.tryAgain}
                        </motion.button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="py-4">
            {/* Header with selection counter */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        'text-lg font-semibold text-foreground',
                        currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                    )}>
                        {providers.length}
                    </span>
                    <span className={cn(
                        'text-muted-foreground',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}>
                        {t.availablePros}
                    </span>
                </div>
                <div className={cn(
                    'px-3 py-1 rounded-full text-sm',
                    selectedProviders.length > 0
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'bg-muted/50 text-muted-foreground',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}>
                    {selectedProviders.length}/{maxSelection} {t.selected}
                </div>
            </div>

            {/* Selection hint */}
            <p className={cn(
                'text-xs text-muted-foreground mb-4',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
            )}>
                💡 {t.selectUpTo} {maxSelection} {t.providers}
            </p>

            {/* Provider Cards */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-3"
            >
                <AnimatePresence>
                    {providers.map((provider, index) => (
                        <motion.div
                            key={provider.id}
                            variants={itemVariants}
                            layout
                        >
                            <VendorCardSelectable
                                currentLanguage={currentLanguage}
                                vendor={provider}
                                isSelected={selectedProviders.includes(provider.id)}
                                onSelect={handleProviderSelect}
                                onViewDetails={onViewDetails}
                                rank={index + 1}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* Refresh button */}
            {onRefresh && (
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefresh}
                    className={cn(
                        'w-full mt-4 flex items-center justify-center gap-2 py-3',
                        'text-sm text-muted-foreground hover:text-foreground transition-colors',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                    )}
                >
                    <RefreshCw size={14} />
                    {t.refreshList}
                </motion.button>
            )}
        </div>
    );
};
