import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, DollarSign, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, Heading3, BodySmall, Caption } from "@/components/mobile/Typography";
import { cn } from "@/lib/utils";

interface FinalPriceSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (price: number) => void;
    initialPrice?: number;
    currentLanguage: "en" | "ar";
    hasPhotos?: boolean;
}

export function FinalPriceSheet({
    isOpen,
    onClose,
    onSubmit,
    initialPrice = 0,
    currentLanguage,
    hasPhotos = false,
}: FinalPriceSheetProps) {
    const [price, setPrice] = useState<string>(initialPrice ? initialPrice.toString() : "");

    // Reset when opened
    useEffect(() => {
        if (isOpen && initialPrice) {
            setPrice(initialPrice.toString());
        }
    }, [isOpen, initialPrice]);

    const handleSubmit = () => {
        const numPrice = parseFloat(price);
        if (isNaN(numPrice) || numPrice <= 0) return;
        if (numPrice > 100000) {
            // Max 100,000 SAR for any single job
            return;
        }
        // Round to 2 decimal places
        onSubmit(Math.round(numPrice * 100) / 100);
    };

    const content = {
        ar: {
            title: "تأكيد السعر النهائي",
            subtitle: "أدخل المبلغ النهائي الشامل للعمل.",
            priceLabel: "السعر النهائي",
            currency: "ر.س",
            submitPhoto: "متابعة للصورة",
            submitComplete: "إكمال الطلب",
            secure: "دفع آمن للعميل",
            cancel: "إلغاء",
            placeholder: "0.00",
        },
        en: {
            title: "Confirm Final Price",
            subtitle: "Enter the final comprehensive amount for the job.",
            priceLabel: "Final Price",
            currency: "SAR",
            submitPhoto: "Continue to Photo",
            submitComplete: "Complete Job",
            secure: "Secure Payment for Customer",
            cancel: "Cancel",
            placeholder: "0.00",
        }
    };

    const t = content[currentLanguage];
    const rtl = currentLanguage === 'ar';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[100] bg-background rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col"
                        dir={rtl ? 'rtl' : 'ltr'}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                            <div className="w-12 h-1.5 rounded-full bg-border" />
                        </div>

                        {/* Header */}
                        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between flex-shrink-0">
                            <div>
                                <Heading3 lang={currentLanguage} className="mb-0.5">{t.title}</Heading3>
                                <BodySmall lang={currentLanguage} className="text-muted-foreground">{t.subtitle}</BodySmall>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <X size={20} className="text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="space-y-6">
                                {/* Price Input Section */}
                                <div className="space-y-3">
                                    <Label lang={currentLanguage} className="text-sm font-semibold text-foreground">
                                        {t.priceLabel}
                                    </Label>
                                    <div className="relative">
                                        <div className={cn(
                                            "absolute inset-y-0 flex items-center px-4 pointer-events-none",
                                            rtl ? "right-0 border-l border-border/50" : "left-0 border-r border-border/50"
                                        )}>
                                            <span className="text-muted-foreground font-medium">{t.currency}</span>
                                        </div>
                                        <Input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder={t.placeholder}
                                            className={cn(
                                                "h-16 text-2xl font-bold bg-muted/30 border-2 border-border/50 focus-visible:border-primary focus-visible:ring-primary/20",
                                                rtl ? "pr-20" : "pl-20"
                                            )}
                                        />
                                    </div>
                                    {parseFloat(price) > 100000 && (
                                        <Caption lang={currentLanguage} className="text-destructive mt-1">
                                            {currentLanguage === 'ar' ? 'السعر يتجاوز الحد الأقصى (100,000 ر.س)' : 'Price exceeds maximum (100,000 SAR)'}
                                        </Caption>
                                    )}
                                </div>

                                {/* Trust Banner */}
                                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-full shrink-0">
                                        <ShieldCheck className="w-5 h-5 text-primary" />
                                    </div>
                                    <Caption lang={currentLanguage} className="text-primary/80 font-medium">
                                        {t.secure}
                                    </Caption>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-border/50 bg-background flex-shrink-0 pb-safe">
                            <Button
                                className="w-full h-14 rounded-2xl text-lg group"
                                onClick={handleSubmit}
                                disabled={!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0}
                            >
                                <span>{hasPhotos ? t.submitComplete : t.submitPhoto}</span>
                                {rtl ? (
                                    <ArrowRight size={20} className="mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                ) : (
                                    <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-12 mt-2 rounded-2xl text-muted-foreground"
                                onClick={onClose}
                            >
                                {t.cancel}
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
