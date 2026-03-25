import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import OpportunityMap from '@/components/OpportunityMap';
import { useSellerDashboard } from '@/hooks/useSellerDashboard';
import { Job, Quote, TrackedItem, Opportunity } from '@/types/sellerDashboard';
import { ActionQueue } from '@/components/ActionQueue';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Briefcase,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  Clock,
  Bookmark,
  MessageSquare,
  ShoppingCart,
  Settings,
  Star,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Send,
  ArrowLeftRight,
  Edit,
  CalendarCheck,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { ProgressROI } from '@/components/ProgressROI';
import { useCurrency } from '@/hooks/useCurrency';
import { MessagingPanel } from '@/components/MessagingPanel';
import SellerNegotiationModal from '@/components/SellerNegotiationModal';
import EditQuoteModal from '@/components/EditQuoteModal';
import BookingResponseModal from '@/components/BookingResponseModal';
import { BookingMessagingPanel, useBookingUnreadCount } from '@/components/BookingMessagingPanel';

interface DashboardProps {
  currentLanguage: 'en' | 'ar';
}



const SellerDashboard = ({ currentLanguage }: DashboardProps) => {
  const { user, loading: authLoading, userType } = useAuth();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    userProfile,
    isAdmin,
    availableJobs,
    savedJobs,
    myQuotes,
    opportunityData,
    trackedItemsList,
    negotiations,
    bookingRequests,
    isLoading: dataLoading
  } = useSellerDashboard();

  // Dialog & Interaction State
  const [isActionQueueOpen, setIsActionQueueOpen] = useState(true);
  const [selectedQuoteForMessages, setSelectedQuoteForMessages] = useState<string | null>(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingResponseModalOpen, setBookingResponseModalOpen] = useState(false);
  const [bookingMessagingModalOpen, setBookingMessagingModalOpen] = useState(false);
  const [selectedBookingForMessaging, setSelectedBookingForMessaging] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
    // Allow sellers and admins to access this page
    if (!authLoading && userType && userType === 'buyer') {
      navigate('/buyer-dashboard');
    }
  }, [user, authLoading, userType, navigate]);

  const handleUntrackItem = async (itemId: string, itemType: 'signal' | 'tender') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tracked_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType);

      if (error) throw error;

      toast.success(currentLanguage === 'ar' ? 'تم إلغاء التتبع بنجاح' : 'Untracked successfully');
      queryClient.invalidateQueries({ queryKey: ['tracked-items'] });
    } catch (error) {
      console.error('Error untracking item:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل إلغاء التتبع' : 'Failed to untrack');
    }
  };

  const handleRecallQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quote_submissions')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast.success('Quote recalled successfully');
      queryClient.invalidateQueries({ queryKey: ['my-quotes'] });
    } catch (error) {
      console.error('Error recalling quote:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل استرجاع العرض' : 'Failed to recall quote');
    }
  };

  const handleCounterNegotiation = async (negotiationId: string, priceOffer: number, durationOffer: string, message: string) => {
    if (!user) return;

    try {
      const negotiation = negotiations.find(n => n.id === negotiationId);
      if (!negotiation) return;

      // Update the old negotiation to closed
      await supabase
        .from('quote_negotiations')
        .update({ status: 'closed' })
        .eq('id', negotiationId);

      // Create counter-offer
      const { error } = await supabase
        .from('quote_negotiations')
        .insert({
          quote_id: negotiation.quote_id,
          initiator_id: user.id,
          recipient_id: negotiation.initiator_id,
          price_offer: priceOffer,
          duration_offer: durationOffer,
          message: message,
          status: 'open'
        });

      if (error) throw error;

      toast.success('Counter-offer sent successfully');
      queryClient.invalidateQueries({ queryKey: ['negotiations'] });
      setShowNegotiationModal(false);
      setSelectedNegotiation(null);
    } catch (error) {
      console.error('Error sending counter-offer:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل إرسال العرض المقابل' : 'Failed to send counter-offer');
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap = {
      critical: { variant: 'destructive' as const, label: 'Critical', labelAr: 'حرج' },
      high: { variant: 'default' as const, label: 'High', labelAr: 'عالي' },
      medium: { variant: 'secondary' as const, label: 'Medium', labelAr: 'متوسط' },
      low: { variant: 'outline' as const, label: 'Low', labelAr: 'منخفض' }
    };
    const config = urgencyMap[urgency as keyof typeof urgencyMap] || urgencyMap.medium;
    return (
      <Badge variant={config.variant}>
        {currentLanguage === 'ar' ? config.labelAr : config.label}
      </Badge>
    );
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { label: 'Accepted Bookings', labelAr: 'حجوزات مقبولة', value: bookingRequests.filter(b => b.status === 'accepted').length, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending Quotes', labelAr: 'عروض معلقة', value: myQuotes.filter(q => q.status === 'pending').length, icon: Clock, color: 'text-yellow-600' },
    { label: 'Booking Requests', labelAr: 'طلبات الحجز', value: bookingRequests.filter(b => b.status === 'pending').length, icon: CalendarCheck, color: 'text-blue-600' },
    { label: 'Accepted Quotes', labelAr: 'عروض مقبولة', value: myQuotes.filter(q => q.status === 'accepted').length, icon: TrendingUp, color: 'text-accent' }
  ];

  return (
    <div className="min-h-screen bg-paper overflow-x-hidden" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2 truncate">
                {currentLanguage === 'ar'
                  ? `مرحباً ${userProfile?.full_name || userProfile?.company_name || user?.email?.split('@')[0] || ''}`
                  : `Welcome ${userProfile?.full_name || userProfile?.company_name || user?.email?.split('@')[0] || ''}`}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {currentLanguage === 'ar' ? 'اعثر على فرص الصيانة وقدم عروضك' : 'Find maintenance opportunities and submit your quotes'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Link to="/calendar" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full sm:w-auto">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'التقويم' : 'Calendar'}</span>
                </Button>
              </Link>
              <Link to="/marketplace" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full sm:w-auto">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'السوق' : 'Marketplace'}</span>
                </Button>
              </Link>
              <Link to="/briefs" className="flex-1 sm:flex-none">
                <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full sm:w-auto">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'الملخصات' : 'Briefs'}</span>
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="flex-1 sm:flex-none">
                  <Button variant="outline" size="sm" className="gap-1 sm:gap-2 w-full sm:w-auto">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">{currentLanguage === 'ar' ? 'الإدارة' : 'Admin'}</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Stats Grid - Single container animation, no per-item motion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} className="border-rule rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {currentLanguage === 'ar' ? stat.labelAr : stat.label}
                      </p>
                      <p className="text-2xl font-bold text-ink">{stat.value}</p>
                    </div>
                    <stat.icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* 1. Marketplace Jobs - Use initial={false} to skip re-animation */}
        <section className="mb-8">
          <Card className="border-rule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Briefcase className="w-6 h-6 text-primary" />
                {currentLanguage === 'ar' ? 'وظائف السوق' : 'Marketplace Jobs'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableJobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {currentLanguage === 'ar' ? 'لا توجد وظائف متاحة حالياً' : 'No jobs available at the moment'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Saved Jobs */}
                  {savedJobs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        {currentLanguage === 'ar' ? 'محفوظ' : 'Saved'}
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {savedJobs.map((job) => (
                          <Link
                            key={job.id}
                            to={`/job/${job.id}`}
                            className="block"
                          >
                            <div className="p-4 border border-rule rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-primary/30 transition-all duration-300 bg-card">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-ink line-clamp-1 mb-1.5">{job.title}</h3>
                                  <div className="flex items-center gap-2 mb-2">
                                    {job.buyer_type === 'individual' ? (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                        <span className="text-xs">👤</span>
                                        <span className="text-xs font-medium text-accent">Individual</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-xs">🏢</span>
                                        <span className="text-xs font-medium text-primary">Company</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {getUrgencyBadge(job.urgency)}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1 text-primary font-semibold">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {job.estimated_budget_min && job.estimated_budget_max
                                    ? `${formatAmount(job.estimated_budget_min)} - ${formatAmount(job.estimated_budget_max)}`
                                    : formatAmount(job.budget || 0)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{job.location}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Separator */}
                  {savedJobs.length > 0 && availableJobs.filter(j => !j.is_saved).length > 0 && (
                    <div className="border-t border-rule"></div>
                  )}

                  {/* Latest Jobs */}
                  {availableJobs.filter(j => !j.is_saved).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        {currentLanguage === 'ar' ? 'الأحدث' : 'Latest'}
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {availableJobs.filter(j => !j.is_saved).slice(0, 2).map((job) => (
                          <Link
                            key={job.id}
                            to={`/job/${job.id}`}
                            className="block"
                          >
                            <div className="p-4 border border-rule rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-primary/30 transition-all duration-300 bg-card">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-ink line-clamp-1 mb-1.5">{job.title}</h3>
                                  <div className="flex items-center gap-2 mb-2">
                                    {job.buyer_type === 'individual' ? (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                        <span className="text-xs">👤</span>
                                        <span className="text-xs font-medium text-accent">Individual</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                        <span className="text-xs">🏢</span>
                                        <span className="text-xs font-medium text-primary">Company</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {getUrgencyBadge(job.urgency)}
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1 text-primary font-semibold">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {job.estimated_budget_min && job.estimated_budget_max
                                    ? `${formatAmount(job.estimated_budget_min)} - ${formatAmount(job.estimated_budget_max)}`
                                    : formatAmount(job.budget || 0)}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{job.location}</span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View More Button */}
                  <div className="text-center pt-2">
                    <Link to="/marketplace">
                      <Button variant="outline" className="w-full max-w-xs">
                        {currentLanguage === 'ar' ? 'عرض المزيد' : 'View More'}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 2. My Quotes Management */}
        <section className="mb-8">
          <Card className="border-rule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-accent" />
                {currentLanguage === 'ar' ? 'إدارة عروضي' : 'My Quotes Management'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Quotes Tabs */}
              <Tabs defaultValue="all" className="space-y-4">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <TabsList className="inline-flex w-full min-w-max sm:grid sm:grid-cols-5 bg-muted/50 p-1 rounded-lg">
                    <TabsTrigger value="all" className="data-[state=active]:bg-background whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                      <span className="hidden sm:inline">All ({myQuotes.length})</span>
                      <span className="sm:hidden">All</span>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="data-[state=active]:bg-background whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                      <span className="hidden sm:inline">Pending ({myQuotes.filter(q => q.status === 'pending').length})</span>
                      <span className="sm:hidden">Pending</span>
                    </TabsTrigger>
                    <TabsTrigger value="messages" className="data-[state=active]:bg-background relative whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      <span className="hidden sm:inline">Messages</span>
                      <span className="sm:hidden">Msgs</span>
                      {(() => {
                        const unreadCount = myQuotes.reduce((sum, q) => sum + (q.unread_messages || 0), 0);
                        return unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-4 sm:min-w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs">
                            {unreadCount}
                          </Badge>
                        );
                      })()}
                    </TabsTrigger>
                    <TabsTrigger value="accepted" className="data-[state=active]:bg-background whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                      <span className="hidden sm:inline">Accepted ({myQuotes.filter(q => q.status === 'accepted').length})</span>
                      <span className="sm:hidden">Accept</span>
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="data-[state=active]:bg-background whitespace-nowrap px-3 sm:px-4 text-xs sm:text-sm">
                      <span className="hidden sm:inline">Rejected ({myQuotes.filter(q => q.status === 'rejected').length})</span>
                      <span className="sm:hidden">Reject</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Messages Tab */}
                <TabsContent value="messages" className="space-y-4">
                  <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
                    {/* Quote List */}
                    <div className="md:col-span-1 space-y-2 min-w-0">
                      <h3 className="text-sm font-semibold text-muted-foreground px-2">Your Quotes</h3>
                      {myQuotes.length === 0 ? (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No quotes yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                          {myQuotes.map((quote) => {
                            const hasNegotiations = negotiations.filter(n => n.quote_id === quote.id && n.status === 'open').length > 0;
                            return (
                              <div
                                key={quote.id}
                                onClick={() => setSelectedQuoteForMessages(quote.id)}
                                className={`p-4 border rounded-2xl cursor-pointer transition-all duration-300 ${selectedQuoteForMessages === quote.id
                                  ? 'border-primary bg-primary/5 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'
                                  : 'border-rule hover:border-primary/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card'
                                  }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-sm line-clamp-1">{quote.request_title}</h4>
                                  {(quote.unread_messages || 0) > 0 && (
                                    <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                                      {quote.unread_messages}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant={
                                    quote.status === 'accepted' ? 'default' :
                                      quote.status === 'rejected' ? 'destructive' : 'outline'
                                  } className="text-xs">
                                    {quote.status}
                                  </Badge>
                                  <span>{formatAmount(quote.price)}</span>
                                </div>
                                {hasNegotiations && (
                                  <div className="mt-2">
                                    <Badge variant="secondary" className="text-xs">
                                      <ArrowLeftRight className="w-3 h-3 mr-1" />
                                      Negotiation pending
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Messages & Negotiations Panel */}
                    <div className="md:col-span-2 min-w-0">
                      {!selectedQuoteForMessages ? (
                        <div className="flex flex-col items-center justify-center h-[600px] border border-rule rounded-lg bg-muted/10">
                          <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                          <p className="text-muted-foreground">Select a quote to view messages</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Negotiations Section */}
                          {negotiations.filter(n => n.quote_id === selectedQuoteForMessages && n.status === 'open').length > 0 && (
                            <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <ArrowLeftRight className="w-4 h-4" />
                                  Active Negotiations
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {negotiations
                                  .filter(n => n.quote_id === selectedQuoteForMessages && n.status === 'open')
                                  .map((neg) => {
                                    const isIncoming = neg.recipient_id === user?.id;
                                    return (
                                      <div key={neg.id} className="p-3 bg-background rounded-lg border border-rule">
                                        <div className="flex items-start justify-between mb-2">
                                          <Badge variant={isIncoming ? "default" : "secondary"}>
                                            {isIncoming ? 'Received' : 'Sent'}
                                          </Badge>
                                          {isIncoming && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setSelectedNegotiation(neg);
                                                setShowNegotiationModal(true);
                                              }}
                                            >
                                              <ArrowLeftRight className="w-3 h-3 mr-1" />
                                              Counter
                                            </Button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                                          {neg.price_offer && (
                                            <div className="min-w-0">
                                              <p className="text-xs text-muted-foreground">Price</p>
                                              <p className="font-semibold truncate">{formatAmount(neg.price_offer)}</p>
                                            </div>
                                          )}
                                          {neg.duration_offer && (
                                            <div className="min-w-0">
                                              <p className="text-xs text-muted-foreground">Duration</p>
                                              <p className="font-semibold truncate">{neg.duration_offer}</p>
                                            </div>
                                          )}
                                        </div>
                                        {neg.message && (
                                          <p className="text-sm mt-2 text-muted-foreground italic">"{neg.message}"</p>
                                        )}
                                      </div>
                                    );
                                  })}
                              </CardContent>
                            </Card>
                          )}

                          {/* Import MessagingPanel component */}
                          <MessagingPanel
                            quoteId={selectedQuoteForMessages}
                            quoteTitle={myQuotes.find(q => q.id === selectedQuoteForMessages)?.request_title}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Other Tabs */}
                {['all', 'pending', 'accepted', 'rejected'].map(status => (
                  <TabsContent key={status} value={status} className="space-y-3">
                    {myQuotes.filter(q => status === 'all' || q.status === status).length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">
                          {status === 'all'
                            ? (currentLanguage === 'ar' ? 'لم تقدم أي عروض بعد' : 'No quotes submitted yet')
                            : (currentLanguage === 'ar' ? `لا توجد عروض ${status}` : `No ${status} quotes yet`)}
                        </p>
                      </div>
                    ) : (
                      myQuotes.filter(q => status === 'all' || q.status === status).map((quote) => (
                        <div key={quote.id} className="p-4 sm:p-5 border border-rule rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-primary/30 transition-all duration-300 bg-card">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                            <Link to={`/job/${quote.request_id}`} className="flex-1 min-w-0 w-full sm:w-auto">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant={
                                  quote.status === 'accepted' ? 'default' :
                                    quote.status === 'rejected' ? 'destructive' : 'outline'
                                } className="text-xs">
                                  {quote.status.toUpperCase()}
                                </Badge>
                                {(quote.unread_messages || 0) > 0 && (
                                  <Badge variant="default" className="bg-blue-600 text-xs">
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    {quote.unread_messages}
                                  </Badge>
                                )}
                                {quote.buyer_info?.verified_seller && (
                                  <Badge variant="secondary" className="text-xs">✓ Verified</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-ink mb-2 break-words">
                                {quote.request_title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {quote.buyer_info?.buyer_type === 'individual' ? (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                    <span className="text-sm">👤</span>
                                    <span className="text-xs font-medium text-accent">Individual</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                    <span className="text-sm">🏢</span>
                                    <span className="text-xs font-medium text-primary">Company</span>
                                  </div>
                                )}
                                <span className="text-xs sm:text-sm text-muted-foreground truncate">
                                  {quote.buyer_info?.company_name || (quote.buyer_info?.buyer_type === 'individual' ? 'Individual Buyer' : 'Company')}
                                </span>
                              </div>
                            </Link>
                            <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start flex-shrink-0">
                              {(quote.status === 'pending' || quote.status === 'negotiating') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setEditingQuote(quote);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {quote.status !== 'accepted' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (confirm('Are you sure you want to recall this quote?')) {
                                      handleRecallQuote(quote.id);
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 mb-3">
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-w-0">
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                              <span className="font-medium truncate">{formatAmount(quote.price || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm min-w-0">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{quote.estimated_duration}</span>
                            </div>
                            <div className="text-xs sm:text-sm col-span-2 sm:col-span-1">
                              <span className="text-muted-foreground">Submitted: </span>
                              <span>{format(new Date(quote.created_at), 'MMM dd')}</span>
                            </div>
                          </div>
                          <div className="bg-muted/30 p-2 sm:p-3 rounded-md">
                            <p className="text-xs sm:text-sm line-clamp-2 break-words">{quote.proposal}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* 2.5 Booking Requests */}
        {/* 3. Booking Requests */}
        <section className="mb-8">
          <Card className="border-rule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarCheck className="w-6 h-6 text-accent" />
                {currentLanguage === 'ar' ? 'طلبات الحجز' : 'Booking Requests'}
                {bookingRequests.filter(b => ['pending', 'buyer_countered'].includes(b.status)).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {bookingRequests.filter(b => ['pending', 'buyer_countered'].includes(b.status)).length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="active">
                    Active ({bookingRequests.filter(b => ['pending', 'buyer_countered', 'counter_proposed', 'accepted'].includes(b.status)).length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    History ({bookingRequests.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status)).length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All ({bookingRequests.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-3">
                  {bookingRequests.filter(b => ['pending', 'buyer_countered', 'counter_proposed', 'accepted'].includes(b.status)).length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'لا توجد طلبات نشطة' : 'No active requests'}
                      </p>
                    </div>
                  ) : (
                    bookingRequests
                      .filter(b => ['pending', 'buyer_countered', 'counter_proposed', 'accepted'].includes(b.status))
                      .map((booking) => (
                        <Card key={booking.id} className="border-border rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              {/* Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <p className="font-semibold">
                                      {booking.profiles?.company_name || booking.profiles?.full_name || 'Client'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    <Badge variant="outline">
                                      {booking.request_type === 'booking' ? '📅 Direct Booking' :
                                        booking.request_type === 'consultation' ? '💬 Consultation' :
                                          '💰 Quote Request'}
                                    </Badge>
                                    {booking.requires_deposit && (
                                      <Badge variant="secondary">🔒 Deposit Required</Badge>
                                    )}
                                  </div>
                                  <Badge variant="secondary" className="capitalize">
                                    {booking.service_category?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <Badge variant={
                                  booking.status === 'accepted' ? 'default' :
                                    booking.status === 'declined' ? 'destructive' :
                                      booking.status === 'buyer_countered' ? 'destructive' :
                                        booking.status === 'counter_proposed' ? 'secondary' : 'outline'
                                }>
                                  {booking.status === 'buyer_countered' ? 'Buyer Countered' : booking.status}
                                </Badge>
                              </div>

                              {/* Details */}
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {currentLanguage === 'ar' ? 'وصف الوظيفة' : 'Job Description'}
                                </p>
                                <p className="text-sm line-clamp-2">{booking.job_description}</p>
                              </div>

                              {/* Dates */}
                              {(booking.proposed_start_date || booking.proposed_end_date) && (
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  {booking.proposed_start_date && (
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-1">
                                        {currentLanguage === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                                      </p>
                                      <p className="font-medium">
                                        {format(new Date(booking.proposed_start_date), 'MMM dd, yyyy')}
                                      </p>
                                    </div>
                                  )}
                                  {booking.proposed_end_date && (
                                    <div>
                                      <p className="text-muted-foreground text-xs mb-1">
                                        {currentLanguage === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                                      </p>
                                      <p className="font-medium">
                                        {format(new Date(booking.proposed_end_date), 'MMM dd, yyyy')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Additional Details */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {booking.location_city && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">
                                      {currentLanguage === 'ar' ? 'الموقع' : 'Location'}
                                    </p>
                                    <p className="font-medium">{booking.location_city}</p>
                                  </div>
                                )}
                                {booking.budget_range && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1">
                                      {currentLanguage === 'ar' ? 'الميزانية' : 'Budget'}
                                    </p>
                                    <p className="font-medium">{booking.budget_range}</p>
                                  </div>
                                )}
                                {booking.preferred_time_slot && (
                                  <div>
                                    <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {currentLanguage === 'ar' ? 'الوقت المفضل' : 'Preferred Time'}
                                    </p>
                                    <p className="font-medium capitalize">{booking.preferred_time_slot}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-muted-foreground text-xs mb-1">
                                    {currentLanguage === 'ar' ? 'الاستعجال' : 'Urgency'}
                                  </p>
                                  <Badge variant={
                                    booking.urgency === 'urgent' ? 'destructive' :
                                      booking.urgency === 'normal' ? 'secondary' : 'outline'
                                  }>
                                    {booking.urgency === 'urgent' ? '🔥 Urgent' :
                                      booking.urgency === 'normal' ? '⏰ Normal' :
                                        '📅 Flexible'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBookingForMessaging(booking);
                                    setBookingMessagingModalOpen(true);
                                  }}
                                  className="gap-2"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  {currentLanguage === 'ar' ? 'رسائل' : 'Messages'}
                                </Button>
                                {['contract_pending', 'contract_accepted'].includes(booking.status) && booking.contract_id && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => navigate(`/contracts/${booking.contract_id}`)}
                                    className="flex-1 gap-2"
                                  >
                                    <FileText className="w-4 h-4" />
                                    {currentLanguage === 'ar' ? 'عرض العقد' : 'View Contract'}
                                  </Button>
                                )}
                                {['pending', 'buyer_countered'].includes(booking.status) && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedBooking(booking);
                                      setBookingResponseModalOpen(true);
                                    }}
                                    className="flex-1"
                                  >
                                    {currentLanguage === 'ar' ? 'الرد' : 'Respond'}
                                  </Button>
                                )}
                              </div>

                              {/* Response Info */}
                              {booking.seller_response && !['pending', 'buyer_countered'].includes(booking.status) && (
                                <div className="bg-muted/50 p-3 rounded-md">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {currentLanguage === 'ar' ? 'ردك' : 'Your Response'}
                                  </p>
                                  <p className="text-sm">{booking.seller_response}</p>
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground pt-2 border-t">
                                {currentLanguage === 'ar' ? 'تم الاستلام' : 'Received'}: {' '}
                                {format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-3">
                  {bookingRequests.filter(b => ['completed', 'cancelled', 'declined'].includes(b.status)).length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'لا يوجد سجل' : 'No history yet'}
                      </p>
                    </div>
                  ) : (
                    bookingRequests
                      .filter(b => ['completed', 'cancelled', 'declined'].includes(b.status))
                      .map((booking) => (
                        <Card key={booking.id} className="border-border opacity-75 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                          <CardContent className="pt-6">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <p className="font-semibold">
                                      {booking.profiles?.company_name || booking.profiles?.full_name || 'Client'}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="capitalize">
                                    {booking.service_category?.replace(/_/g, ' ')}
                                  </Badge>
                                </div>
                                <Badge variant={
                                  booking.status === 'completed' ? 'default' :
                                    booking.status === 'cancelled' ? 'destructive' : 'outline'
                                }>
                                  {booking.status}
                                </Badge>
                              </div>
                              <p className="text-sm line-clamp-1 text-muted-foreground">
                                {booking.job_description}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {booking.completed_at ? (
                                  <>Completed: {format(new Date(booking.completed_at), 'MMM dd, yyyy')}</>
                                ) : (
                                  <>Received: {format(new Date(booking.created_at), 'MMM dd, yyyy')}</>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                  )}
                </TabsContent>

                <TabsContent value="all" className="space-y-3">
                  {bookingRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">
                        {currentLanguage === 'ar' ? 'لا توجد طلبات' : 'No requests'}
                      </p>
                    </div>
                  ) : (
                    bookingRequests.map((booking) => (
                      <Card key={booking.id} className="border-border rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <p className="font-semibold">
                                    {booking.profiles?.company_name || booking.profiles?.full_name || 'Client'}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="capitalize">
                                  {booking.service_category?.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                              <Badge variant={
                                booking.status === 'accepted' || booking.status === 'completed' ? 'default' :
                                  booking.status === 'declined' || booking.status === 'cancelled' ? 'destructive' :
                                    booking.status === 'buyer_countered' ? 'destructive' :
                                      booking.status === 'counter_proposed' ? 'secondary' : 'outline'
                              }>
                                {booking.status === 'buyer_countered' ? 'Buyer Countered' : booking.status}
                              </Badge>
                            </div>
                            <p className="text-sm line-clamp-1 text-muted-foreground">
                              {booking.job_description}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBookingForMessaging(booking);
                                  setBookingMessagingModalOpen(true);
                                }}
                                className="gap-2"
                              >
                                <MessageSquare className="w-4 h-4" />
                                {currentLanguage === 'ar' ? 'رسائل' : 'Messages'}
                              </Button>
                              {['pending', 'buyer_countered'].includes(booking.status) && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setBookingResponseModalOpen(true);
                                  }}
                                  className="flex-1"
                                >
                                  {currentLanguage === 'ar' ? 'الرد' : 'Respond'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Negotiation Modal */}
        <SellerNegotiationModal
          open={showNegotiationModal}
          onOpenChange={setShowNegotiationModal}
          negotiation={selectedNegotiation}
          onCounterOffer={handleCounterNegotiation}
          currentLanguage={currentLanguage}
        />

        {/* Edit Quote Modal */}
        <EditQuoteModal
          quote={editingQuote}
          isOpen={!!editingQuote}
          onClose={() => setEditingQuote(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['my-quotes'] });
            setEditingQuote(null);
          }}
        />

        {/* Booking Response Modal */}
        <BookingResponseModal
          open={bookingResponseModalOpen}
          onOpenChange={setBookingResponseModalOpen}
          booking={selectedBooking}
          currentLanguage={currentLanguage}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['booking-requests'] });
            setSelectedBooking(null);
          }}
        />

        {/* Booking Messaging Modal */}
        {selectedBookingForMessaging && (
          <BookingMessagingPanel
            bookingId={selectedBookingForMessaging.id}
            bookingTitle={selectedBookingForMessaging.service_category?.replace(/_/g, ' ')}
            isOpen={bookingMessagingModalOpen}
            onClose={() => {
              setBookingMessagingModalOpen(false);
              setSelectedBookingForMessaging(null);
            }}
          />
        )}

        {/* 3. Tracked Opportunities */}
        {/* Global Signals & Tenders Discovery */}
        <section
          className="mb-8"
        >
          <Card className="border-rule">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-accent" />
                  {currentLanguage === 'ar' ? 'الفرص المتتبعة' : 'Tracked Opportunities'}
                </CardTitle>
                <Link to="/briefs">
                  <Button variant="outline" size="sm">
                    {currentLanguage === 'ar' ? 'عرض الكل' : 'View All'}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {trackedItemsList.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {currentLanguage === 'ar' ? 'لا توجد فرص متتبعة' : 'No tracked opportunities'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trackedItemsList.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-4 border border-rule rounded-2xl hover:border-accent/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] bg-card transition-all duration-300"
                    >
                      <Link
                        to="/briefs"
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium text-ink line-clamp-1 mb-1">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="secondary">{item.type === 'signal' ? 'Signal' : 'Tender'}</Badge>
                          {item.company && <span>{item.company}</span>}
                          {item.location && (<><span>•</span><span>{item.location}</span></>)}
                          {item.deadline && (<><span>•</span><span>{new Date(item.deadline).toLocaleDateString()}</span></>)}
                          {item.value && (<><span>•</span><span className="font-semibold text-primary">{item.value}</span></>)}
                        </div>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleUntrackItem(item.id, item.type);
                        }}
                        className="flex-shrink-0"
                      >
                        <Bookmark className="h-4 w-4 fill-accent text-accent" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 4. Opportunity Hub */}
        {/* Tracked Signals Section */}
        <section className="mb-8">
          <Card className="border-rule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {currentLanguage === 'ar' ? 'مركز الفرص' : 'Opportunity Hub'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Opportunity Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {currentLanguage === 'ar' ? 'الإشارات المتتبعة' : 'Tracked Signals'}
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {trackedItemsList.filter(item => item.type === 'signal').length}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-accent/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {currentLanguage === 'ar' ? 'المناقصات المتتبعة' : 'Tracked Tenders'}
                      </p>
                      <p className="text-2xl font-bold text-accent">
                        {trackedItemsList.filter(item => item.type === 'tender').length}
                      </p>
                    </div>
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                </div>
              </div>

              {/* Total Pipeline Value - Full Width Bar */}
              <div className="mb-4">
                <div className="p-5 bg-gradient-to-r from-green-500/20 via-green-500/10 to-green-500/5 rounded-2xl border border-green-500/30 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">
                        {currentLanguage === 'ar' ? 'قيمة خط الأنابيب الإجمالية' : 'Total Pipeline Value'}
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatAmount(
                          trackedItemsList.reduce((sum, item) => {
                            const value = typeof item.value === 'string'
                              ? parseFloat(item.value.replace(/[^0-9.]/g, '')) || 0
                              : item.value || 0;
                            return sum + value;
                          }, 0)
                        )}
                      </p>
                    </div>
                    <TrendingUp className="h-7 w-7 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="border-t border-rule pt-4">
                <OpportunityMap
                  opportunities={opportunityData}
                  currentLanguage={currentLanguage}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. Action Queue */}
        {/* Tracked Tenders Section */}
        <section className="mb-8">
          <Collapsible open={isActionQueueOpen} onOpenChange={setIsActionQueueOpen}>
            <Card className="border-rule">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-accent" />
                      {currentLanguage === 'ar' ? 'قائمة الإجراءات' : 'Action Queue'}
                    </CardTitle>
                    {isActionQueueOpen ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <ActionQueue currentLanguage={currentLanguage} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </section>
      </div>
    </div>
  );
};

export default SellerDashboard;
