import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Phone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heading3, Body, BodySmall, Caption } from './Typography';

interface ReachOutPromptModalProps {
    currentLanguage: 'en' | 'ar';
    isOpen: boolean;
    onClose: () => void;
    onContact: () => void;
    buyerName?: string;
}

const content = {
    ar: {
        title: 'تواصل مع العميل! 💬',
        message: 'تواصل مع العميل لتحديد أفضل وقت وفهم تفاصيل المشكلة بشكل أفضل',
        tip1: 'اسأل عن تفاصيل المشكلة',
        tip2: 'اتفق على أفضل وقت للزيارة',
        tip3: 'وضّح أي معلومات إضافية تحتاجها',
        contactNow: 'تواصل الآن',
        later: 'لاحقاً',
    },
    en: {
        title: 'Reach out to the buyer! 💬',
        message: 'Contact the buyer to discuss the best time and understand the issue better',
        tip1: 'Ask about the problem details',
        tip2: 'Agree on the best visit time',
        tip3: 'Clarify any additional info you need',
        contactNow: 'Contact Now',
        later: 'Later',
    }
};

export const ReachOutPromptModal = ({
    currentLanguage,
    isOpen,
    onClose,
    onContact,
    buyerName,
}: ReachOutPromptModalProps) => {
    const t = content[currentLanguage];
    const isRTL = currentLanguage === 'ar';

    const tips = [t.tip1, t.tip2, t.tip3];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-background rounded-3xl overflow-hidden"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    >
                        {/* Close button */}
                        <div className="flex justify-end p-3">
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 text-center">
                            {/* Animated Icon */}
                            <motion.div
                                animate={{
                                    y: [0, -5, 0],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatType: 'reverse'
                                }}
                                className="text-5xl mb-4"
                            >
                                📱
                            </motion.div>

                            <Heading3 lang={currentLanguage} className="mb-2">
                                {t.title}
                            </Heading3>

                            <Body lang={currentLanguage} className="text-muted-foreground mb-6">
                                {t.message}
                            </Body>

                            {/* Tips */}
                            <div className="space-y-2 mb-6">
                                {tips.map((tip, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "flex items-center gap-2 text-sm text-muted-foreground",
                                            isRTL ? "flex-row-reverse" : ""
                                        )}
                                    >
                                        <span className="text-primary">✓</span>
                                        <BodySmall lang={currentLanguage}>{tip}</BodySmall>
                                    </div>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => {
                                        onContact();
                                        onClose();
                                    }}
                                    className="w-full"
                                    size="lg"
                                >
                                    <MessageCircle size={18} className={cn(isRTL ? "ml-2" : "mr-2")} />
                                    {t.contactNow}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    className="w-full text-muted-foreground"
                                >
                                    {t.later}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
