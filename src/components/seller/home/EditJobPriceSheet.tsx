import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading3, Body, BodySmall, Caption, Label } from '@/components/mobile/Typography';
import { PricingType } from '@/components/mobile/AcceptJobSheet';

interface EditJobPriceSheetProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
    currentPricing?: any;
    onSave: (pricing: {
        type: PricingType;
        fixedPrice?: number;
        minPrice?: number;
        maxPrice?: number;
        inspectionFee?: number;
        freeInspection?: boolean;
    }) => void;
}

const content = {
    ar: {
        title: 'تعديل السعر',
        subtitle: 'تحديث تفاصيل التسعير الخاصة بك',
        fixedPrice: 'سعر ثابت',
        fixedPriceDesc: 'سعر محدد ملزم',
        priceRange: 'نطاق سعري',
        priceRangeDesc: 'حد أدنى وأقصى',
        inspection: 'معاينة أولاً',
        inspectionDesc: 'تحديد السعر بعد المعاينة',
        enterPrice: 'أدخل السعر',
        minPrice: 'الحد الأدنى',
        maxPrice: 'الحد الأقصى',
        inspectionFee: 'رسوم المعاينة',
        freeInspection: 'معاينة مجانية',
        paidInspection: 'معاينة مدفوعة',
        sar: 'ريال',
        saveChanges: 'حفظ التغييرات',
        cancel: 'إلغاء',
        bindingNote: 'هذا السعر سيكون مرئياً للعميل',
        rangeNote: 'السعر النهائي سيكون ضمن هذا النطاق',
        inspectionNote: 'ستحدد السعر الفعلي بعد المعاينة',
    },
    en: {
        title: 'Edit Price',
        subtitle: 'Update your pricing details',
        fixedPrice: 'Fixed Price',
        fixedPriceDesc: 'Binding set price',
        priceRange: 'Price Range',
        priceRangeDesc: 'Min and max bounds',
        inspection: 'Inspection First',
        inspectionDesc: 'Set price after inspection',
        enterPrice: 'Enter price',
        minPrice: 'Minimum',
        maxPrice: 'Maximum',
        inspectionFee: 'Inspection fee',
        freeInspection: 'Free inspection',
        paidInspection: 'Paid inspection',
        sar: 'SAR',
        saveChanges: 'Save Changes',
        cancel: 'Cancel',
        bindingNote: 'This price will be visible to the client',
        rangeNote: 'Final price will be within this range',
        inspectionNote: 'You will set the actual price after inspection',
    }
};

