import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck } from "lucide-react";
import { Heading3, BodySmall, Heading2, Caption } from "@/components/mobile/Typography";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";

interface JobCompletionQRSheetProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    currentLanguage: "en" | "ar";
}

export function JobCompletionQRSheet({
    isOpen,
    onClose,
    code,
    currentLanguage,
}: JobCompletionQRSheetProps) {

    const content = {
        ar: {
            title: "تأكيد الإنجاز",
            subtitle: "أظهر رمز QR لمقدم الخدمة لمسحه أو أعطه الرمز المكون من 6 أرقام.",
            codeLabel: "رمز الإنجاز",
            secure: "هذا الرمز يضمن عدم إغلاق الطلب بدون موافقتك",
            close: "إغلاق",
        },
        en: {
            title: "Confirm Completion",
            subtitle: "Show the QR code to the service provider to scan, or give them the 6-digit code.",
            codeLabel: "Completion Code",
            secure: "This code ensures the job won't close without your approval",
            close: "Close",
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
                        className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-background w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                            dir={rtl ? 'rtl' : 'ltr'}
                        >
                            {/* Header */}
                            <div className="relative h-20 bg-primary/5 flex items-center justify-center border-b border-border/50">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors"
                                    style={{ right: rtl ? 'none' : '1rem', left: rtl ? '1rem' : 'none' }}
                                >
                                    <X size={20} className="text-foreground/70" />
                                </button>
                                <Heading3 lang={currentLanguage} className="mb-0">{t.title}</Heading3>
                            </div>

                            {/* Content */}
                            <div className="p-6 text-center space-y-6 flex flex-col items-center">
                                <BodySmall lang={currentLanguage} className="text-muted-foreground w-full max-w-[260px] mx-auto text-center">
                                    {t.subtitle}
                                </BodySmall>

                                {/* QR Code Display */}
                                <div className="p-4 bg-white rounded-2xl shadow-sm border-2 border-primary/20 inline-block">
                                    <QRCode
                                        value={code}
                                        size={200}
                                        level="H"
                                        className="mx-auto"
                                    />
                                </div>

                                {/* 6 Digit Code Display */}
                                <div className="space-y-2 w-full">
                                    <BodySmall lang={currentLanguage} className="text-muted-foreground font-medium uppercase tracking-wide">
                                        {t.codeLabel}
                                    </BodySmall>
                                    <Heading2 lang={currentLanguage} className="tracking-[0.2em] font-bold text-primary">
                                        {code}
                                    </Heading2>
                                </div>

                                {/* Trust Banner */}
                                <div className="bg-primary/5 rounded-xl p-3 flex items-start text-start gap-3 w-full">
                                    <ShieldCheck size={20} className="text-primary mt-0.5 shrink-0" />
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
