import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { Check } from 'lucide-react';

interface SubIssue {
    key: string;
    icon: string;
    en: string;
    ar: string;
}

interface SubIssueChipsProps {
    currentLanguage: 'en' | 'ar';
    category: string;
    selectedSubIssue: string | null;
    onSubIssueSelect: (subIssue: string) => void;
}

const SUB_ISSUES: Record<string, SubIssue[]> = {
    plumbing: [
        { key: 'leak', icon: '💧', en: 'Leak', ar: 'تسريب' },
        { key: 'installation', icon: '🔧', en: 'Installation', ar: 'تركيب' },
        { key: 'blockage', icon: '🚫', en: 'Blockage', ar: 'انسداد' },
        { key: 'inspection', icon: '🔍', en: 'Inspection', ar: 'فحص' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    electrical: [
        { key: 'wiring', icon: '🔌', en: 'Wiring Issue', ar: 'مشكلة أسلاك' },
        { key: 'outlet', icon: '🔲', en: 'Outlet/Switch', ar: 'مفتاح/مقبس' },
        { key: 'installation', icon: '💡', en: 'Installation', ar: 'تركيب' },
        { key: 'inspection', icon: '🔍', en: 'Inspection', ar: 'فحص' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    ac: [
        { key: 'not_cooling', icon: '🌡️', en: 'Not Cooling', ar: 'لا يبرد' },
        { key: 'maintenance', icon: '🔧', en: 'Maintenance', ar: 'صيانة' },
        { key: 'installation', icon: '📦', en: 'Installation', ar: 'تركيب' },
        { key: 'noise', icon: '🔊', en: 'Making Noise', ar: 'يصدر ضوضاء' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    painting: [
        { key: 'interior', icon: '🏠', en: 'Interior', ar: 'داخلي' },
        { key: 'exterior', icon: '🏢', en: 'Exterior', ar: 'خارجي' },
        { key: 'touch_up', icon: '🖌️', en: 'Touch Up', ar: 'تجديد' },
        { key: 'full_room', icon: '🎨', en: 'Full Room', ar: 'غرفة كاملة' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    cleaning: [
        { key: 'deep_clean', icon: '✨', en: 'Deep Clean', ar: 'تنظيف عميق' },
        { key: 'regular', icon: '🧹', en: 'Regular', ar: 'عادي' },
        { key: 'move_out', icon: '📦', en: 'Move Out', ar: 'بعد الانتقال' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    handyman: [
        { key: 'furniture', icon: '🪑', en: 'Furniture', ar: 'أثاث' },
        { key: 'mounting', icon: '🖼️', en: 'Mounting', ar: 'تعليق' },
        { key: 'repair', icon: '🔨', en: 'Repairs', ar: 'إصلاحات' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأकد' },
    ],
    appliance: [
        { key: 'washer', icon: '🧺', en: 'Washer/Dryer', ar: 'غسالة' },
        { key: 'fridge', icon: '🧊', en: 'Refrigerator', ar: 'ثلاجة' },
        { key: 'oven', icon: '🍳', en: 'Oven/Stove', ar: 'فرن' },
        { key: 'dishwasher', icon: '🍽️', en: 'Dishwasher', ar: 'غسالة صحون' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
    landscaping: [
        { key: 'lawn', icon: '🌱', en: 'Lawn Care', ar: 'العشب' },
        { key: 'tree', icon: '🌳', en: 'Tree Service', ar: 'أشجار' },
        { key: 'irrigation', icon: '💦', en: 'Irrigation', ar: 'ري' },
        { key: 'not_sure', icon: '❓', en: 'Not sure', ar: 'غير متأكد' },
    ],
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const chipVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            type: 'spring',
            damping: 15,
            stiffness: 300,
        },
    },
};

export const SubIssueChips = ({
    currentLanguage,
    category,
    selectedSubIssue,
    onSubIssueSelect,
}: SubIssueChipsProps) => {
    const { vibrate } = useHaptics();
    const issues = SUB_ISSUES[category] || SUB_ISSUES.plumbing;

    const handleSelect = async (key: string) => {
        await vibrate('medium');
        onSubIssueSelect(key);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-wrap gap-3 py-4"
        >
            {issues.map((issue) => {
                const isSelected = selectedSubIssue === issue.key;
                const label = currentLanguage === 'ar' ? issue.ar : issue.en;

                return (
                    <motion.button
                        key={issue.key}
                        variants={chipVariants}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(issue.key)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-3 rounded-full',
                            'font-medium transition-all duration-200',
                            isSelected
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-muted/40 text-foreground hover:bg-muted/60',
                            currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                        )}
                    >
                        {/* Icon */}
                        <span className="text-lg">{issue.icon}</span>

                        {/* Label */}
                        <span className="text-sm">{label}</span>

                        {/* Check mark animation */}
                        {isSelected && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', damping: 15 }}
                            >
                                <Check size={16} />
                            </motion.div>
                        )}
                    </motion.button>
                );
            })}
        </motion.div>
    );
};

// Export sub-issues data for use in other components
export { SUB_ISSUES };
