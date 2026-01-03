import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessagingPanel } from '@/components/MessagingPanel';
import NegotiationModal from '@/components/NegotiationModal';
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
  Bookmark,
  MapPin,
  Eye,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface Quote {
  id: string;
  request_id: string;
  price: number;
  estimated_duration: string;
  proposal: string;
  status: string;
  created_at: string;
  updated_at: string;
  start_date?: string;
  request?: {
    id: string;
    title: string;
    buyer_id: string;
  };
}

interface SavedRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: string;
  budget: number;
  status: string;
  created_at: string;
}

interface TrackedRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: string;
  budget: number;
  status: string;
  created_at: string;
}

interface SellerQuotesProps {
  currentLanguage?: 'en' | 'ar';
}

export default function SellerQuotes({ currentLanguage = 'en' }: SellerQuotesProps) {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [trackedRequests, setTrackedRequests] = useState<TrackedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [negotiationQuote, setNegotiationQuote] = useState<Quote | null>(null);

  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quote_submissions')
        .select(`
          *,
          request:maintenance_requests(id, title, buyer_id)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);

      // Fetch saved requests
      const { data: savedData, error: savedError } = await supabase
        .from('saved_requests')
        .select(`
          request_id,
          maintenance_requests!inner(*)
        `)
        .eq('seller_id', user.id);

      if (savedError) throw savedError;
      setSavedRequests((savedData || []).map((s: any) => s.maintenance_requests));

      // Fetch tracked requests
      const { data: trackedData, error: trackedError } = await supabase
        .from('tracked_items')
        .select('item_id')
        .eq('user_id', user.id)
        .eq('item_type', 'tender');

      if (trackedError) throw trackedError;

      // Fetch the actual maintenance requests for tracked items
      if (trackedData && trackedData.length > 0) {
        const itemIds = trackedData.map(t => t.item_id);
        const { data: requestsData, error: requestsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('id', itemIds);

        if (!requestsError && requestsData) {
          setTrackedRequests(requestsData);
        }
      } else {
        setTrackedRequests([]);
      }

    } catch (error: any) {
      toast.error(currentLanguage === 'ar' ? `فشل تحميل البيانات: ${error.message}` : 'Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
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
    if (!status) return quotes;
    return quotes.filter(q => q.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'pending').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    negotiating: quotes.filter(q => q.status === 'negotiating').length
  };

  // Combine saved and tracked requests into one unified list
  const combinedTrackedRequests = (() => {
    const map = new Map<string, SavedRequest | TrackedRequest>();
    [...savedRequests, ...trackedRequests].forEach((req) => map.set(req.id, req));
    return Array.from(map.values());
  })();

  return (
    <div className="min-h-screen bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-ink mb-2">My Quotes</h1>
          <p className="text-muted-foreground">
            Manage your submitted quotes and track their status
          </p>
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
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <p className="text-sm text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card className="border-rule">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.negotiating}</div>
              <p className="text-sm text-muted-foreground">Negotiating</p>
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

          <TabsContent value="all" className="space-y-4">
            {quotes.length === 0 ? (
              <Card className="border-rule p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">No quotes submitted yet</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {quotes.map((quote) => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    onMessageClick={() => {
                      setSelectedQuoteId(quote.id);
                      setActiveTab('messages');
                    }}
                    onNegotiateClick={() => {
                      setNegotiationQuote(quote);
                      setShowNegotiationModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            <div className="grid gap-4">
              {filterQuotes('pending').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onMessageClick={() => {
                    setSelectedQuoteId(quote.id);
                    setActiveTab('messages');
                  }}
                  onNegotiateClick={() => {
                    setNegotiationQuote(quote);
                    setShowNegotiationModal(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="negotiating" className="space-y-4">
            <div className="grid gap-4">
              {filterQuotes('negotiating').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onMessageClick={() => {
                    setSelectedQuoteId(quote.id);
                    setActiveTab('messages');
                  }}
                  onNegotiateClick={() => {
                    setNegotiationQuote(quote);
                    setShowNegotiationModal(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            <div className="grid gap-4">
              {filterQuotes('accepted').map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  onMessageClick={() => {
                    setSelectedQuoteId(quote.id);
                    setActiveTab('messages');
                  }}
                  onNegotiateClick={() => {
                    setNegotiationQuote(quote);
                    setShowNegotiationModal(true);
                  }}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-rule md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-base">Your Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-2">
                    {quotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No quotes yet</p>
                    ) : (
                      quotes.map((q) => (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQuoteId(q.id)}
                          className={`w-full text-left p-3 border rounded-md transition-colors ${selectedQuoteId === q.id ? 'bg-muted/50 border-accent' : 'border-rule hover:bg-muted/30'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium line-clamp-1">{q.request?.title || 'Request'}</span>
                            {getStatusBadge(q.status)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="md:col-span-2">
                {selectedQuoteId ? (
                  <MessagingPanel
                    quoteId={selectedQuoteId}
                    quoteTitle={quotes.find(q => q.id === selectedQuoteId)?.request?.title}
                  />
                ) : (
                  <Card className="border-rule p-12 text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">Select a quote to view messages</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Tracked Requests Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12"
        >
          <h2 className="text-2xl font-bold text-ink mb-4">Tracked Requests</h2>
          {combinedTrackedRequests.length === 0 ? (
            <Card className="border-rule p-12 text-center">
              <Eye className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">No saved or tracked requests yet</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {combinedTrackedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </motion.div>

        <NegotiationModal
          open={showNegotiationModal}
          onOpenChange={setShowNegotiationModal}
          quote={negotiationQuote}
          onSubmitted={() => {
            setShowNegotiationModal(false);
            fetchAllData();
          }}
          currentLanguage={currentLanguage}
        />
      </div>
    </div>
  );
}

interface QuoteCardProps {
  quote: Quote;
  onMessageClick: () => void;
  onNegotiateClick: () => void;
}

function QuoteCard({ quote, onMessageClick, onNegotiateClick }: QuoteCardProps) {
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

  const startDate = quote.start_date || quote.proposal.match(/(?:Proposed|Updated) Start Date: (\d{4}-\d{2}-\d{2})/)?.[1];

  return (
    <Card className="border-rule hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 text-ink">
              {quote.request?.title || 'Request'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(quote.created_at), 'MMM dd, yyyy')}
            </p>
          </div>
          {getStatusBadge(quote.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Your Quote</span>
            </div>
            <p className="text-xl font-bold text-primary">
              ${quote.price.toLocaleString()}
            </p>
          </div>
          {startDate && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Suggested Date</span>
              </div>
              <p className="text-lg font-semibold text-ink">
                {format(new Date(startDate), 'MMM dd, yyyy')}
              </p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-ink mb-1">Proposal</p>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {quote.proposal.replace(/(?:Proposed|Updated) Start Date:.*$/gim, '').trim()}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(quote.status !== 'accepted' && quote.status !== 'rejected') && (
            <button
              onClick={onNegotiateClick}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-rule rounded-md hover:bg-muted/30 transition-colors text-sm text-ink"
            >
              <TrendingUp className="w-4 h-4" />
              {quote.status === 'negotiating' ? 'Continue Negotiation' : 'Negotiate'}
            </button>
          )}
          <button
            onClick={onMessageClick}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-rule rounded-md hover:bg-muted/30 transition-colors text-sm text-ink"
          >
            <MessageSquare className="w-4 h-4" />
            View Messages
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

interface RequestCardProps {
  request: SavedRequest | TrackedRequest;
}

function RequestCard({ request }: RequestCardProps) {
  const getUrgencyBadge = (urgency: string) => {
    const config: Record<string, { variant: any; label: string }> = {
      critical: { variant: 'destructive', label: 'Critical' },
      high: { variant: 'default', label: 'High' },
      medium: { variant: 'secondary', label: 'Medium' },
      low: { variant: 'outline', label: 'Low' }
    };
    const s = config[urgency] || config.medium;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Card className="border-rule hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link to={`/job/${request.id}`}>
              <CardTitle className="text-lg mb-2 text-ink hover:text-primary transition-colors">
                {request.title}
              </CardTitle>
            </Link>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {request.description}
            </p>
          </div>
          {getUrgencyBadge(request.urgency)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Budget</span>
            </div>
            <p className="text-xl font-bold text-primary">
              ${request.budget?.toLocaleString() || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </div>
            <p className="text-lg font-semibold text-ink">
              {request.location}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Posted {format(new Date(request.created_at), 'MMM dd, yyyy')}</span>
          <Badge variant="outline">{request.status}</Badge>
        </div>

        <Link to={`/job/${request.id}`}>
          <button className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-rule rounded-md hover:bg-muted/30 transition-colors text-sm text-ink">
            <FileText className="w-4 h-4" />
            View Details
          </button>
        </Link>
      </CardContent>
    </Card>
  );
}
