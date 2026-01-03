import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';


interface BookingResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  currentLanguage: 'en' | 'ar';
  onSuccess?: () => void;
}

const BookingResponseModal = ({
  open,
  onOpenChange,
  booking,
  currentLanguage,
  onSuccess
}: BookingResponseModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [responseType, setResponseType] = useState<'accept' | 'decline' | 'counter'>('accept');

  const [counterProposal, setCounterProposal] = useState({
    proposed_start_date: booking?.proposed_start_date || '',
    proposed_end_date: booking?.proposed_end_date || '',
    price_estimate: '',
    deposit_amount: '',
    notes: '',
  });

  const [declineReason, setDeclineReason] = useState('');

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      // Create contract for this booking
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          booking_id: booking.id,
          buyer_id: booking.buyer_id,
          seller_id: user!.id,
          status: 'pending_buyer',
          language_mode: 'dual'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create default binding terms
      await supabase
        .from('binding_terms')
        .insert({
          contract_id: contract.id,
          warranty_days: 90
        });

      // Update booking status to contract_pending and store contract_id
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'contract_pending',
          seller_response: 'Booking accepted - contract created for review'
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: currentLanguage === 'ar' ? 'تم إنشاء العقد' : 'Contract Created!',
        description: currentLanguage === 'ar' ? 'تم إنشاء عقد للمراجعة. انقر للعرض.' : 'Contract created for buyer review. Click to view.',
      });

      // Auto-navigate after short delay
      setTimeout(() => {
        window.location.href = `/contracts/${contract.id}`;
      }, 1500);

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast({
        title: currentLanguage === 'ar' ? 'سبب مطلوب' : 'Reason required',
        description: currentLanguage === 'ar' ? 'يرجى تقديم سبب الرفض' : 'Please provide a reason for declining',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'declined',
          seller_response: declineReason,
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: currentLanguage === 'ar' ? 'تم الرفض' : 'Declined',
        description: currentLanguage === 'ar' ? 'تم رفض طلب الحجز' : 'Booking request declined',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterProposal = async () => {
    if (!counterProposal.notes.trim()) {
      toast({
        title: currentLanguage === 'ar' ? 'ملاحظات مطلوبة' : 'Notes required',
        description: currentLanguage === 'ar' ? 'يرجى تقديم تفاصيل العرض المضاد' : 'Please provide counter-proposal details',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('booking_requests')
        .update({
          status: 'counter_proposed',
          seller_counter_proposal: counterProposal,
          seller_response: counterProposal.notes,
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: currentLanguage === 'ar' ? 'تم الإرسال' : 'Sent!',
        description: currentLanguage === 'ar' ? 'تم إرسال العرض المضاد' : 'Counter-proposal sent',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Counter proposal error:', error);
      const errorMessage = error.message.includes('check constraint')
        ? 'Database constraint error. Please contact support.'
        : error.message;

      toast({
        title: currentLanguage === 'ar' ? 'خطأ' : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    switch (responseType) {
      case 'accept':
        await handleAccept();
        break;
      case 'decline':
        await handleDecline();
        break;
      case 'counter':
        await handleCounterProposal();
        break;
    }
  };

  const getBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Add null check to prevent crash
  if (!booking) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {currentLanguage === 'ar' ? 'الرد على طلب الحجز' : 'Respond to Booking Request'}
          </DialogTitle>
          <DialogDescription>
            {currentLanguage === 'ar'
              ? 'راجع تفاصيل طلب الحجز واختر إجراءك'
              : 'Review the booking request details and choose your action'}
          </DialogDescription>
        </DialogHeader>

        {/* Booking Details */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Service</p>
                <Badge variant="secondary" className="capitalize">
                  {booking?.service_category?.replace(/_/g, ' ') || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Request Type</p>
                <Badge variant="outline">
                  {booking?.request_type === 'booking' ? '📅 Direct Booking' :
                    booking?.request_type === 'consultation' ? '💬 Consultation' :
                      '💰 Quote Request'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Urgency</p>
                <Badge variant={getBadgeVariant(booking?.urgency || 'normal')}>
                  {booking?.urgency === 'urgent' ? '🔥 Urgent' :
                    booking?.urgency === 'normal' ? '⏰ Normal' :
                      '📅 Flexible'}
                </Badge>
              </div>
              {booking?.preferred_time_slot && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock size={14} />
                    Preferred Time
                  </p>
                  <p className="font-medium capitalize">
                    {booking.preferred_time_slot.replace(/_/g, ' ')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground mb-1">Payment Terms</p>
                <Badge variant={booking?.requires_deposit ? 'default' : 'secondary'}>
                  {booking?.requires_deposit ? '🔒 With Deposit' : '💵 Direct Payment'}
                </Badge>
              </div>
            </div>

            {booking?.requires_deposit && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  ℹ️ This booking requires a deposit. MaintMENA will hold the deposit
                  securely until service completion.
                </p>
              </div>
            )}

            <Separator />

            <div>
              <Label className="text-muted-foreground">
                {currentLanguage === 'ar' ? 'وصف الوظيفة' : 'Job Description'}
              </Label>
              <p className="mt-1">{booking?.job_description || 'No description provided'}</p>
            </div>

            {(booking?.proposed_start_date || booking?.proposed_end_date) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  {booking?.proposed_start_date && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Calendar size={16} />
                        {currentLanguage === 'ar' ? 'تاريخ البدء المقترح' : 'Proposed Start Date'}
                      </Label>
                      <p className="font-medium mt-1">
                        {format(new Date(booking.proposed_start_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {booking?.proposed_end_date && (
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Calendar size={16} />
                        {currentLanguage === 'ar' ? 'تاريخ الانتهاء المقترح' : 'Proposed End Date'}
                      </Label>
                      <p className="font-medium mt-1">
                        {format(new Date(booking.proposed_end_date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {booking?.location_address && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">
                    {currentLanguage === 'ar' ? 'الموقع' : 'Location'}
                  </Label>
                  <p className="mt-1">
                    {booking.location_address}
                    {booking.location_city && `, ${booking.location_city}`}
                    {booking.location_country && `, ${booking.location_country}`}
                  </p>
                </div>
              </>
            )}

            {booking?.budget_range && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">
                    {currentLanguage === 'ar' ? 'نطاق الميزانية' : 'Budget Range'}
                  </Label>
                  <p className="font-medium mt-1">{booking.budget_range}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Response Tabs */}
        <Tabs value={responseType} onValueChange={(v) => setResponseType(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accept" className="gap-2">
              <CheckCircle size={16} />
              {currentLanguage === 'ar' ? 'إرسال عرض' : 'Send Offer'}
            </TabsTrigger>
            <TabsTrigger value="counter" className="gap-2">
              <ArrowLeftRight size={16} />
              {currentLanguage === 'ar' ? 'عرض مضاد' : 'Counter'}
            </TabsTrigger>
            <TabsTrigger value="decline" className="gap-2">
              <XCircle size={16} />
              {currentLanguage === 'ar' ? 'رفض' : 'Decline'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accept" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {currentLanguage === 'ar'
                    ? 'بإرسال هذا العرض، فإنك توافق على شروط الحجز كما هي مقترحة.'
                    : 'By sending this offer, you agree to the booking terms as proposed.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="counter" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {currentLanguage === 'ar' ? 'تاريخ البدء المقترح' : 'Proposed Start Date'}
                  </Label>
                  <Input
                    type="date"
                    value={counterProposal.proposed_start_date}
                    onChange={(e) => setCounterProposal({ ...counterProposal, proposed_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    {currentLanguage === 'ar' ? 'تاريخ الانتهاء المقترح' : 'Proposed End Date'}
                  </Label>
                  <Input
                    type="date"
                    value={counterProposal.proposed_end_date}
                    onChange={(e) => setCounterProposal({ ...counterProposal, proposed_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {currentLanguage === 'ar' ? 'تقدير السعر' : 'Price Estimate (SAR)'} *
                  </Label>
                  <Input
                    type="number"
                    placeholder={currentLanguage === 'ar' ? 'مثال: 5000' : 'e.g., 2000'}
                    value={counterProposal.price_estimate}
                    onChange={(e) => setCounterProposal({ ...counterProposal, price_estimate: e.target.value })}
                  />
                </div>
                {booking?.requires_deposit && (
                  <div className="space-y-2">
                    <Label>
                      {currentLanguage === 'ar' ? 'مبلغ العربون' : 'Deposit Amount (SAR)'}
                    </Label>
                    <Input
                      type="number"
                      placeholder={currentLanguage === 'ar' ? 'مثال: 500' : 'e.g., 500'}
                      value={counterProposal.deposit_amount}
                      onChange={(e) => setCounterProposal({ ...counterProposal, deposit_amount: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  {currentLanguage === 'ar' ? 'تفاصيل العرض المضاد' : 'Counter-Proposal Details'} *
                </Label>
                <Textarea
                  rows={4}
                  placeholder={currentLanguage === 'ar'
                    ? 'اشرح العرض المضاد الخاص بك...'
                    : 'Explain your counter-proposal...'}
                  value={counterProposal.notes}
                  onChange={(e) => setCounterProposal({ ...counterProposal, notes: e.target.value })}
                  required
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="decline" className="space-y-4">
            <div className="space-y-2">
              <Label>
                {currentLanguage === 'ar' ? 'سبب الرفض' : 'Reason for Declining'} *
              </Label>
              <Textarea
                rows={4}
                placeholder={currentLanguage === 'ar'
                  ? 'يرجى تقديم سبب الرفض...'
                  : 'Please provide a reason for declining...'}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                required
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (currentLanguage === 'ar' ? 'جاري الإرسال...' : 'Sending...') :
              responseType === 'accept' ? (currentLanguage === 'ar' ? 'إرسال العرض' : 'Send Offer') :
                responseType === 'decline' ? (currentLanguage === 'ar' ? 'رفض الطلب' : 'Decline Request') :
                  (currentLanguage === 'ar' ? 'إرسال عرض مضاد' : 'Send Counter-Proposal')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingResponseModal;
