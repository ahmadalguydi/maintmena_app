import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowUpDown, Loader2 } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface PriceProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  currentLanguage: 'en' | 'ar';
  onSubmit: (newPrice: number, reason: string) => Promise<void>;
}

export function PriceProposalModal({
  isOpen,
  onClose,
  currentPrice,
  currentLanguage,
  onSubmit
}: PriceProposalModalProps) {
  const { formatAmount } = useCurrency();
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRtl = currentLanguage === 'ar';

  const content = {
    en: {
      title: 'Propose New Price',
      currentPrice: 'Current Price',
      newPrice: 'New Price (SAR)',
      reason: 'Reason for change',
      reasonPlaceholder: 'e.g., Additional materials needed, scope change...',
      cancel: 'Cancel',
      submit: 'Send Proposal',
      quickOptions: 'Quick adjustments:'
    },
    ar: {
      title: 'اقتراح سعر جديد',
      currentPrice: 'السعر الحالي',
      newPrice: 'السعر الجديد (ريال)',
      reason: 'سبب التغيير',
      reasonPlaceholder: 'مثال: مواد إضافية مطلوبة، تغيير في نطاق العمل...',
      cancel: 'إلغاء',
      submit: 'إرسال الاقتراح',
      quickOptions: 'تعديلات سريعة:'
    }
  };

  const t = content[currentLanguage];

  const quickAdjustments = [
    { label: '+50', value: 50 },
    { label: '+100', value: 100 },
    { label: '+200', value: 200 },
    { label: '-50', value: -50 }
  ];

  const handleQuickAdjust = (value: number) => {
    const current = parseFloat(newPrice) || currentPrice;
    setNewPrice(Math.max(0, current + value).toString());
  };

  const handleSubmit = async () => {
    const priceValue = parseFloat(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(priceValue, reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const difference = parseFloat(newPrice) - currentPrice;
  const isValid = !isNaN(parseFloat(newPrice)) && parseFloat(newPrice) > 0 && parseFloat(newPrice) !== currentPrice;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <ArrowUpDown className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <DialogDescription className="sr-only">
          {isRtl ? 'تعديل السعر المقترح' : 'Modify the proposed price'}
        </DialogDescription>

        <div className="space-y-5" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="p-4 rounded-xl bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t.currentPrice}</p>
            <p className="text-2xl font-bold">{formatAmount(currentPrice)}</p>
          </div>

          <div className="space-y-2">
            <Label>{t.newPrice}</Label>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="0"
              className="text-lg font-semibold text-center"
            />

            {isValid && (
              <p className={`text-sm text-center ${difference > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {difference > 0 ? '+' : ''}{formatAmount(difference)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.quickOptions}</Label>
            <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              {quickAdjustments.map((adj) => (
                <Button
                  key={adj.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdjust(adj.value)}
                  className="flex-1"
                >
                  {adj.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.reason}</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPlaceholder}
              rows={3}
            />
          </div>

          <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.submit}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
