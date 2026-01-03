import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeftRight,
  Send
} from 'lucide-react';
import { format } from 'date-fns';


interface BookingRequest {
  id: string;
  service_category: string;
  proposed_start_date?: string;
  proposed_end_date?: string;
  preferred_time_slot?: string;
  location_city?: string;
  job_description: string;
  budget_range?: string;
  seller_response?: string;
  seller_counter_proposal?: {
    proposed_start_date?: string;
    proposed_end_date?: string;
    price_estimate?: string;
    notes?: string;
  };
}

interface CounterProposalResponseModalProps {
  booking: BookingRequest;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CounterProposalResponseModal = ({
  booking,
  isOpen,
  onClose,
  onUpdate
}: CounterProposalResponseModalProps) => {
  const [loading, setLoading] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [buyerCounter, setBuyerCounter] = useState({
    proposed_start_date: '',
    proposed_end_date: '',
    price_offer: '',
    notes: ''
  });

  const counterProposal = booking.seller_counter_proposal || {};

  const handleAccept = async () => {
    if (!confirm('Accept this counter proposal? This will update your booking request.')) return;

    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({ 
          status: 'accepted',
          proposed_start_date: counterProposal.proposed_start_date || booking.proposed_start_date,
          proposed_end_date: counterProposal.proposed_end_date || booking.proposed_end_date,
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Counter proposal accepted! The seller has been notified.');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Failed to accept counter proposal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Decline this counter proposal? This will cancel the booking request.')) return;

    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Counter proposal declined. Booking request cancelled.');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Failed to decline counter proposal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyerCounter = async () => {
    if (!buyerCounter.notes.trim()) {
      toast.error('Please provide details for your counter-proposal');
      return;
    }

    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({ 
          status: 'buyer_countered',
          buyer_counter_proposal: buyerCounter,
        })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Your counter-proposal has been sent!');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error('Failed to send counter-proposal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-accent" />
            Counter Proposal Received
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Info */}
          <div className="bg-muted/50 p-4 rounded-lg border border-rule">
            <h3 className="text-lg font-semibold text-ink mb-2 capitalize">
              {booking.service_category?.replace(/_/g, ' ')}
            </h3>
            <p className="text-sm text-muted-foreground">{booking.job_description}</p>
          </div>

          {/* Original Request vs Counter Proposal */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
              Comparison
            </h4>

            {/* Dates Comparison */}
            {(booking.proposed_start_date || counterProposal.proposed_start_date) && (
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Your Request</span>
                  </div>
                  {booking.proposed_start_date ? (
                    <p className="text-sm font-semibold text-ink">
                      {format(new Date(booking.proposed_start_date), 'MMM dd, yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-accent" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Seller's Proposal</span>
                  </div>
                  {counterProposal.proposed_start_date ? (
                    <p className="text-sm font-semibold text-primary">
                      {format(new Date(counterProposal.proposed_start_date), 'MMM dd, yyyy')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Same as request</p>
                  )}
                </div>
              </div>
            )}

            {/* Price Estimate */}
            {counterProposal.price_estimate && (
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Price Estimate</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {counterProposal.price_estimate}
                </p>
              </div>
            )}

            {/* Location & Time */}
            <div className="grid grid-cols-2 gap-4">
              {booking.location_city && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>Location</span>
                  </div>
                  <p className="text-sm font-semibold text-ink">{booking.location_city}</p>
                </div>
              )}
              {booking.preferred_time_slot && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Time Slot</span>
                  </div>
                  <p className="text-sm font-semibold text-ink capitalize">
                    {booking.preferred_time_slot}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seller's Message */}
          {(booking.seller_response || counterProposal.notes) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-ink uppercase tracking-wide">
                Seller's Message
              </h4>
              <div className="bg-muted/50 p-4 rounded-lg border border-rule">
                <p className="text-sm text-ink whitespace-pre-wrap">
                  {counterProposal.notes || booking.seller_response}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-rule">
            <Button
              onClick={handleDecline}
              disabled={loading}
              variant="outline"
              className="flex-1 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Decline & Cancel
            </Button>
            <Button
              onClick={() => setShowCounterForm(!showCounterForm)}
              disabled={loading}
              variant="secondary"
              className="flex-1 gap-2"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Counter Back
            </Button>
            <Button
              onClick={handleAccept}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Accept
            </Button>
          </div>

          {showCounterForm && (
            <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/30">
              <h4 className="font-semibold flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Send Your Counter-Proposal
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={buyerCounter.proposed_start_date}
                    onChange={(e) => setBuyerCounter({
                      ...buyerCounter, 
                      proposed_start_date: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={buyerCounter.proposed_end_date}
                    onChange={(e) => setBuyerCounter({
                      ...buyerCounter, 
                      proposed_end_date: e.target.value
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Your Price Offer (SAR)</Label>
                <Input
                  type="number"
                  placeholder="e.g., 1500"
                  value={buyerCounter.price_offer}
                  onChange={(e) => setBuyerCounter({
                    ...buyerCounter, 
                    price_offer: e.target.value
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Your Message *</Label>
                <Textarea
                  placeholder="Explain your counter-proposal..."
                  value={buyerCounter.notes}
                  onChange={(e) => setBuyerCounter({
                    ...buyerCounter, 
                    notes: e.target.value
                  })}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleBuyerCounter}
                disabled={loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Counter-Proposal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
