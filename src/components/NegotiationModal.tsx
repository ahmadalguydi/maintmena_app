import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuoteMinimal {
  id: string;
  request?: { buyer_id: string };
}

interface NegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteMinimal | null;
  onSubmitted: () => void;
  currentLanguage: 'en' | 'ar';
}

export default function NegotiationModal({ 
  open, 
  onOpenChange, 
  quote, 
  onSubmitted,
  currentLanguage 
}: NegotiationModalProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [priceOffer, setPriceOffer] = useState<string>('');
  const [durationOffer, setDurationOffer] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const content = {
    en: {
      title: 'Start Negotiation',
      desc: 'Propose updated terms for this quote. This will mark the quote as negotiating for both sides.',
      priceLabel: 'Price Offer',
      durationLabel: 'Duration Offer',
      messageLabel: 'Message',
      cancel: 'Cancel',
      sendOffer: 'Send Offer',
      sending: 'Sending...',
      pricePlaceholder: 'Enter your price offer',
      durationPlaceholder: 'e.g., 2 weeks',
      messagePlaceholder: 'Add a message to explain your proposal',
      loginRequired: 'You need to be logged in to negotiate',
      noQuote: 'No quote selected',
      noRecipient: 'Recipient not found for this quote',
      success: 'Negotiation offer sent',
      error: 'Failed to send negotiation offer'
    },
    ar: {
      title: 'بدء التفاوض',
      desc: 'اقترح شروطًا محدثة لهذا العرض. سيؤدي هذا إلى وضع علامة على العرض كتفاوض لكلا الجانبين.',
      priceLabel: 'عرض السعر',
      durationLabel: 'عرض المدة',
      messageLabel: 'الرسالة',
      cancel: 'إلغاء',
      sendOffer: 'إرسال العرض',
      sending: 'جاري الإرسال...',
      pricePlaceholder: 'أدخل عرض السعر',
      durationPlaceholder: 'مثال: أسبوعين',
      messagePlaceholder: 'أضف رسالة لشرح اقتراحك',
      loginRequired: 'يجب تسجيل الدخول للتفاوض',
      noQuote: 'لم يتم تحديد عرض',
      noRecipient: 'لم يتم العثور على المستلم لهذا العرض',
      success: 'تم إرسال عرض التفاوض',
      error: 'فشل إرسال عرض التفاوض'
    }
  };

  const t = content[currentLanguage];

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t.loginRequired);
      return;
    }
    if (!quote) {
      toast.error(t.noQuote);
      return;
    }
    const recipientId = quote.request?.buyer_id;
    if (!recipientId) {
      toast.error(t.noRecipient);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('quote_negotiations').insert([
        {
          quote_id: quote.id,
          initiator_id: user.id,
          recipient_id: recipientId,
          price_offer: priceOffer ? Number(priceOffer) : null,
          duration_offer: durationOffer || null,
          message: message || null,
          status: 'open',
        } as any,
      ]);
      if (error) throw error;

      toast.success(t.success);
      setPriceOffer('');
      setDurationOffer('');
      setMessage('');
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {t.desc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.priceLabel}</label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={t.pricePlaceholder}
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.durationLabel}</label>
            <Input
              placeholder={t.durationPlaceholder}
              value={durationOffer}
              onChange={(e) => setDurationOffer(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">{t.messageLabel}</label>
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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.sending : t.sendOffer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
