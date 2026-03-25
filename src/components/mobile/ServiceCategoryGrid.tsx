import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';

interface ServiceCategory {
    key: string;
    icon: string;
    en: string;
    ar: string;
}

interface ServiceCategoryGridProps {
    currentLanguage: 'en' | 'ar';
    selectedCategory: string | null;
    onCategorySelect: (category: string) => void;
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
    { key: 'plumbing', icon: '🚰', en: 'Plumbing', ar: 'سباكة' },
    { key: 'electrical', icon: '⚡', en: 'Electrical', ar: 'كهرباء' },
    { key: 'ac', icon: '❄️', en: 'AC', ar: 'تكييف' },
    { key: 'painting', icon: '🎨', en: 'Painting', ar: 'دهان' },
    { key: 'cleaning', icon: '🧹', en: 'Cleaning', ar: 'تنظيف' },
    { key: 'handyman', icon: '🔧', en: 'Handyman', ar: 'صيانة عامة' },
    { key: 'appliance', icon: '🔌', en: 'Appliance', ar: 'أجهزة' },
    { key: 'landscaping', icon: '🌿', en: 'Landscaping', ar: 'تنسيق حدائق' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            damping: 15,
            stiffness: 300,
        },
    },
};

export const ServiceCategoryGrid = ({
    currentLanguage,
    selectedCategory,
    onCategorySelect,
}: ServiceCategoryGridProps) => {
    const { vibrate } = useHaptics();

    const handleCategoryTap = async (category: ServiceCategory) => {
        await vibrate('medium');
        onCategorySelect(category.key);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-4 gap-3 py-4"
        >
            {SERVICE_CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category.key;
                const label = currentLanguage === 'ar' ? category.ar : category.en;

                return (
                    <motion.button
                        key={category.key}
                        variants={itemVariants}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCategoryTap(category)}
                        className={cn(
                            'flex flex-col items-center justify-center p-3 rounded-2xl',
                            'transition-all duration-200',
                            'min-h-[88px]',
                            isSelected
                                ? 'bg-primary/10 border-2 border-primary shadow-md'
                                : 'bg-muted/30 hover:bg-muted/50 border-2 border-transparent',
                        )}
                    >
                        <motion.span
                            className="text-3xl mb-2"
                            animate={isSelected ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            {category.icon}
                        </motion.span>

                        <span
                            className={cn(
                                'text-xs font-medium text-center leading-tight',
                                isSelected ? 'text-primary' : 'text-foreground',
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                            )}
                        >
                            {label}
                        </span>
                    </motion.button>
                );
            })}
        </motion.div>
    );
};
