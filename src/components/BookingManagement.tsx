import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  User,
  ExternalLink,
  Loader2,
  XCircle,
  Eye,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { CounterProposalResponseModal } from './CounterProposalResponseModal';
import { BookingMessagingPanel, useBookingUnreadCount } from './BookingMessagingPanel';
import { BookingPaymentModal } from './BookingPaymentModal';


interface BookingRequest {
  id: string;
  buyer_id: string;
  seller_id: string;
  request_type: string;
  service_category: string;
  proposed_start_date?: string;
  proposed_end_date?: string;
  preferred_time_slot?: string;
  location_address?: string;
  location_city?: string;
  location_country?: string;
  job_description: string;
  budget_range?: string;
  urgency: string;
  status: string;
  seller_response?: string;
  seller_counter_proposal?: any;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  seller_name?: string;
  seller_company?: string;
  payment_status?: string;
  deposit_amount?: number;
  final_amount?: number;
  payment_method?: string;
  paid_at?: string;
  invoice_id?: string;
  completed_at?: string;
}

interface BookingManagementProps {
  booking: BookingRequest;
  onUpdate: () => void;
  currentLanguage?: 'en' | 'ar';
}

export const BookingManagement = ({ booking, onUpdate, currentLanguage = 'en' }: BookingManagementProps) => {
  const [showCounterProposal, setShowCounterProposal] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const unreadCount = useBookingUnreadCount(booking.id);

  const handleCancel = async () => {
    if (!confirm('Cancel this booking request? This cannot be undone.')) return;
    
    setLoading(true);
    try {
      const { error } = await sb
        .from('booking_requests')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      toast.success('Booking request cancelled');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to cancel booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      accepted: { variant: 'default', label: 'Accepted', icon: CheckCircle },
      declined: { variant: 'destructive', label: 'Declined', icon: XCircle },
      counter_proposed: { variant: 'outline', label: 'Counter Proposal', icon: AlertCircle },
      cancelled: { variant: 'destructive', label: 'Cancelled', icon: XCircle },
      contract_pending: { variant: 'outline', label: 'Contract Review', icon: FileText },
      contract_accepted: { variant: 'default', label: 'Contract Accepted', icon: CheckCircle }
    };
    const s = config[status] || config.pending;
    const Icon = s.icon;
    return (
      <Badge variant={s.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {s.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      urgent: { variant: 'destructive', label: 'Urgent' },
      normal: { variant: 'secondary', label: 'Normal' },
      flexible: { variant: 'outline', label: 'Flexible' }
    };
    const u = config[urgency] || config.normal;
    return <Badge variant={u.variant}>{u.label}</Badge>;
  };

  return (
    <>
      <Card className="border-rule hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2 text-ink capitalize">
                {booking.service_category?.replace(/_/g, ' ')}
              </CardTitle>
              <Link 
                to={`/seller/${booking.seller_id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <User className="w-4 h-4" />
                <span className="group-hover:underline">
                  {booking.seller_company || booking.seller_name || 'Vendor'}
                </span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {getStatusBadge(booking.status)}
              {getUrgencyBadge(booking.urgency)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Description */}
          <div>
            <p className="text-sm font-medium text-ink mb-1">Description</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{booking.job_description}</p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {booking.proposed_start_date && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Start Date</span>
                </div>
                <p className="text-sm font-semibold text-ink">
                  {format(new Date(booking.proposed_start_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            {booking.budget_range && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span>Budget</span>
                </div>
                <p className="text-sm font-semibold text-ink capitalize">
                  {booking.budget_range.replace(/_/g, ' ')}
                </p>
              </div>
            )}
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

          {/* Seller Response */}
          {booking.seller_response && (
            <div className="bg-muted/50 p-3 rounded-lg border border-rule">
              <p className="text-xs font-medium text-muted-foreground mb-1">Seller Response</p>
              <p className="text-sm text-ink">{booking.seller_response}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>Sent {format(new Date(booking.created_at), 'MMM dd, yyyy')}</span>
            {booking.responded_at && (
              <span>Responded {format(new Date(booking.responded_at), 'MMM dd, yyyy')}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {booking.status === 'contract_pending' && (
              <Button
                asChild
                variant="default"
                className="gap-2 col-span-2"
              >
                <a href={`/contracts?booking_id=${booking.id}`}>
                  <FileText className="w-4 h-4" />
                  Review Contract
                </a>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="gap-2"
            >
              <a href={`/seller/${booking.seller_id}`}>
                <User className="w-4 h-4" />
                View Profile
              </a>
            </Button>

            <Button
              onClick={() => setShowMessaging(true)}
              variant="outline"
              className="gap-2 relative"
            >
              <MessageSquare className="w-4 h-4" />
              Messages
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {booking.status === 'counter_proposed' && (
              <Button
                onClick={() => setShowCounterProposal(true)}
                className="gap-2 col-span-2"
              >
                <Eye className="w-4 h-4" />
                View Counter Proposal
              </Button>
            )}

            {booking.status === 'contract_accepted' && booking.payment_status !== 'fully_paid' && (
              <Button
                onClick={() => setShowPayment(true)}
                className="gap-2 col-span-2"
              >
                <DollarSign className="w-4 h-4" />
                {booking.payment_status === 'unpaid' ? 'Pay Deposit' : 'Complete Payment'}
              </Button>
            )}

            {booking.status === 'pending' && (
              <Button
                onClick={handleCancel}
                disabled={loading}
                variant="destructive"
                className="gap-2 col-span-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Counter Proposal Modal */}
      <CounterProposalResponseModal
        booking={booking}
        isOpen={showCounterProposal}
        onClose={() => setShowCounterProposal(false)}
        onUpdate={onUpdate}
      />

      {/* Messaging Panel */}
      <BookingMessagingPanel
        bookingId={booking.id}
        bookingTitle={booking.service_category?.replace(/_/g, ' ')}
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />

      {/* Payment Modal */}
      <BookingPaymentModal
        booking={booking}
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={onUpdate}
      />
    </>
  );
};
