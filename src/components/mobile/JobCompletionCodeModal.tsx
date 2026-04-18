import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Heading3, BodySmall, Caption } from "@/components/mobile/Typography";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";

interface JobCompletionCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (code: string) => void;
    currentLanguage: "en" | "ar";
    isSubmitting?: boolean;
}

export function JobCompletionCodeModal({
    isOpen,
    onClose,
    onSubmit,
    currentLanguage,
    isSubmitting = false,
}: JobCompletionCodeModalProps) {
    const [code, setCode] = useState("");

    const content = {
        ar: {
            title: "تأكيد الإنجاز",
            subtitle: "أدخل الرمز المكون من 6 أرقام من شاشة العميل.",
            submit: "تأكيد الرمز",
            cancel: "إلغاء",
            secure: "يضمن هذا الرمز رضا العميل",
        },
        en: {
            title: "Confirm Completion",
            subtitle: "Enter the 6-digit completion code shown on the customer's screen.",
            submit: "Verify Code",
            cancel: "Cancel",
            secure: "This code ensures customer satisfaction",
        }
    };

    const t = content[currentLanguage];
    const rtl = currentLanguage === 'ar';

    const handleComplete = (value: string) => {
        if (value.length === 6 && !isSubmitting) {
            onSubmit(value);
        }
    };

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
                        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-background w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl pointer-events-auto"
                            dir={rtl ? 'rtl' : 'ltr'}
                        >
                            {/* Header */}
                            <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                                {/* Decorative rings */}
                                <div className="absolute w-40 h-40 rounded-full border border-primary/10" />
                                <div className="absolute w-28 h-28 rounded-full border border-primary/15" />
                                <button
                                    onClick={isSubmitting ? undefined : onClose}
                                    disabled={isSubmitting}
                                    className="absolute top-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors disabled:opacity-40"
                                    style={{ right: rtl ? 'auto' : '1rem', left: rtl ? '1rem' : 'auto' }}
                                >
                                    <X size={20} className="text-foreground/70" />
                                </button>

                                <div className="w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center relative z-10">
                                    {isSubmitting ? (
                                        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={32} className="text-primary" />
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center space-y-6">
                                <div>
                                    <Heading3 lang={currentLanguage} className="mb-2">{t.title}</Heading3>
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground max-w-[260px] mx-auto">
                                        {t.subtitle}
                                    </BodySmall>
                                </div>

                                <div className="flex justify-center" dir="ltr">
                                    <InputOTP
                                        maxLength={6}
                                        value={code}
                                        onChange={(v) => { setCode(v); }}
                                        onComplete={handleComplete}
                                        disabled={isSubmitting}
                                        autoFocus
                                    >
                                        <InputOTPGroup className="gap-1.5">
                                            {[...Array(6)].map((_, i) => (
                                                <InputOTPSlot
                                                    key={i}
                                                    index={i}
                                                    className={cn(
                                                        "w-11 h-14 text-xl font-bold rounded-xl border-2 transition-all",
                                                        "focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary",
                                                        isSubmitting && "opacity-60"
                                                    )}
                                                />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>

                                <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-center gap-2">
                                    <ShieldCheck size={16} className="text-primary" />
                                    <Caption lang={currentLanguage} className="text-primary/80 font-medium">
                                        {t.secure}
                                    </Caption>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <Button
                                        className="w-full h-14 rounded-2xl text-lg group bg-primary hover:bg-primary/90"
                                        onClick={() => handleComplete(code)}
                                        disabled={code.length !== 6 || isSubmitting}
                                    >
                                        <span>{t.submit}</span>
                                        {rtl ? (
                                            <ArrowRight size={20} className="mr-2 rotate-180 group-hover:-translate-x-1 transition-transform" />
                                        ) : (
                                            <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        )}
                                    </Button>

                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
