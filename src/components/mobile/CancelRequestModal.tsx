import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  MoreHorizontal,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SoftCard } from './SoftCard';
import { Body, Caption, Heading3 } from './Typography';

export type CancelReason =
  | 'wrong_time'
  | 'price_too_high'
  | 'change_provider'
  | 'other';

interface CancelRequestModalProps {
  currentLanguage: 'en' | 'ar';
  isOpen: boolean;
  onClose: () => void;
  onCancel: (reason: CancelReason, wantsDifferentProvider?: boolean) => void;
  onReschedule?: () => void;
  hasProvider?: boolean;
}

const content = {
  ar: {
    title: 'إلغاء الطلب',
    subtitle: 'اختر السبب حتى نوجهك لأفضل خطوة.',
    wrongTime: 'الوقت غير مناسب',
    priceTooHigh: 'السعر أعلى من المتوقع',
    changeProvider: 'البحث عن مقدم خدمة آخر',
    other: 'سبب آخر',
    cancelRequest: 'إلغاء الطلب',
    findDifferent: 'البحث عن مقدم آخر',
    rescheduleInstead: 'تغيير الموعد بدلا من الإلغاء',
    keepRequest: 'الاحتفاظ بالطلب',
    warningTitle: 'قبل الإلغاء',
    warningText: 'إذا كان لديك مقدم خدمة مخصص، سنوقف الطلب الحالي قبل تنفيذ اختيارك.',
  },
  en: {
    title: 'Cancel request',
    subtitle: 'Choose the reason so we can guide the next step.',
    wrongTime: 'Wrong timing',
    priceTooHigh: 'Price is higher than expected',
    changeProvider: 'Find another provider',
    other: 'Other reason',
    cancelRequest: 'Cancel request',
    findDifferent: 'Find another provider',
    rescheduleInstead: 'Reschedule instead',
    keepRequest: 'Keep request',
    warningTitle: 'Before you cancel',
    warningText: 'If a provider is assigned, we will stop the current assignment before applying your choice.',
  },
};

const reasons = [
  { key: 'wrong_time', Icon: CalendarClock, showReschedule: true },
  { key: 'change_provider', Icon: RefreshCw, showFindDifferent: true },
  { key: 'price_too_high', Icon: CircleDollarSign },
  { key: 'other', Icon: MoreHorizontal },
] satisfies Array<{
  key: CancelReason;
  Icon: typeof CalendarClock;
  showFindDifferent?: boolean;
  showReschedule?: boolean;
}>;

export const CancelRequestModal = ({
  currentLanguage,
  isOpen,
  onClose,
  onCancel,
  onReschedule,
  hasProvider = false,
}: CancelRequestModalProps) => {
  const t = content[currentLanguage];
  const isRTL = currentLanguage === 'ar';
  const [selectedReason, setSelectedReason] = useState<CancelReason | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const selectedReasonData = reasons.find((reason) => reason.key === selectedReason);

  const getReasonLabel = (key: CancelReason) => {
    const labels: Record<CancelReason, string> = {
      wrong_time: t.wrongTime,
      price_too_high: t.priceTooHigh,
      change_provider: t.changeProvider,
      other: t.other,
    };
    return labels[key];
  };

  const resetAndClose = () => {
    setSelectedReason(null);
    setShowWarning(false);
    onClose();
  };

  const handleCancelClick = () => {
    if (hasProvider && !showWarning) {
      setShowWarning(true);
      return;
    }

    if (selectedReason) {
      onCancel(selectedReason);
      setSelectedReason(null);
      setShowWarning(false);
    }
  };

  const handleFindDifferent = () => {
    if (!selectedReason) return;
    onCancel(selectedReason, true);
    setSelectedReason(null);
    setShowWarning(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={resetAndClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-background pb-safe shadow-2xl sm:max-w-md sm:rounded-3xl',
            )}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 z-10 border-b border-border/30 bg-background px-5 pb-3 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Heading3 lang={currentLanguage}>{t.title}</Heading3>
                  <Caption lang={currentLanguage} className="text-muted-foreground">
                    {t.subtitle}
                  </Caption>
                </div>
                <button
                  onClick={resetAndClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 transition-colors hover:bg-muted"
                  aria-label={currentLanguage === 'ar' ? 'إغلاق' : 'Close'}
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            {showWarning && hasProvider ? (
              <div className="px-5 pt-4">
                <SoftCard className="border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                  <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
                    <AlertTriangle className="mt-0.5 text-amber-600" size={20} />
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <Body lang={currentLanguage} className="font-medium text-amber-800 dark:text-amber-300">
                        {t.warningTitle}
                      </Body>
                      <Caption lang={currentLanguage} className="text-amber-700 dark:text-amber-400">
                        {t.warningText}
                      </Caption>
                    </div>
                  </div>
                </SoftCard>
              </div>
            ) : null}

            <div className="space-y-2 px-5 py-4">
              {reasons.map((reason) => {
                const Icon = reason.Icon;
                const selected = selectedReason === reason.key;

                return (
                  <motion.button
                    key={reason.key}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedReason(reason.key);
                      setShowWarning(false);
                    }}
                    className={cn(
                      'w-full rounded-2xl border-2 p-3 transition-all',
                      selected
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border hover:border-destructive/30',
                    )}
                  >
                    <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                      <span
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                          selected ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon size={19} />
                      </span>
                      <Body
                        lang={currentLanguage}
                        className={cn('flex-1', isRTL ? 'text-right' : 'text-left')}
                      >
                        {getReasonLabel(reason.key)}
                      </Body>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 border-t border-border/30 p-5">
              {selectedReasonData?.showReschedule && hasProvider && onReschedule ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    resetAndClose();
                    onReschedule();
                  }}
                  className="h-12 w-full border-primary/30 text-primary hover:bg-primary/5"
                >
                  <CalendarClock size={18} className={cn(isRTL ? 'ml-2' : 'mr-2')} />
                  {t.rescheduleInstead}
                </Button>
              ) : null}

              {selectedReasonData?.showFindDifferent && hasProvider ? (
                <Button
                  variant="outline"
                  onClick={handleFindDifferent}
                  disabled={!selectedReason}
                  className="h-12 w-full"
                >
                  <RefreshCw size={18} className={cn(isRTL ? 'ml-2' : 'mr-2')} />
                  {t.findDifferent}
                </Button>
              ) : null}

              <div className="flex gap-3">
                <Button variant="outline" onClick={resetAndClose} className="h-12 flex-1">
                  {t.keepRequest}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelClick}
                  disabled={!selectedReason}
                  className="h-12 flex-1"
                >
                  {t.cancelRequest}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
