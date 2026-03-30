import { motion } from 'framer-motion';
import { CheckCircle2, Circle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface ProfileCompletenessItem {
    key: string;
    labelEn: string;
    labelAr: string;
    done: boolean;
    route: string;
}

export interface ProfileCompleteness {
    isComplete: boolean;
    items: ProfileCompletenessItem[];
}

interface SellerSetupChecklistProps {
    currentLanguage: 'en' | 'ar';
    completeness: ProfileCompleteness;
}

export function SellerSetupChecklist({ currentLanguage, completeness }: SellerSetupChecklistProps) {
    const navigate = useNavigate();
    const isAr = currentLanguage === 'ar';

    const doneCount = completeness.items.filter(i => i.done).length;
    const total = completeness.items.length;
    const pct = Math.round((doneCount / total) * 100);

    const titleEn = 'Complete your profile to go online';
    const titleAr = 'أكمل ملفك الشخصي للبدء';
    const subtitleEn = `${doneCount} of ${total} steps completed`;
    const subtitleAr = `${doneCount} من ${total} خطوات مكتملة`;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'rounded-3xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-5 space-y-4',
            )}
            dir={isAr ? 'rtl' : 'ltr'}
        >
            {/* Header */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <h3 className={cn('text-base font-bold text-red-900 dark:text-red-200', isAr ? 'font-ar-display' : '')}>
                        {isAr ? titleAr : titleEn}
                    </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                    {isAr ? subtitleAr : subtitleEn}
                </p>

                {/* Progress bar */}
                <div className="mt-3 h-2 rounded-full bg-red-200 dark:bg-red-800 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
                {completeness.items.map(item => (
                    <button
                        key={item.key}
                        onClick={() => !item.done && navigate(item.route)}
                        disabled={item.done}
                        className={cn(
                            'w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all',
                            item.done
                                ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-200'
                                : 'bg-white dark:bg-card border border-red-200 dark:border-red-700 text-foreground hover:bg-red-50 active:scale-[0.98]',
                        )}
                    >
                        {item.done
                            ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            : <Circle className="w-5 h-5 text-amber-400 shrink-0" />
                        }
                        <span className={cn('flex-1 text-start font-medium', isAr && 'text-right')}>
                            {isAr ? item.labelAr : item.labelEn}
                        </span>
                        {!item.done && (
                            <ArrowRight className={cn('w-4 h-4 text-red-500 shrink-0', isAr && 'rotate-180')} />
                        )}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
