import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Clock, CheckCircle, XCircle, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Negotiation {
  id: string;
  initiator_id: string;
  recipient_id: string;
  price_offer: number | null;
  duration_offer: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface BuyerNegotiationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | null;
  onRefresh: () => void;
  currentLanguage?: 'en' | 'ar';
}

export default function BuyerNegotiationModal({ 
  open, 
  onOpenChange, 
  quoteId,
  onRefresh,
  currentLanguage = 'en'
}: BuyerNegotiationModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [quote, setQuote] = useState<any>(null);
  const [priceOffer, setPriceOffer] = useState<string>('');
  const [durationOffer, setDurationOffer] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (open && quoteId) {
      fetchNegotiations();
      fetchQuote();
    }
  }, [open, quoteId]);

  const fetchQuote = async () => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(title)')
        .eq('id', quoteId)
        .single();
      
      if (error) throw error;
      setQuote(data);
    } catch (e: any) {
      console.error('Error fetching quote:', e);
    }
  };

  const fetchNegotiations = async () => {
    if (!quoteId) return;
    
    try {
      const { data, error } = await supabase
        .from('quote_negotiations')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNegotiations(data || []);
    } catch (e: any) {
      toast.error('Failed to load negotiations: ' + e.message);
    }
  };

  const handleAcceptOffer = async (negotiationId: string) => {
    setLoading(true);
    try {
      // Update negotiation status to accepted
      const { error: negError } = await supabase
        .from('quote_negotiations')
        .update({ status: 'accepted' })
        .eq('id', negotiationId);
      
      if (negError) throw negError;

      // Keep quote status as 'negotiating' - it only becomes 'accepted' after contract is signed
      // No quote status update here

      toast.success(currentLanguage === 'ar' ? 'تم قبول العرض' : 'Offer accepted');
      fetchNegotiations();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || (currentLanguage === 'ar' ? 'فشل قبول العرض' : 'Failed to accept offer'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineOffer = async (negotiationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('quote_negotiations')
        .update({ status: 'declined' })
        .eq('id', negotiationId);
      
      if (error) throw error;

      toast.success('Offer declined');
      fetchNegotiations();
    } catch (e: any) {
      toast.error(e.message || 'Failed to decline offer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!user || !quoteId || !quote) {
      toast.error('Missing context to send offer');
      return;
    }
    if (!priceOffer && !durationOffer && !message) {
      toast.error('Add at least one field');
      return;
    }
    setLoading(true);
    try {
      const recipientId = quote.seller_id;
      const { error } = await supabase.from('quote_negotiations').insert([
        {
          quote_id: quoteId,
          initiator_id: user.id,
          recipient_id: recipientId,
          price_offer: priceOffer ? Number(priceOffer) : null,
          duration_offer: durationOffer || null,
          message: message || null,
          status: 'open'
        } as any
      ]);
      if (error) throw error;
      toast.success('Counter-offer sent');
      setPriceOffer('');
      setDurationOffer('');
      setMessage('');
      await fetchNegotiations();
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send offer');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const t = {
      en: { pending: 'Pending Response', accepted: 'Accepted', declined: 'Declined' },
      ar: { pending: 'بانتظار الرد', accepted: 'مقبول', declined: 'مرفوض' }
    }[currentLanguage];
    
    switch (status) {
      case 'open':
        return <Badge variant="secondary">{t.pending}</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />{t.accepted}</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t.declined}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const content = {
    en: {
      title: 'Negotiation History',
      description: 'Review and respond to vendor negotiation offers for this quote.',
      original: 'Original',
      vendorOffer: 'Vendor Offer',
      yourResponse: 'Your Response',
      proposedPrice: 'Proposed Price',
      proposedDuration: 'Proposed Duration',
      acceptOffer: 'Accept Offer',
      decline: 'Decline',
      createCounter: 'Create Counter-Offer',
      price: 'Price',
      duration: 'Duration (e.g., 2 weeks)',
      optionalMessage: 'Optional message',
      sendOffer: 'Send Offer',
      close: 'Close',
      noNegotiations: 'No negotiation offers yet'
    },
    ar: {
      title: 'تاريخ التفاوض',
      description: 'راجع وقم بالرد على عروض التفاوض من البائع لهذا العرض.',
      original: 'الأصلي',
      vendorOffer: 'عرض البائع',
      yourResponse: 'ردك',
      proposedPrice: 'السعر المقترح',
      proposedDuration: 'المدة المقترحة',
      acceptOffer: 'قبول العرض',
      decline: 'رفض',
      createCounter: 'إنشاء عرض مضاد',
      price: 'السعر',
      duration: 'المدة (مثلاً، أسبوعين)',
      optionalMessage: 'رسالة اختيارية',
      sendOffer: 'إرسال العرض',
      close: 'إغلاق',
      noNegotiations: 'لا توجد عروض تفاوض بعد'
    }
  };
  
  const t = content[currentLanguage];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {t.description}
          </DialogDescription>
        </DialogHeader>

        {quote && (
          <div className="mb-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold text-ink mb-1">{quote.maintenance_requests?.title}</h4>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>Original: ${quote.price?.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{quote.estimated_duration}</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {negotiations.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">{t.noNegotiations}</p>
            </div>
          ) : (
            negotiations.map((neg) => {
              const isFromVendor = neg.initiator_id !== user?.id;
              
              return (
                <div 
                  key={neg.id} 
                  className={`p-4 rounded-lg border ${
                    isFromVendor ? 'bg-blue-50 border-blue-200' : 'bg-muted/30 border-rule'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {isFromVendor ? t.vendorOffer : t.yourResponse}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(neg.created_at), 'MMM dd, yyyy - hh:mm a')}
                      </p>
                    </div>
                    {getStatusBadge(neg.status)}
                  </div>

                  {(neg.price_offer || neg.duration_offer) && (
                    <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-white rounded border">
                      {neg.price_offer && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t.proposedPrice}</p>
                          <p className="text-lg font-bold text-primary">
                            ${neg.price_offer.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {neg.duration_offer && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t.proposedDuration}</p>
                          <p className="text-lg font-semibold text-ink">
                            {neg.duration_offer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {neg.message && (
                    <div className="p-3 bg-white rounded border mb-3">
                      <p className="text-sm text-ink">{neg.message}</p>
                    </div>
                  )}

                  {isFromVendor && neg.status === 'open' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleAcceptOffer(neg.id)}
                        disabled={loading}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t.acceptOffer}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeclineOffer(neg.id)}
                        disabled={loading}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t.decline}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Counter-Offer Form */}
        <div className="mt-6 p-4 border border-rule rounded-lg bg-muted/20">
          <h4 className="font-semibold text-ink mb-3">{t.createCounter}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <input
              type="number"
              inputMode="decimal"
              placeholder={t.price}
              value={priceOffer}
              onChange={(e) => setPriceOffer(e.target.value)}
              className="w-full border border-rule rounded-md px-3 py-2 bg-background text-ink"
            />
            <input
              placeholder={t.duration}
              value={durationOffer}
              onChange={(e) => setDurationOffer(e.target.value)}
              className="w-full border border-rule rounded-md px-3 py-2 bg-background text-ink"
            />
            <Button onClick={handleCreateOffer} disabled={loading} className="w-full sm:w-auto">
              <TrendingUp className="w-4 h-4 mr-2" />
              {t.sendOffer}
            </Button>
          </div>
          <textarea
            placeholder={t.optionalMessage}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full border border-rule rounded-md px-3 py-2 bg-background text-ink"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
