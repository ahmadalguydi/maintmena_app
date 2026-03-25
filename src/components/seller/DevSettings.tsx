import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Power, RefreshCw, Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DevSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: 'en' | 'ar';
}

type SellerState = 'A' | 'B' | 'B0' | 'C' | 'D';

export function DevSettings({ isOpen, onClose, currentLanguage }: DevSettingsProps) {
    const { user } = useAuth();
    const [isOnline, setIsOnline] = useState(false);
    const [mockOpportunities, setMockOpportunities] = useState(0);
    const [forcedState, setForcedState] = useState<SellerState | null>(null);

    if (!import.meta.env.DEV) {
        return null;
    }

    // Load saved values on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedState = localStorage.getItem('dev_forced_state') as SellerState | null;
            const savedMock = localStorage.getItem('dev_mock_opportunities');
            if (savedState && ['A', 'B', 'B0', 'C', 'D'].includes(savedState)) {
                setForcedState(savedState);
            }
            if (savedMock) {
                setMockOpportunities(parseInt(savedMock, 10) || 0);
            }
        }
    }, [isOpen]);

    const states: { value: SellerState; label: string; labelAr: string; description: string; color: string }[] = [
        { value: 'A', label: 'Offline', labelAr: 'غير متصل', description: 'Demand view, go online CTA', color: 'bg-gray-100 border-gray-300' },
        { value: 'B', label: 'Online', labelAr: 'متصل', description: 'Opportunity feed', color: 'bg-emerald-50 border-emerald-300' },
        { value: 'B0', label: 'Quiet Market', labelAr: 'سوق هادئ', description: 'No opportunities', color: 'bg-slate-50 border-slate-300' },
        { value: 'C', label: 'Mission Mode', labelAr: 'وضع المهمة', description: 'Active job', color: 'bg-amber-50 border-amber-300' },
        { value: 'D', label: 'Scheduled', labelAr: 'مجدول', description: 'Upcoming job', color: 'bg-blue-50 border-blue-300' },
    ];

    const handleStateChange = (state: SellerState) => {
        setForcedState(state);
        localStorage.setItem('dev_forced_state', state);

        toast.success(
            currentLanguage === 'ar'
                ? `تم تعيين الحالة: ${states.find(s => s.value === state)?.labelAr}`
                : `State set to: ${state}`
        );

        // Reload to apply
        window.location.reload();
    };

    const handleMockOpportunitiesChange = (count: number) => {
        const newCount = Math.max(0, Math.min(10, count));
        setMockOpportunities(newCount);
        localStorage.setItem('dev_mock_opportunities', String(newCount));

        toast.success(
            currentLanguage === 'ar'
                ? `الفرص الوهمية: ${newCount}`
                : `Mock opportunities: ${newCount}`
        );
    };

    const handleToggleOnline = async (online: boolean) => {
        if (!user?.id) return;

        try {
            const updateData: Record<string, unknown> = {
                is_online: online,
                went_online_at: online ? new Date().toISOString() : null
            };

            const { error } = await supabase
                .from('profiles')
                .update(updateData as any)
                .eq('id', user.id);

            if (error) throw error;

            setIsOnline(online);
            toast.success(online
                ? (currentLanguage === 'ar' ? 'أنت الآن متصل' : 'You are now online')
                : (currentLanguage === 'ar' ? 'أنت الآن غير متصل' : 'You are now offline')
            );
        } catch (error) {
            toast.error(currentLanguage === 'ar' ? 'فشل التحديث' : 'Failed to update');
        }
    };

    const clearAllSettings = () => {
        setForcedState(null);
        setMockOpportunities(0);
        localStorage.removeItem('dev_forced_state');
        localStorage.removeItem('dev_mock_opportunities');
        toast.success(currentLanguage === 'ar' ? 'تم مسح جميع الإعدادات' : 'All settings cleared');
        window.location.reload();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-background rounded-t-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
                        <h2 className={cn(
                            "text-lg font-bold",
                            currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'
                        )}>
                            🛠️ {currentLanguage === 'ar' ? 'إعدادات المطور' : 'Dev Settings'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-muted transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 space-y-6">
                        {/* Force State */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                                {currentLanguage === 'ar' ? 'فرض حالة الواجهة' : 'Force UI State'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {currentLanguage === 'ar'
                                    ? 'اختر حالة لعرضها بغض النظر عن البيانات الفعلية'
                                    : 'Select a state to display regardless of actual data'}
                            </p>

                            <div className="grid grid-cols-1 gap-2">
                                {states.map((state) => (
                                    <button
                                        key={state.value}
                                        onClick={() => handleStateChange(state.value)}
                                        className={cn(
                                            "p-3 rounded-xl border-2 text-start transition-all flex items-center justify-between",
                                            forcedState === state.value
                                                ? "ring-2 ring-primary ring-offset-2"
                                                : "hover:shadow-md",
                                            state.color
                                        )}
                                    >
                                        <div>
                                            <p className={cn(
                                                "text-sm font-bold",
                                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                            )}>
                                                {state.value} - {currentLanguage === 'ar' ? state.labelAr : state.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {state.description}
                                            </p>
                                        </div>
                                        {forcedState === state.value && (
                                            <span className="px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                                Active
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mock Opportunities Counter */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                                {currentLanguage === 'ar' ? 'الفرص الوهمية' : 'Mock Opportunities'}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {currentLanguage === 'ar'
                                    ? 'أضف فرص وهمية لاختبار شاشة الفرص المتاحة'
                                    : 'Add mock opportunities to test the opportunity feed'}
                            </p>

                            <div className="flex items-center justify-between p-4 rounded-xl border-2 border-border bg-white">
                                <span className={cn(
                                    "text-sm font-medium",
                                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                                )}>
                                    {currentLanguage === 'ar' ? 'عدد الفرص' : 'Opportunity Count'}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleMockOpportunitiesChange(mockOpportunities - 1)}
                                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="w-8 text-center font-mono text-xl font-bold">
                                        {mockOpportunities}
                                    </span>
                                    <button
                                        onClick={() => handleMockOpportunitiesChange(mockOpportunities + 1)}
                                        className="w-10 h-10 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center transition-colors"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Toggle Online */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                                {currentLanguage === 'ar' ? 'تبديل سريع' : 'Quick Toggle'}
                            </h3>

                            <button
                                onClick={() => handleToggleOnline(!isOnline)}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                                    isOnline
                                        ? "bg-emerald-50 border-emerald-300"
                                        : "bg-white border-border"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Power size={20} className={isOnline ? "text-emerald-600" : "text-gray-400"} />
                                    <span className="text-sm font-medium">
                                        {currentLanguage === 'ar' ? 'حالة الاتصال' : 'Online Status'}
                                    </span>
                                </div>
                                <div className={cn(
                                    "w-12 h-7 rounded-full transition-colors flex items-center px-1",
                                    isOnline ? "bg-emerald-500 justify-end" : "bg-gray-300 justify-start"
                                )}>
                                    <div className="w-5 h-5 rounded-full bg-white shadow" />
                                </div>
                            </button>
                        </div>

                        {/* Clear All */}
                        <button
                            onClick={clearAllSettings}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive/10 text-destructive font-medium hover:bg-destructive/20 transition-colors"
                        >
                            <Trash2 size={18} />
                            {currentLanguage === 'ar' ? 'مسح جميع الإعدادات' : 'Clear All Settings'}
                        </button>

                        {/* Apply Button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw size={18} />
                            {currentLanguage === 'ar' ? 'تطبيق وإعادة التحميل' : 'Apply & Reload'}
                        </button>

                        {/* Footer Note */}
                        <p className="text-xs text-center text-muted-foreground py-2">
                            ⚠️ {currentLanguage === 'ar'
                                ? 'هذه الإعدادات للتطوير فقط'
                                : 'These settings are for development only'}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