export const EditJobPriceSheet = ({
    currentLanguage,
    isOpen,
    onClose,
    currentPricing,
    onSave,
}: EditJobPriceSheetProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';

    const [pricingType, setPricingType] = useState<PricingType | null>(currentPricing?.type || null);
    const [fixedPrice, setFixedPrice] = useState(currentPricing?.fixedPrice?.toString() || '');
    const [minPrice, setMinPrice] = useState(currentPricing?.minPrice?.toString() || '');
    const [maxPrice, setMaxPrice] = useState(currentPricing?.maxPrice?.toString() || '');
    const [inspectionFee, setInspectionFee] = useState(currentPricing?.inspectionFee?.toString() || '');
    const [freeInspection, setFreeInspection] = useState(currentPricing?.freeInspection ?? true);

    useEffect(() => {
        if (isOpen && currentPricing) {
            setPricingType(currentPricing.type || null);
            setFixedPrice(currentPricing.fixedPrice?.toString() || '');
            setMinPrice(currentPricing.minPrice?.toString() || '');
            setMaxPrice(currentPricing.maxPrice?.toString() || '');
            setInspectionFee(currentPricing.inspectionFee?.toString() || '');
            setFreeInspection(currentPricing.freeInspection ?? true);
        }
    }, [isOpen, currentPricing]);

    const handleSave = () => {
        if (!pricingType) return;
        const pricing: any = { type: pricingType };
        if (pricingType === 'fixed') pricing.fixedPrice = Number(fixedPrice);
        else if (pricingType === 'range') {
            pricing.minPrice = Number(minPrice);
            pricing.maxPrice = Number(maxPrice);
        } else if (pricingType === 'inspection') {
            pricing.freeInspection = freeInspection;
            pricing.inspectionFee = freeInspection ? 0 : Number(inspectionFee);
        }
        onSave(pricing);
    };

    const isValid = () => {
        if (!pricingType) return false;
        if (pricingType === 'fixed') return Number(fixedPrice) > 0;
        if (pricingType === 'range') return Number(minPrice) > 0 && Number(maxPrice) > Number(minPrice);
        if (pricingType === 'inspection') return freeInspection || Number(inspectionFee) > 0;
        return false;
    };

    const pricingOptions = [
        { type: 'fixed' as const, icon: '💰', label: t.fixedPrice, desc: t.fixedPriceDesc },
        { type: 'range' as const, icon: '📊', label: t.priceRange, desc: t.priceRangeDesc },
        { type: 'inspection' as const, icon: '🔍', label: t.inspection, desc: t.inspectionDesc },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] bg-black/50 flex items-end"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn("w-full bg-background rounded-t-3xl max-h-[90vh] overflow-y-auto pb-safe")}
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        <div className="sticky top-0 bg-background px-4 pt-4 pb-2 border-b border-border/30 z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Heading3 lang={currentLanguage}>{t.title}</Heading3>
                                    <Caption lang={currentLanguage} className="text-muted-foreground">{t.subtitle}</Caption>
                                </div>
                                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-5">
                            <div className="space-y-3">
                                {pricingOptions.map((option) => (
                                    <motion.button
                                        key={option.type}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setPricingType(option.type)}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border-2 transition-all",
                                            pricingType === option.type ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                                        )}
                                    >
                                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                                            <span className="text-2xl">{option.icon}</span>
                                            <div className={cn("flex-1", isRTL ? "text-right" : "text-left")}>
                                                <Body lang={currentLanguage} className="font-semibold">{option.label}</Body>
                                                <Caption lang={currentLanguage} className="text-muted-foreground">{option.desc}</Caption>
                                            </div>
                                            {pricingType === option.type && <CheckCircle size={24} className="text-primary" />}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>

                            <AnimatePresence mode="wait">
                                {pricingType === 'fixed' && (
                                    <motion.div key="fixed" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                                        <Label lang={currentLanguage}>{t.enterPrice} ({t.sar})</Label>
                                        <Input type="number" value={fixedPrice} onChange={(e) => setFixedPrice(e.target.value)} placeholder="0" className="text-center text-xl h-14" />
                                        <div className={cn("flex items-center gap-2 text-primary", isRTL && "flex-row-reverse")}>
                                            <AlertCircle size={16} />
                                            <Caption lang={currentLanguage}>{t.bindingNote}</Caption>
                                        </div>
                                    </motion.div>
                                )}

                                {pricingType === 'range' && (
                                    <motion.div key="range" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <Label lang={currentLanguage}>{t.minPrice}</Label>
                                                <Input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className="text-center text-lg h-12" />
                                            </div>
                                            <div className="flex items-end pb-2">—</div>
                                            <div className="flex-1">
                                                <Label lang={currentLanguage}>{t.maxPrice}</Label>
                                                <Input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="0" className="text-center text-lg h-12" />
                                            </div>
                                        </div>
                                        <div className={cn("flex items-center gap-2 text-primary", isRTL && "flex-row-reverse")}>
                                            <AlertCircle size={16} />
                                            <Caption lang={currentLanguage}>{t.rangeNote}</Caption>
                                        </div>
                                    </motion.div>
                                )}

                                {pricingType === 'inspection' && (
                                    <motion.div key="inspection" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => setFreeInspection(true)} className={cn("flex-1 py-3 rounded-xl border-2 transition-all", freeInspection ? "border-primary bg-primary/5" : "border-border")} >
                                                <BodySmall lang={currentLanguage} className={freeInspection ? "text-primary font-medium" : ""}>{t.freeInspection}</BodySmall>
                                            </button>
                                            <button onClick={() => setFreeInspection(false)} className={cn("flex-1 py-3 rounded-xl border-2 transition-all", !freeInspection ? "border-primary bg-primary/5" : "border-border")} >
                                                <BodySmall lang={currentLanguage} className={!freeInspection ? "text-primary font-medium" : ""}>{t.paidInspection}</BodySmall>
                                            </button>
                                        </div>
                                        {!freeInspection && (
                                            <div>
                                                <Label lang={currentLanguage}>{t.inspectionFee} ({t.sar})</Label>
                                                <Input type="number" value={inspectionFee} onChange={(e) => setInspectionFee(e.target.value)} placeholder="0" className="text-center text-lg h-12" />
                                            </div>
                                        )}
                                        <div className={cn("flex items-center gap-2 text-primary", isRTL && "flex-row-reverse")}>
                                            <Search size={16} />
                                            <Caption lang={currentLanguage}>{t.inspectionNote}</Caption>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" onClick={onClose} className="flex-1">{t.cancel}</Button>
                                <Button onClick={handleSave} disabled={!isValid()} className="flex-1">{t.saveChanges}</Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};


