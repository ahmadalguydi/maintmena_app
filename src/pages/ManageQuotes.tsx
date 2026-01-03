import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BuyerNegotiationModal from '@/components/BuyerNegotiationModal';
import { MessagingPanel } from '@/components/MessagingPanel';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  XCircle,
  ArrowLeft,
  User,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';

interface Quote {
  id: string;
  seller_id: string;
  request_id: string;
  price: number;
  estimated_duration: string;
  proposal: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ManageQuotesProps {
  currentLanguage: 'en' | 'ar';
}

export default function ManageQuotes({ currentLanguage }: ManageQuotesProps) {
  const { requestId } = useParams<{ requestId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiationQuoteId, setNegotiationQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (user && requestId) {
      fetchData();
    }
  }, [user, requestId]);

  const fetchData = async () => {
    if (!user || !requestId) return;

    setLoading(true);
    try {
      // Fetch request details
      const { data: requestData, error: requestError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('id', requestId)
        .eq('buyer_id', user.id)
        .single();

      if (requestError) throw requestError;
      setRequest(requestData);

      // Fetch quotes for this request
      const { data: quotesData, error: quotesError } = await supabase
        .from('quote_submissions')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? `فشل تحميل البيانات: ${error.message}` : 'Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) return;

      // Check for ANY existing contract for this request
      const { data: existingContract, error: fetchError } = await supabase
        .from("contracts")
        .select("id, status, quote_id")
        .eq("request_id", quote.request_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingContract) {
        // Case 1: Contract already started/executed -> Redirect to it
        if (existingContract.status !== 'pending_buyer') {
          toast.info(currentLanguage === 'ar' ? "يوجد عقد قائم بالفعل لهذا الطلب" : "An active contract already exists for this request");
          navigate(`/contracts/${existingContract.id}`);
          return;
        }

        // Case 2: Draft exists for THIS quote -> Reuse it
        if (existingContract.quote_id === quoteId) {
          navigate(`/contracts/${existingContract.id}`);
          return;
        }

        // Case 3: Draft exists for ANOTHER quote -> Delete it (switch quotes)
        const { error: deleteError } = await supabase
          .from("contracts")
          .delete()
          .eq("id", existingContract.id);

        if (deleteError) throw deleteError;
      }

      // Create contract for this quote
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          quote_id: quoteId,
          request_id: quote.request_id,
          buyer_id: user!.id,
          seller_id: quote.seller_id,
          status: 'pending_buyer',
          language_mode: 'dual'
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // Create default binding terms for the contract
      await supabase
        .from('binding_terms')
        .insert({
          contract_id: contract.id,
          warranty_days: 90
        });

      // Navigate to contract signing
      navigate(`/contracts/${contract.id}`);

    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? `فشل بدء العقد: ${error.message}` : 'Failed to start contract: ' + error.message);
    }
  };

  const handleDeclineQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quote_submissions')
        .update({ status: 'rejected' })
        .eq('id', quoteId);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم رفض العرض' : 'Quote declined');
      fetchData();
    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? `فشل رفض العرض: ${error.message}` : 'Failed to decline quote: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      accepted: { variant: 'default', label: 'Accepted', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rejected', icon: XCircle },
      negotiating: { variant: 'outline', label: 'Negotiating', icon: TrendingUp }
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

  const filterQuotes = (status?: string) => {
    if (!status || status === 'all') return quotes;
    return quotes.filter(q => q.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-paper py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-muted-foreground">Request not found</p>
          <Button onClick={() => navigate('/my-requests')} className="mt-4">
            Back to My Requests
          </Button>
        </div>
      </div>
    );
  }

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    negotiating: quotes.filter(q => q.status === 'negotiating').length
  };

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/my-requests')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Requests
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-ink mb-2">Manage Quotes</h1>
          <p className="text-lg text-muted-foreground mb-4">{request.title}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{request.category}</Badge>
            <Badge variant="outline">{request.urgency}</Badge>
            <Badge variant="outline">{request.location}</Badge>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-rule">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-ink">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Quotes</p>
            </CardContent>
          </Card>
          <Card className="border-rule">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-rule">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.negotiating}</div>
              <p className="text-sm text-muted-foreground">Negotiating</p>
            </CardContent>
          </Card>
          <Card className="border-rule">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="negotiating">Negotiating ({stats.negotiating})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({stats.accepted})</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          {['all', 'pending', 'negotiating', 'accepted'].map(status => (
            <TabsContent key={status} value={status} className="space-y-4">
              {filterQuotes(status === 'all' ? undefined : status).length === 0 ? (
                <Card className="border-rule p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No {status} quotes yet</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filterQuotes(status === 'all' ? undefined : status).map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onAccept={handleAcceptQuote}
                      onDecline={handleDeclineQuote}
                      onMessageClick={() => {
                        setSelectedQuoteId(quote.id);
                        setActiveTab('messages');
                      }}
                      onNegotiateClick={() => {
                        setNegotiationQuoteId(quote.id);
                        setShowNegotiationModal(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="messages">
            {selectedQuoteId ? (
              <MessagingPanel
                quoteId={selectedQuoteId}
                quoteTitle={request.title}
              />
            ) : (
              <Card className="border-rule p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">
                  Select a quote to view messages
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <BuyerNegotiationModal
          open={showNegotiationModal}
          onOpenChange={setShowNegotiationModal}
          quoteId={negotiationQuoteId}
          onRefresh={fetchData}
        />
      </div>
    </div>
  );
}

interface QuoteCardProps {
  quote: Quote;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onMessageClick: () => void;
  onNegotiateClick: () => void;
}

function QuoteCard({ quote, onAccept, onDecline, onMessageClick, onNegotiateClick }: QuoteCardProps) {
  const { formatAmount } = useCurrency();

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      accepted: { variant: 'default', label: 'Accepted', icon: CheckCircle },
      declined: { variant: 'destructive', label: 'Declined', icon: XCircle },
      negotiating: { variant: 'outline', label: 'Negotiating', icon: TrendingUp },
      contract_pending: { variant: 'outline', label: 'Contract Pending', icon: FileText },
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

  return (
    <Card className="border-rule hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-lg mb-2">
              <User className="w-4 h-4" />
              <span className="font-semibold">Vendor Quote</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(quote.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          {getStatusBadge(quote.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Quote Price</span>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatAmount(quote.price)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Duration</span>
            </div>
            <p className="text-lg font-semibold text-ink">
              {quote.estimated_duration}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-1">Proposal</p>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {quote.proposal}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quote.status === 'pending' && (
            <>
              <Button
                onClick={() => onAccept(quote.id)}
                variant="default"
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept & Create Contract
              </Button>
              <Button
                onClick={() => onDecline(quote.id)}
                variant="outline"
                className="w-full"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Decline
              </Button>
            </>
          )}
          {quote.status === 'contract_pending' && (
            <Button
              asChild
              variant="default"
              className="w-full col-span-2"
            >
              <Link to={`/contracts?quote_id=${quote.id}`}>
                <FileText className="w-4 h-4 mr-2" />
                Review Contract
              </Link>
            </Button>
          )}
          {quote.status !== 'contract_accepted' && quote.status !== 'rejected' && (
            <Button
              onClick={onNegotiateClick}
              variant="outline"
              className="w-full"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Negotiations
            </Button>
          )}
          <Button
            onClick={onMessageClick}
            variant="outline"
            className="w-full"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Messages
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
