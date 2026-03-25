import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  DollarSign, 
  Clock,
  Send,
  Loader2,
  TrendingUp,
  User,
  Eye,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { QuoteDetailModal } from './QuoteDetailModal';
import { trackQuoteAccepted } from '@/lib/brevoAnalytics';


interface Quote {
  id: string;
  request_id: string;
  seller_id: string;
  price: number;
  estimated_duration: string;
  proposal: string;
  status: string;
  created_at: string;
  request_title?: string;
  seller_name?: string;
  seller_company?: string;
  cover_letter?: string;
  technical_approach?: string;
  team_experience?: string;
  certifications?: string;
  timeline_details?: string;
  pricing_breakdown?: any;
  client_references?: string;
  custom_sections?: any;
}

interface QuoteManagementProps {
  quote: Quote;
  onUpdate: () => void;
  currentLanguage?: 'en' | 'ar';
}

export const QuoteManagement = ({ quote, onUpdate, currentLanguage = 'en' }: QuoteManagementProps) => {
  const [showMessaging, setShowMessaging] = useState(false);
  const [showNegotiate, setShowNegotiate] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [message, setMessage] = useState('');
  const [counterOffer, setCounterOffer] = useState({
    price: quote.price.toString(),
    duration: quote.estimated_duration,
    message: ''
  });
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!confirm('Accept this quote? This will generate a service contract.')) return;
    
    setLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      // Accept quote
      const { error: quoteError } = await sb
        .from('quote_submissions')
        .update({ status: 'accepted' })
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // Create contract draft
      const { data: contract, error: contractError } = await sb
        .from('contracts')
        .insert({
          request_id: quote.request_id,
          quote_id: quote.id,
          buyer_id: user?.id,
          seller_id: quote.seller_id,
          status: 'draft',
          version: 1,
          language_mode: 'dual'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create default binding terms
      await supabase.from('binding_terms').insert({
        contract_id: contract.id,
        warranty_days: 90,
        use_deposit_escrow: false
      });

      // Send notification message
      await supabase.from('messages').insert({
        quote_id: quote.id,
        sender_id: user?.id,
        content: `Quote accepted! Contract draft created. Please review and sign.`
      });

      // Track quote acceptance in Brevo
      if (user?.email) {
        trackQuoteAccepted(user.email, {
          quoteId: quote.id,
          sellerId: quote.seller_id,
          amount: quote.price
        });
      }

      toast.success('Quote accepted! Redirecting to contract...');
      
      // Navigate to contract page
      window.location.href = `/contracts/${contract.id}`;
      
    } catch (error: any) {
      toast.error('Failed to accept quote: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!confirm('Decline this quote? The seller will be notified.')) return;
    
    setLoading(true);
    try {
      const { error } = await sb
        .from('quote_submissions')
        .update({ status: 'rejected' })
        .eq('id', quote.id);

      if (error) throw error;

      toast.success('Quote declined');
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to decline quote: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('messages').insert({
        quote_id: quote.id,
        sender_id: (await supabase.auth.getUser()).data.user.id,
        content: message
      });

      if (error) throw error;

      toast.success('Message sent!');
      setMessage('');
      setShowMessaging(false);
    } catch (error: any) {
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiate = async () => {
    if (!counterOffer.message.trim()) {
      toast.error('Please provide a message with your counter offer');
      return;
    }

    setLoading(true);
    try {
      // Update quote status to negotiating
      await sb
        .from('quote_submissions')
        .update({ status: 'negotiating' })
        .eq('id', quote.id);

      // Send negotiation message
      const negotiationMessage = `Counter Offer:\n- Price: $${counterOffer.price}\n- Duration: ${counterOffer.duration}\n\nMessage: ${counterOffer.message}`;
      
      const { error } = await supabase.from('messages').insert({
        quote_id: quote.id,
        sender_id: (await supabase.auth.getUser()).data.user.id,
        content: negotiationMessage
      });

      if (error) throw error;

      toast.success('Counter offer sent!');
      setShowNegotiate(false);
      onUpdate();
    } catch (error: any) {
      toast.error('Failed to send counter offer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      accepted: { variant: 'default', label: 'Accepted' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      negotiating: { variant: 'outline', label: 'Negotiating' }
    };
    const s = config[status] || config.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <>
      <Card className="border-rule hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2 text-ink">{quote.request_title}</CardTitle>
              <Link 
                to={`/seller/${quote.seller_id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                <User className="w-4 h-4" />
                <span className="group-hover:underline">{quote.seller_company || quote.seller_name || 'Vendor'}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
            {getStatusBadge(quote.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span>Price</span>
              </div>
              <p className="text-xl font-bold text-primary">${quote.price.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Duration</span>
              </div>
              <p className="text-lg font-semibold text-ink">{quote.estimated_duration}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink mb-1">Proposal</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{quote.proposal}</p>
          </div>

          <div className="text-xs text-muted-foreground">
            Submitted {format(new Date(quote.created_at), 'MMM dd, yyyy')}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* View Details Button */}
            <Button
              onClick={() => setShowDetails(true)}
              variant="outline"
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              View Quote
            </Button>
            
            {/* View Profile Button */}
            <Button
              asChild
              variant="outline"
              className="gap-2"
            >
              <Link to={`/seller/${quote.seller_id}`}>
                <User className="w-4 h-4" />
                View Profile
              </Link>
            </Button>
          </div>

          {quote.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleAccept} 
                disabled={loading}
                className="flex-1 gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Accept
              </Button>
              <Button 
                onClick={() => setShowNegotiate(true)} 
                variant="outline"
                className="flex-1 gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Negotiate
              </Button>
              <Button 
                onClick={() => setShowMessaging(true)} 
                variant="outline"
                className="gap-2"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button 
                onClick={handleDecline} 
                variant="destructive"
                disabled={loading}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}

          {quote.status === 'negotiating' && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => setShowMessaging(true)} 
                variant="outline"
                className="flex-1 gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Continue Negotiation
              </Button>
              <Button onClick={handleAccept} disabled={loading} className="flex-1">
                Accept Current Terms
              </Button>
            </div>
          )}

          {(quote.status === 'accepted' || quote.status === 'rejected') && (
            <Button 
              onClick={() => setShowMessaging(true)} 
              variant="outline"
              className="w-full gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Send Message
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quote Detail Modal */}
      <QuoteDetailModal
        quote={quote}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />

      {/* Messaging Dialog */}
      <Dialog open={showMessaging} onOpenChange={setShowMessaging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Seller</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={loading || !message.trim()}
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Negotiation Dialog */}
      <Dialog open={showNegotiate} onOpenChange={setShowNegotiate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Counter Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proposed Price ($)</Label>
              <Input
                type="number"
                value={counterOffer.price}
                onChange={(e) => setCounterOffer(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Proposed Duration</Label>
              <Input
                placeholder="e.g., 30 days"
                value={counterOffer.duration}
                onChange={(e) => setCounterOffer(prev => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Explain your counter offer..."
                value={counterOffer.message}
                onChange={(e) => setCounterOffer(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>
            <Button 
              onClick={handleNegotiate} 
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Send Counter Offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};