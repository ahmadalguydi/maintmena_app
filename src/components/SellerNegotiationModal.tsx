import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, DollarSign, Clock } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface SellerNegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: any;
  onCounterOffer: (negotiationId: string, price: number, duration: string, message: string) => void;
  currentLanguage: 'en' | 'ar';
}

export default function SellerNegotiationModal({ 
  open, 
  onOpenChange, 
  negotiation,
  onCounterOffer,
  currentLanguage 
}: SellerNegotiationModalProps) {
  const { formatAmount } = useCurrency();
  const [priceOffer, setPriceOffer] = useState<string>('');
  const [durationOffer, setDurationOffer] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const content = {
    en: {
      title: 'Counter Negotiation',
      desc: "Respond to the buyer's negotiation offer with your counter-proposal",
      buyerOffer: "Buyer's Offer",
      received: 'Received',
      price: 'Price',
      duration: 'Duration',
      messageLabel: 'Message',
      counterPrice: 'Your Counter Price',
      counterDuration: 'Your Counter Duration',
      yourMessage: 'Your Message',
      cancel: 'Cancel',
      sendOffer: 'Send Counter-Offer',
      sending: 'Sending...',
      pricePlaceholder: 'Enter your counter price offer',
      durationPlaceholder: 'e.g., 3 weeks',
      messagePlaceholder: 'Explain your counter-proposal'
    },
    ar: {
      title: 'تفاوض مضاد',
      desc: 'رد على عرض التفاوض من المشتري بعرضك المضاد',
      buyerOffer: 'عرض المشتري',
      received: 'مستلم',
      price: 'السعر',
      duration: 'المدة',
      messageLabel: 'الرسالة',
      counterPrice: 'سعرك المضاد',
      counterDuration: 'مدتك المضادة',
      yourMessage: 'رسالتك',
      cancel: 'إلغاء',
      sendOffer: 'إرسال العرض المضاد',
      sending: 'جاري الإرسال...',
      pricePlaceholder: 'أدخل عرض السعر المضاد',
      durationPlaceholder: 'مثال: 3 أسابيع',
      messagePlaceholder: 'اشرح عرضك المضاد'
    }
  };

  const t = content[currentLanguage];

  const handleSubmit = async () => {
    if (!priceOffer && !durationOffer && !message) {
      return;
    }

    setSubmitting(true);
    try {
      await onCounterOffer(
        negotiation.id,
        priceOffer ? Number(priceOffer) : 0,
        durationOffer,
        message
      );
      setPriceOffer('');
      setDurationOffer('');
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  if (!negotiation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {t.desc}
          </DialogDescription>
        </DialogHeader>

        {/* Current Offer */}
        <div className="p-4 bg-muted/30 rounded-lg border border-rule space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{t.buyerOffer}</h3>
            <Badge variant="secondary">{t.received}</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {negotiation.price_offer && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{t.price}</p>
                  <p className="font-semibold">{formatAmount(negotiation.price_offer)}</p>
                </div>
              </div>
            )}
            {negotiation.duration_offer && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t.duration}</p>
                  <p className="font-semibold">{negotiation.duration_offer}</p>
                </div>
              </div>
            )}
          </div>
          
          {negotiation.message && (
            <div className="pt-2 border-t border-rule">
              <p className="text-xs text-muted-foreground mb-1">{t.messageLabel}:</p>
              <p className="text-sm">{negotiation.message}</p>
            </div>
          )}
        </div>

        {/* Counter Offer Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.counterPrice}</label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={t.pricePlaceholder}
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.counterDuration}</label>
            <Input
              placeholder={t.durationPlaceholder}
              value={durationOffer}
              onChange={(e) => setDurationOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.yourMessage}</label>
            <Textarea
              placeholder={t.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || (!priceOffer && !durationOffer && !message)}>
            {submitting ? t.sending : t.sendOffer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
