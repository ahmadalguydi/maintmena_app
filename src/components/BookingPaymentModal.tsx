import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DollarSign, CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


interface BookingPaymentModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BookingPaymentModal = ({
  booking,
  isOpen,
  onClose,
  onSuccess
}: BookingPaymentModalProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    payment_method: 'bank_transfer',
    deposit_amount: '',
    final_amount: '',
  });

  const handlePayDeposit = async () => {
    if (!paymentData.deposit_amount) {
      toast.error('Please enter deposit amount');
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({
          deposit_amount: parseFloat(paymentData.deposit_amount),
          payment_method: paymentData.payment_method,
          payment_status: 'deposit_paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Deposit payment recorded successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to record payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFull = async () => {
    if (!paymentData.final_amount) {
      toast.error('Please enter final amount');
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({
          final_amount: parseFloat(paymentData.final_amount),
          payment_method: paymentData.payment_method,
          payment_status: 'fully_paid',
          paid_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Payment completed! Booking marked as completed.');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Failed to record payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      unpaid: { variant: 'destructive', label: 'Unpaid' },
      deposit_paid: { variant: 'secondary', label: 'Deposit Paid' },
      fully_paid: { variant: 'default', label: 'Fully Paid' },
      refunded: { variant: 'outline', label: 'Refunded' }
    };
    const s = config[status] || config.unpaid;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Payment Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Service</span>
              <span className="text-sm font-medium capitalize">
                {booking.service_category?.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Status</span>
              {getPaymentStatusBadge(booking.payment_status || 'unpaid')}
            </div>
            {booking.deposit_amount && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Deposit Paid</span>
                <span className="text-sm font-medium">${booking.deposit_amount}</span>
              </div>
            )}
            {booking.final_amount && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-medium">${booking.final_amount}</span>
              </div>
            )}
          </div>

          {/* Payment Method Selection - Cash Only */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select 
              value="cash" 
              disabled
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">✓ Cash</SelectItem>
              </SelectContent>
            </Select>
            <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                💵 Cash only during beta. 🔒 Bank Transfer & Online Payment coming Q1 2025
              </p>
            </div>
          </div>

          {/* Deposit Payment */}
          {booking.payment_status === 'unpaid' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Deposit Amount (SAR)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  value={paymentData.deposit_amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, deposit_amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Typically 20-30% of total project cost
                </p>
              </div>
              <Button 
                onClick={handlePayDeposit} 
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Record Deposit Payment
              </Button>
            </div>
          )}

          {/* Full Payment */}
          {booking.payment_status === 'deposit_paid' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Final Amount (SAR)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 2000"
                  value={paymentData.final_amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, final_amount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Total project cost including deposit
                </p>
              </div>
              <Button 
                onClick={handlePayFull} 
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Record Full Payment & Complete
              </Button>
            </div>
          )}

          {/* Already Paid */}
          {booking.payment_status === 'fully_paid' && (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Payment Complete</h3>
              <p className="text-sm text-muted-foreground">
                This booking has been fully paid
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
