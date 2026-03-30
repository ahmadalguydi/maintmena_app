import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Copy, Check } from "lucide-react";
import { Heading3, BodySmall, Caption } from "@/components/mobile/Typography";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface JobCompletionQRSheetProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentLanguage: "en" | "ar";
}

/**
 * Premium 6-digit completion code display for buyers.
 * (QR removed per platform requirements — code-only verification)
 */
export function JobCompletionQRSheet({
    isOpen,
    onClose,
    code,
    currentLanguage,
}: JobCompletionQRSheetProps) {
    const [copied, setCopied] = useState(false);

    const content = {
        ar: {
            title: "رمز التأكيد",
            subtitle: "أعط هذا الرمز لمقدم الخدمة عند اكتمال العمل",
            codeLabel: "رمز الإنجاز",
            secure: "هذا الرمز يضمن عدم إغلاق الطلب بدون موافقتك",
            copied: "تم النسخ!",
            tapToCopy: "اضغط للنسخ",
        },
        en: {
            title: "Completion Code",
            subtitle: "Give this code to your service provider once work is done",
            codeLabel: "Completion Code",
            secure: "This code ensures the job won\u2019t close without your approval",
            copied: "Copied!",
            tapToCopy: "Tap to copy",
        }
    };

    const t = content[currentLanguage];
    const rtl = currentLanguage === 'ar';
    const digits = code.split('');

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            toast.success(t.copied);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback — select text approach
            toast.info(t.tapToCopy);
        }
    }, [code, t.copied, t.tapToCopy]);

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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-background w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                            dir={rtl ? 'rtl' : 'ltr'}
                        >
                            {/* Header with gradient */}
                            <div className="relative h-28 bg-gradient-to-br from-primary/15 via-primary/8 to-accent/10 flex items-center justify-center overflow-hidden">
                                {/* Decorative circles */}
                                <div className="absolute w-48 h-48 rounded-full border border-primary/10 -top-12 -right-12" />
                                <div className="absolute w-32 h-32 rounded-full border border-primary/8 -bottom-8 -left-8" />

                                <button
                                    onClick={onClose}
                                    className="absolute top-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                                    style={{ right: rtl ? 'auto' : '1rem', left: rtl ? '1rem' : 'auto' }}
                                >
                                    <X size={20} className="text-foreground/70" />
                                </button>

                                <div className="text-center relative z-10">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring", damping: 15 }}
                                        className="w-14 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-2"
                                    >
                                        <ShieldCheck size={28} className="text-primary" />
                                    </motion.div>
                                    <Heading3 lang={currentLanguage} className="mb-0">{t.title}</Heading3>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center space-y-6 flex flex-col items-center">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground w-full max-w-[260px] mx-auto text-center">
                                    {t.subtitle}
                                </BodySmall>

                                {/* Premium 6-digit code display */}
                                <motion.button
                                    onClick={handleCopy}
                                    className="group relative w-full"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <div className="flex justify-center gap-2" dir="ltr">
                                        {digits.map((digit, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 20, rotateX: -90 }}
                                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                                transition={{
                                                    delay: 0.3 + i * 0.08,
                                                    type: "spring",
                                                    damping: 12,
                                                }}
                                                className={cn(
                                                    "w-12 h-16 rounded-xl flex items-center justify-center",
                                                    "bg-gradient-to-b from-primary/5 to-primary/10",
                                                    "border-2 border-primary/20",
                                                    "shadow-sm group-hover:shadow-md group-hover:border-primary/40",
                                                    "transition-all duration-200"
                                                )}
                                            >
                                                <span className="text-2xl font-bold text-primary font-mono tabular-nums">
                                                    {digit}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Copy indicator */}
                                    <motion.div
                                        className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground"
                                        animate={copied ? { scale: [1, 1.15, 1] } : {}}
                                    >
                                        {copied ? (
                                            <>
                                                <Check size={14} className="text-green-600" />
                                                <span className="text-green-600 font-medium">{t.copied}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={14} />
                                                <span>{t.tapToCopy}</span>
                                            </>
                                        )}
                                    </motion.div>
                                </motion.button>

                                {/* Trust Banner */}
                                <div className="bg-primary/5 rounded-xl p-3 flex items-start text-start gap-3 w-full">
                                    <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
                                    <Caption lang={currentLanguage} className="text-primary/80 font-medium leading-snug">
                                        {t.secure}
                                    </Caption>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
