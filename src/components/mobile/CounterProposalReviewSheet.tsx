import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomSheet } from './BottomSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { Heading3, Body, BodySmall } from './Typography';
import { SoftCard } from './SoftCard';
import { format } from 'date-fns';

interface CounterProposalReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  currentLanguage: 'en' | 'ar';
  onSuccess?: () => void;
}

export const CounterProposalReviewSheet = ({ 
  open, 
  onOpenChange, 
  booking, 
  currentLanguage,
  onSuccess 
}: CounterProposalReviewSheetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState<'accept' | 'reject' | 'counter'>('accept');
  const [buyerCounter, setBuyerCounter] = useState({
    proposed_start_date: booking?.seller_counter_proposal?.proposed_start_date || '',
    proposed_end_date: booking?.seller_counter_proposal?.proposed_end_date || '',
    price_estimate: booking?.seller_counter_proposal?.price_estimate || '',
    notes: ''
  });
  const [rejectReason, setRejectReason] = useState('');

  const content = {
    en: {
      title: 'Review Counter Proposal',
      original: 'Your Request',
      proposed: 'Seller Proposal',
      startDate: 'Start Date',
      endDate: 'End Date',
      price: 'Price',
      deposit: 'Deposit',
      notes: 'Notes',
      accept: 'Accept & Sign Contract',
      counterBack: 'Counter Back',
      reject: 'Reject',
      rejectReason: 'Reason for Rejection',
      buyerNotes: 'Your Counter-Proposal Notes',
      submitting: 'Submitting...',
      cancel: 'Cancel'
    },
    ar: {
      title: 'مراجعة العرض المضاد',
      original: 'طلبك',
      proposed: 'عرض البائع',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      price: 'السعر',
      deposit: 'العربون',
      notes: 'ملاحظات',
      accept: 'قبول وتوقيع العقد',
      counterBack: 'عرض مضاد',
      reject: 'رفض',
      rejectReason: 'سبب الرفض',
      buyerNotes: 'ملاحظات عرضك المضاد',
      submitting: 'جاري الإرسال...',
      cancel: 'إلغاء'
    }
  };

  const t = content[currentLanguage];

  const handleAccept = async () => {
    if (!user || !booking) {
      toast.error(currentLanguage === 'ar' ? 'خطأ: بيانات غير صالحة' : 'Error: Invalid data');
      return;
    }
    
    setSubmitting(true);
    try {
      const sellerProposal = booking.seller_counter_proposal || {};
      
      // Create contract with booking details
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          booking_id: booking.id,
          buyer_id: user.id,
          seller_id: booking.seller_id,
          status: 'pending_buyer',
          language_mode: 'dual',
          metadata: {
            service_category: booking.service_category,
            job_description: booking.job_description,
            location_city: booking.location_city,
            location_address: booking.location_address,
            final_price: sellerProposal.price_estimate || booking.final_amount
          }
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create binding terms with accepted counter-proposal details
      await supabase
        .from('binding_terms')
        .insert({
          contract_id: contract.id,
          start_date: sellerProposal.proposed_start_date || booking.proposed_start_date,
          completion_date: sellerProposal.proposed_end_date || booking.proposed_end_date,
          warranty_days: 90,
          materials_by: 'seller'
        });

      // Update booking to contract_pending and save final price
      const { error } = await supabase
        .from('booking_requests')
        .update({ 
          status: 'contract_pending',
          final_amount: sellerProposal.price_estimate || booking.final_amount
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم إنشاء العقد!' : 'Contract Created!');
      onSuccess?.();
      onOpenChange(false);
      // Navigate back to booking detail
      navigate(`/app/buyer/booking/${booking.id}`);
    } catch (error: any) {
      console.error('Accept error:', error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterBack = async () => {
    if (!buyerCounter.notes.trim()) {
      toast.error(currentLanguage === 'ar' ? 'يرجى تقديم ملاحظات' : 'Please provide notes');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'buyer_countered',
          buyer_counter_proposal: buyerCounter
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم الإرسال!' : 'Sent!');
      onSuccess?.();
      onOpenChange(false);
      // Navigate back to booking detail
      navigate(`/app/buyer/booking/${booking.id}`);
    } catch (error: any) {
      console.error('Counter error:', error);
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(currentLanguage === 'ar' ? 'يرجى تقديم سبب الرفض' : 'Please provide a reason');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'cancelled',
          cancellation_reason: rejectReason
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم الرفض' : 'Rejected');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    switch (action) {
      case 'accept':
        await handleAccept();
        break;
      case 'counter':
        await handleCounterBack();
        break;
      case 'reject':
        await handleReject();
        break;
    }
  };

  const sellerProposal = booking?.seller_counter_proposal || {};

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <div className="px-6 py-4 space-y-6 max-h-[80vh] overflow-y-auto" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        <Heading3 lang={currentLanguage}>{t.title}</Heading3>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <SoftCard>
            <BodySmall lang={currentLanguage} className="text-muted-foreground mb-3">{t.original}</BodySmall>
            <div className="space-y-2 text-sm">
              <div>
                <Label className="text-xs">{t.startDate}</Label>
                <Body lang={currentLanguage}>
                  {booking?.proposed_start_date 
                    ? format(new Date(booking.proposed_start_date), 'yyyy-MM-dd')
                    : 'N/A'}
                </Body>
              </div>
              <div>
                <Label className="text-xs">{t.endDate}</Label>
                <Body lang={currentLanguage}>
                  {booking?.proposed_end_date 
                    ? format(new Date(booking.proposed_end_date), 'yyyy-MM-dd')
                    : 'N/A'}
                </Body>
              </div>
            </div>
          </SoftCard>

          <SoftCard className="border-2 border-primary/30">
            <BodySmall lang={currentLanguage} className="text-primary mb-3">{t.proposed}</BodySmall>
            <div className="space-y-2 text-sm">
              <div>
                <Label className="text-xs">{t.startDate}</Label>
                <Body lang={currentLanguage}>
                  {sellerProposal.proposed_start_date 
                    ? format(new Date(sellerProposal.proposed_start_date), 'yyyy-MM-dd')
                    : 'N/A'}
                </Body>
              </div>
              <div>
                <Label className="text-xs">{t.endDate}</Label>
                <Body lang={currentLanguage}>
                  {sellerProposal.proposed_end_date 
                    ? format(new Date(sellerProposal.proposed_end_date), 'yyyy-MM-dd')
                    : 'N/A'}
                </Body>
              </div>
              {sellerProposal.price_estimate && (
                <div>
                  <Label className="text-xs">{t.price}</Label>
                  <Body lang={currentLanguage}>{sellerProposal.price_estimate} SAR</Body>
                </div>
              )}
            </div>
          </SoftCard>
        </div>

        {sellerProposal.notes && (
          <SoftCard>
            <Label>{t.notes}</Label>
            <Body lang={currentLanguage} className="text-sm mt-2">{sellerProposal.notes}</Body>
          </SoftCard>
        )}

        {/* Action Buttons - Direct Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="default"
            onClick={handleAccept}
            disabled={submitting}
            className="h-12"
          >
            <CheckCircle size={16} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
            {currentLanguage === 'ar' ? 'قبول' : 'Accept'}
          </Button>
          <Button
            variant={action === 'counter' ? 'default' : 'outline'}
            onClick={() => setAction(action === 'counter' ? 'accept' : 'counter')}
            className="h-12"
          >
            <ArrowLeftRight size={16} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
            {currentLanguage === 'ar' ? 'عرض' : 'Counter'}
          </Button>
          <Button
            variant={action === 'reject' ? 'destructive' : 'outline'}
            onClick={() => setAction(action === 'reject' ? 'accept' : 'reject')}
            className={`h-12 ${action !== 'reject' ? 'text-destructive border-destructive hover:bg-destructive hover:text-white' : ''}`}
          >
            <XCircle size={16} className={currentLanguage === 'ar' ? 'ml-2' : 'mr-2'} />
            {currentLanguage === 'ar' ? 'رفض' : 'Reject'}
          </Button>
        </div>

        {/* Action-specific forms */}
        {action === 'counter' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.startDate}</Label>
                <Input
                  type="date"
                  value={buyerCounter.proposed_start_date}
                  onChange={(e) => setBuyerCounter({...buyerCounter, proposed_start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.endDate}</Label>
                <Input
                  type="date"
                  value={buyerCounter.proposed_end_date}
                  onChange={(e) => setBuyerCounter({...buyerCounter, proposed_end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.buyerNotes}</Label>
              <Textarea
                rows={3}
                value={buyerCounter.notes}
                onChange={(e) => setBuyerCounter({...buyerCounter, notes: e.target.value})}
              />
            </div>
          </div>
        )}

        {action === 'reject' && (
          <div className="space-y-2">
            <Label>{t.rejectReason}</Label>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        )}

        {/* Submit button only shows for counter/reject forms */}
        {(action === 'counter' || action === 'reject') && (
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setAction('accept')}
              className="flex-1 h-12 rounded-full"
              disabled={submitting}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={action === 'counter' ? handleCounterBack : handleReject}
              className="flex-1 h-12 rounded-full"
              disabled={submitting}
              variant={action === 'reject' ? 'destructive' : 'default'}
            >
              {submitting ? t.submitting : (action === 'counter' ? t.counterBack : t.reject)}
            </Button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
