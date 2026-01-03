import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Clock, 
  DollarSign, 
  FileCheck,
  CreditCard,
  Banknote,
  AlertCircle
} from 'lucide-react';

interface CompletionWorkflowCardProps {
  requestId?: string;
  bookingId?: string;
  buyerId: string;
  sellerId: string;
  buyerMarkedComplete: boolean;
  sellerMarkedComplete: boolean;
  buyerCompletionDate?: string | null;
  sellerCompletionDate?: string | null;
  status: string;
  paymentMethod: 'online_maintmena' | 'cash';
  contractFullyExecuted?: boolean;
  onRefresh?: () => void;
  userRole: 'buyer' | 'seller';
  currentLanguage?: 'en' | 'ar';
}

export function CompletionWorkflowCard({
  requestId,
  bookingId,
  buyerId,
  sellerId,
  buyerMarkedComplete,
  sellerMarkedComplete,
  buyerCompletionDate,
  sellerCompletionDate,
  status,
  paymentMethod,
  contractFullyExecuted = true,
  onRefresh,
  userRole,
  currentLanguage = 'en'
}: CompletionWorkflowCardProps) {
  const [loading, setLoading] = useState(false);

  const isBuyer = userRole === 'buyer';
  const canBuyerMarkComplete = isBuyer && status === 'assigned' && !buyerMarkedComplete && contractFullyExecuted;
  const canSellerConfirmPayment = !isBuyer && buyerMarkedComplete && !sellerMarkedComplete;

  const getProgress = () => {
    if (status === 'completed') return 100;
    if (sellerMarkedComplete) return 100;
    if (buyerMarkedComplete) return 66;
    if (contractFullyExecuted) return 33;
    return 0;
  };

  const handleMarkComplete = async () => {
    if (!requestId && !bookingId) return;
    
    setLoading(true);
    try {
      const table = requestId ? 'maintenance_requests' : 'booking_requests';
      const idField = requestId ? 'id' : 'id';
      const id = requestId || bookingId;

      const { error } = await supabase
        .from(table)
        .update({
          buyer_marked_complete: true,
          buyer_completion_date: new Date().toISOString()
        } as any)
        .eq(idField, id);

      if (error) throw error;

      toast.success('Work marked as complete! Waiting for seller to confirm payment receipt.');
      onRefresh?.();
    } catch (error: any) {
      console.error('Error marking complete:', error);
      toast.error('Failed to mark as complete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!requestId && !bookingId) return;
    
    setLoading(true);
    try {
      const table = requestId ? 'maintenance_requests' : 'booking_requests';
      const idField = requestId ? 'id' : 'id';
      const id = requestId || bookingId;

      const { error } = await supabase
        .from(table)
        .update({
          seller_marked_complete: true,
          seller_completion_date: new Date().toISOString()
        } as any)
        .eq(idField, id);

      if (error) throw error;

      toast.success('Payment confirmed! Request completed successfully.', {
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      });
      onRefresh?.();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'open') {
    return null; // Don't show for open requests
  }

  return (
    <Card className="border-rule">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-accent" />
          Completion Workflow
          {status === 'completed' && (
            <Badge variant="default" className="ml-auto">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Display */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            {paymentMethod === 'online_maintmena' ? (
              <>
                <CreditCard className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">{currentLanguage === 'ar' ? 'اونلاين' : 'Online'}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentLanguage === 'ar' ? 'دفع آمن عبر MaintMENA' : 'Secure payment via MaintMENA'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Banknote className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-sm">{currentLanguage === 'ar' ? 'كاش' : 'Cash'}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentLanguage === 'ar' ? 'دفع مباشر للبائع' : 'Direct payment to seller'}
                  </p>
                </div>
              </>
            )}
          </div>
          <Badge variant={paymentMethod === 'online_maintmena' ? 'default' : 'secondary'}>
            {currentLanguage === 'ar' 
              ? (paymentMethod === 'online_maintmena' ? 'اونلاين' : 'كاش')
              : (paymentMethod === 'online_maintmena' ? 'Online' : 'Cash')}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {/* Step 1: Contract Signed */}
          <div className="flex items-start gap-3">
            {contractFullyExecuted ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Contract Signed</p>
              <p className="text-xs text-muted-foreground">
                {contractFullyExecuted ? 'Both parties signed the contract' : 'Waiting for signatures'}
              </p>
            </div>
          </div>

          {/* Step 2: Buyer Confirms Work Complete */}
          <div className="flex items-start gap-3">
            {buyerMarkedComplete ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Buyer Confirms Work Complete</p>
              {buyerCompletionDate ? (
                <p className="text-xs text-muted-foreground">
                  Completed on {new Date(buyerCompletionDate).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Buyer needs to verify work completion</p>
              )}
            </div>
          </div>

          {/* Step 3: Seller Confirms Payment Received */}
          <div className="flex items-start gap-3">
            {sellerMarkedComplete ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Seller Confirms Payment Received</p>
              {sellerCompletionDate ? (
                <p className="text-xs text-muted-foreground">
                  Confirmed on {new Date(sellerCompletionDate).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {buyerMarkedComplete 
                    ? 'Waiting for seller to confirm payment' 
                    : 'Pending buyer confirmation first'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {status !== 'completed' && (
          <div className="pt-4 border-t border-rule space-y-3">
            {!contractFullyExecuted && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  The contract must be fully signed before marking work as complete.
                </p>
              </div>
            )}

            {canBuyerMarkComplete && (
              <Button 
                onClick={handleMarkComplete} 
                disabled={loading}
                className="w-full gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? 'Marking...' : 'Mark Work as Complete'}
              </Button>
            )}

            {canSellerConfirmPayment && (
              <Button 
                onClick={handleConfirmPayment} 
                disabled={loading}
                className="w-full gap-2"
                variant="default"
              >
                <DollarSign className="w-4 h-4" />
                {loading ? 'Confirming...' : 'Confirm Payment Received'}
              </Button>
            )}

            {isBuyer && buyerMarkedComplete && !sellerMarkedComplete && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Waiting for seller to confirm they received the {paymentMethod === 'cash' ? 'cash' : 'online'} payment.
                </p>
              </div>
            )}

            {!isBuyer && !buyerMarkedComplete && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
                <Clock className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Waiting for buyer to mark the work as complete before you can confirm payment.
                </p>
              </div>
            )}
          </div>
        )}

        {status === 'completed' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Request Completed Successfully
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Both parties have confirmed completion and payment
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
