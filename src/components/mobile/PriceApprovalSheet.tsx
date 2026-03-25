import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Heading3, BodySmall, Heading2 } from '@/components/mobile/Typography';
import { useCurrency } from '@/hooks/useCurrency';
import { getRequestPriceDisplay, parseRequestPrice } from '@/lib/requestPresentation';

interface PriceApprovalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  price: number;
  currentLanguage: 'en' | 'ar';
  isSubmitting?: boolean;
  sellerPricing?: any;
}

export function PriceApprovalSheet({
  isOpen,
  onClose,
  onApprove,
  onReject,
  price,
  currentLanguage,
  isSubmitting = false,
  sellerPricing,
}: PriceApprovalSheetProps) {
  const { formatAmount } = useCurrency();
  const expectedPrice = getRequestPriceDisplay(parseRequestPrice(sellerPricing, null), {
    currentLanguage,
    formatAmount,
  });

  const content = {
    ar: {
      title: 'الموافقة على السعر النهائي',
      subtitle:
        'أنهى مقدم الخدمة العمل وأدخل السعر النهائي أدناه. راجع المبلغ ثم وافق لإغلاق الطلب بشكل نهائي.',
      finalPrice: 'السعر النهائي المطلوب',
      originalEstimate: 'التوقع السابق',
      approve: 'أوافق وأغلق الطلب',
      reject: 'رفض السعر / توجد مشكلة',
    },
    en: {
      title: 'Approve Final Price',
      subtitle:
        'The provider finished the work and entered the final amount below. Review it before closing the request.',
      finalPrice: 'Final amount requested',
      originalEstimate: 'Earlier expectation',
      approve: 'Approve & Close Request',
      reject: 'Reject / Report Issue',
    },
  };

  const t = content[currentLanguage];
  const rtl = currentLanguage === 'ar';

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSubmitting ? onClose : undefined}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[100] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-background"
            dir={rtl ? 'rtl' : 'ltr'}
          >
            <div className="flex flex-shrink-0 justify-center pt-3 pb-2">
              <div className="h-1.5 w-12 rounded-full bg-border" />
            </div>

            <div className="flex flex-shrink-0 items-center justify-between border-b border-border/50 px-5 py-3">
              <Heading3 lang={currentLanguage} className="mb-0.5">
                {t.title}
              </Heading3>
              <button
                onClick={!isSubmitting ? onClose : undefined}
                className="rounded-full bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <BodySmall lang={currentLanguage} className="text-center leading-relaxed text-muted-foreground">
                {t.subtitle}
              </BodySmall>

              <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 to-primary/5 p-6 text-center shadow-inner">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <BodySmall lang={currentLanguage} className="font-medium text-primary/70">
                  {t.finalPrice}
                </BodySmall>
                <Heading2 lang={currentLanguage} className="text-primary font-extrabold tracking-tight">
                  {formatAmount(price)}
                </Heading2>
              </div>

              {expectedPrice ? (
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <BodySmall lang={currentLanguage} className="font-semibold text-muted-foreground">
                        {t.originalEstimate}
                      </BodySmall>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {expectedPrice.title}
                      </p>
                    </div>
                    <div className="rounded-full bg-primary/8 px-3 py-1 text-[11px] font-semibold text-primary">
                      {expectedPrice.eyebrow}
                    </div>
                  </div>
                  <BodySmall lang={currentLanguage} className="mt-3 leading-6 text-muted-foreground">
                    {expectedPrice.detail}
                  </BodySmall>
                </div>
              ) : null}

              <div className="space-y-3 pt-2">
                <Button
                  className="h-14 w-full gap-2 rounded-2xl bg-primary text-base shadow-lg shadow-primary/25 hover:bg-primary/90"
                  onClick={onApprove}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Check size={20} />
                  )}
                  {t.approve}
                </Button>
                <Button
                  variant="outline"
                  className="h-12 w-full gap-2 rounded-2xl border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900/40 dark:text-orange-400 dark:hover:bg-orange-950/20"
                  onClick={onReject}
                  disabled={isSubmitting}
                >
                  <XCircle size={16} />
                  {t.reject}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
