import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  Plus,
  ClipboardList,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { QuoteManagement } from '@/components/QuoteManagement';
import { MessagingPanel } from '@/components/MessagingPanel';
import { QuoteTemplateManager } from '@/components/QuoteTemplateManager';
import { BookingManagement } from '@/components/BookingManagement';
import { BookingHistoryArchive } from '@/components/BookingHistoryArchive';
import { BookingFilters, BookingFilterState } from '@/components/BookingFilters';
import { LeaveReviewModal } from '@/components/LeaveReviewModal';
import { BuyerMessagesSection } from '@/components/BuyerMessagesSection';
import { CompletionWorkflowCard } from '@/components/CompletionWorkflowCard';

interface DashboardProps {
  currentLanguage: 'en' | 'ar';
}

interface Request {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: string;
  budget: number;
  status: string;
  created_at: string;
  quote_count?: number;
}

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
}

const BuyerDashboard = ({ currentLanguage }: DashboardProps) => {
  const { user, loading, userType } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<string | null>(null);
  const [templateRequestId, setTemplateRequestId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; company_name?: string } | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (!loading && userType && userType !== 'buyer') {
      navigate('/marketplace');
    }
  }, [user, loading, userType, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', user.id)
        .maybeSingle();

      setUserProfile(profileData);

      // Fetch user's maintenance requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (requestsError) throw requestsError;

      // Fetch quote counts for each request
      const requestsWithCounts = await Promise.all(
        (requestsData || []).map(async (req: Request) => {
          const { count } = await supabase
            .from('quote_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('request_id', req.id);
          return { ...req, quote_count: count || 0 };
        })
      );

      setRequests(requestsWithCounts);

      // Fetch recent quotes for user's requests
      const { data: quotesData, error: quotesError } = await supabase
        .from('quote_submissions')
        .select(`
          *,
          maintenance_requests!inner(id, title, buyer_id)
        `)
        .eq('maintenance_requests.buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (quotesError) throw quotesError;

      // Fetch seller profiles separately (no FK join needed)
      const sellerIds = Array.from(new Set((quotesData || []).map((q: any) => q.seller_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};
      if (sellerIds.length) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', sellerIds);
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p]));
      }

      const formattedQuotes = (quotesData || []).map((q: any) => ({
        ...q,
        request_title: q.maintenance_requests?.title,
        seller_name: profilesMap[q.seller_id]?.full_name,
        seller_company: profilesMap[q.seller_id]?.company_name
      }));

      setQuotes(formattedQuotes);

      // Fetch booking requests
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Fetch seller profiles for bookings
      const bookingSellerIds = Array.from(new Set((bookingsData || []).map((b: any) => b.seller_id).filter(Boolean)));
      let bookingProfilesMap: Record<string, any> = {};
      if (bookingSellerIds.length) {
        const { data: bookingProfilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', bookingSellerIds);
        bookingProfilesMap = Object.fromEntries((bookingProfilesData || []).map((p: any) => [p.id, p]));
      }

      const formattedBookings = (bookingsData || []).map((b: any) => ({
        ...b,
        seller_name: bookingProfilesMap[b.seller_id]?.full_name,
        seller_company: bookingProfilesMap[b.seller_id]?.company_name
      }));

      setBookingRequests(formattedBookings);
      setFilteredBookings(formattedBookings);

      // Fetch contracts where user is buyer
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Fetch seller profiles for contracts
      const contractSellerIds = Array.from(new Set((contractsData || []).map((c: any) => c.seller_id).filter(Boolean)));
      let contractProfilesMap: Record<string, any> = {};
      if (contractSellerIds.length) {
        const { data: contractProfilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', contractSellerIds);
        contractProfilesMap = Object.fromEntries((contractProfilesData || []).map((p: any) => [p.id, p]));
      }

      const formattedContracts = (contractsData || []).map((c: any) => ({
        ...c,
        seller_name: contractProfilesMap[c.seller_id]?.full_name,
        seller_company: contractProfilesMap[c.seller_id]?.company_name
      }));

      setContracts(formattedContracts);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleBookingFilters = (filters: BookingFilterState) => {
    let filtered = [...bookingRequests];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(b =>
        b.service_category?.toLowerCase().includes(search) ||
        b.job_description?.toLowerCase().includes(search) ||
        b.location_city?.toLowerCase().includes(search)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    if (filters.urgency !== 'all') {
      filtered = filtered.filter(b => b.urgency === filters.urgency);
    }

    if (filters.serviceCategory !== 'all') {
      filtered = filtered.filter(b => b.service_category === filters.serviceCategory);
    }

    setFilteredBookings(filtered);
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;

    try {
      const { error } = await supabase
        .from('maintenance_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success(currentLanguage === 'ar' ? 'تم حذف الطلب' : 'Request deleted');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل حذف الطلب' : 'Failed to delete request');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { variant: 'default' as const, label: 'Open', labelAr: 'مفتوح' },
      assigned: { variant: 'secondary' as const, label: 'Assigned', labelAr: 'مُعيّن' },
      completed: { variant: 'default' as const, label: 'Completed', labelAr: 'مكتمل' },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', labelAr: 'ملغى' }
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.open;
    return (
      <Badge variant={config.variant}>
        {currentLanguage === 'ar' ? config.labelAr : config.label}
      </Badge>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-ink">{currentLanguage === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!user) return null;

  const stats = [
    { label: 'Active Requests', labelAr: 'الطلبات النشطة', value: requests.filter(r => r.status === 'open').length, icon: ClipboardList, color: 'text-primary' },
    { label: 'My Bookings', labelAr: 'حجوزاتي', value: bookingRequests.filter(b => b.status !== 'cancelled').length, icon: Calendar, color: 'text-accent' },
    { label: 'Pending Quotes', labelAr: 'عروض الأسعار المعلقة', value: quotes.filter(q => q.status === 'pending').length, icon: Clock, color: 'text-yellow-600' },
    { label: 'Accepted Quotes', labelAr: 'عروض مقبولة', value: quotes.filter(q => q.status === 'accepted').length, icon: CheckCircle, color: 'text-green-600' }
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
                {currentLanguage === 'ar' ? 'إدارة طلبات الصيانة والعروض' : 'Manage your maintenance requests and quotes'}
              </p>
            </div>
            <Button
              size="default"
              onClick={() => navigate('/post-job')}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span className="sm:inline">{currentLanguage === 'ar' ? 'طلب جديد' : 'New Request'}</span>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-rule">
                  <CardContent className="p-3 sm:p-4 lg:pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 line-clamp-1">
                          {currentLanguage === 'ar' ? stat.labelAr : stat.label}
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-ink">{stat.value}</p>
                      </div>
                      <stat.icon className={`w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${stat.color} flex-shrink-0`} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Requests */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-rule">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-accent" />
                    {currentLanguage === 'ar' ? 'طلباتي' : 'My Requests'}
                  </CardTitle>
                  <Link to="/my-requests">
                    <Button variant="ghost" size="sm">
                      {currentLanguage === 'ar' ? 'عرض الكل' : 'View All'}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">
                      {currentLanguage === 'ar' ? 'لم تقم بنشر أي طلبات بعد' : 'No requests posted yet'}
                    </p>
                    <Button onClick={() => navigate('/post-job')}>
                      {currentLanguage === 'ar' ? 'انشر طلبك الأول' : 'Post Your First Request'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div key={request.id} className="space-y-2">
                        <Link
                          to={`/job/${request.id}`}
                          className="block"
                        >
                          <div className="p-4 border border-rule rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-ink line-clamp-1">{request.title}</h3>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {request.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className={getUrgencyColor(request.urgency)}>
                                {request.urgency.toUpperCase()}
                              </span>
                              {request.budget && <span>${request.budget.toLocaleString()}</span>}
                              <span>{request.quote_count || 0} {currentLanguage === 'ar' ? 'عروض' : 'quotes'}</span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTemplateRequestId(request.id);
                            }}
                            className="gap-2"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {currentLanguage === 'ar' ? 'قالب العروض' : 'Quote Template'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(request.id);
                            }}
                          >
                            {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>

          {/* Messages Section - Separate after My Requests */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="lg:col-span-2"
          >
            <BuyerMessagesSection userId={user.id} currentLanguage={currentLanguage} />
          </motion.section>

          <div className="lg:col-span-2">
            {/* Quotes & Contracts & Bookings */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Tabs defaultValue="quotes" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="quotes">
                    {currentLanguage === 'ar' ? 'عروض الأسعار' : 'Quotes'}
                  </TabsTrigger>
                  <TabsTrigger value="contracts">
                    {currentLanguage === 'ar' ? 'العقود' : 'Contracts'}
                  </TabsTrigger>
                  <TabsTrigger value="bookings">
                    {currentLanguage === 'ar' ? 'الحجوزات' : 'Bookings'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="quotes" className="mt-4">
                  {quotes.length === 0 ? (
                    <Card className="border-rule">
                      <CardContent className="py-12 text-center">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">
                          {currentLanguage === 'ar' ? 'لا توجد عروض أسعار بعد' : 'No quotes received yet'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Sellers will submit quotes for your requests
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {quotes.map((quote) => (
                        <QuoteManagement
                          key={quote.id}
                          quote={quote}
                          onUpdate={fetchData}
                          currentLanguage={currentLanguage}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="contracts" className="mt-4">
                  {contracts.length === 0 ? (
                    <Card className="border-rule">
                      <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">
                          {currentLanguage === 'ar' ? 'لا توجد عقود بعد' : 'No contracts yet'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Contracts are created when you accept quotes or bookings
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                      {contracts.map((contract) => (
                        <Card key={contract.id} className="border-rule hover:shadow-md transition-all">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-ink mb-1">
                                  Contract #{contract.id.slice(0, 8)}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  with {contract.seller_company || contract.seller_name || 'Seller'}
                                </p>
                              </div>
                              <Badge variant={
                                contract.status === 'executed' ? 'default' :
                                  contract.status === 'pending_buyer' || contract.status === 'pending_seller' ? 'secondary' :
                                    'outline'
                              }>
                                {contract.status === 'pending_buyer' ? 'Awaiting Your Review' :
                                  contract.status === 'pending_seller' ? 'Awaiting Seller' :
                                    contract.status === 'executed' ? 'Active' : contract.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                              <span>Created: {format(new Date(contract.created_at), 'MMM dd, yyyy')}</span>
                              {contract.executed_at && (
                                <span>Executed: {format(new Date(contract.executed_at), 'MMM dd, yyyy')}</span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/contracts/${contract.id}`)}
                              className="w-full sm:w-auto"
                            >
                              View Contract
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bookings" className="mt-4">
                  <div className="space-y-4">
                    <BookingFilters onFilterChange={handleBookingFilters} />

                    <Tabs defaultValue="active" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">Active Bookings</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                      </TabsList>

                      <TabsContent value="active" className="space-y-4 mt-4">
                        <Tabs defaultValue="all" className="w-full">
                          <TabsList className="grid w-full grid-cols-5 text-xs">
                            <TabsTrigger value="all" className="gap-1">
                              All ({filteredBookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length})
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="gap-1">
                              <Clock className="w-3 h-3" />
                              {filteredBookings.filter(b => b.status === 'pending').length}
                            </TabsTrigger>
                            <TabsTrigger value="accepted" className="gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {filteredBookings.filter(b => b.status === 'accepted').length}
                            </TabsTrigger>
                            <TabsTrigger value="counter_proposed" className="gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {filteredBookings.filter(b => b.status === 'counter_proposed').length}
                            </TabsTrigger>
                            <TabsTrigger value="declined" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              {filteredBookings.filter(b => b.status === 'declined').length}
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="all" className="mt-4">
                            {filteredBookings.filter(b => !['completed', 'cancelled'].includes(b.status)).length === 0 ? (
                              <Card className="border-rule">
                                <CardContent className="py-12 text-center">
                                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                  <p className="text-muted-foreground">No active bookings</p>
                                </CardContent>
                              </Card>
                            ) : (
                              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {filteredBookings
                                  .filter(b => !['completed', 'cancelled'].includes(b.status))
                                  .map((booking) => (
                                    <BookingManagement
                                      key={booking.id}
                                      booking={booking}
                                      onUpdate={fetchData}
                                      currentLanguage={currentLanguage}
                                    />
                                  ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="pending" className="mt-4">
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                              {filteredBookings.filter(b => b.status === 'pending').map((booking) => (
                                <BookingManagement key={booking.id} booking={booking} onUpdate={fetchData} currentLanguage={currentLanguage} />
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="accepted" className="mt-4">
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                              {filteredBookings.filter(b => b.status === 'accepted').map((booking) => (
                                <BookingManagement key={booking.id} booking={booking} onUpdate={fetchData} currentLanguage={currentLanguage} />
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="counter_proposed" className="mt-4">
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                              {filteredBookings.filter(b => b.status === 'counter_proposed').map((booking) => (
                                <BookingManagement key={booking.id} booking={booking} onUpdate={fetchData} currentLanguage={currentLanguage} />
                              ))}
                            </div>
                          </TabsContent>

                          <TabsContent value="declined" className="mt-4">
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                              {filteredBookings.filter(b => b.status === 'declined').map((booking) => (
                                <BookingManagement key={booking.id} booking={booking} onUpdate={fetchData} currentLanguage={currentLanguage} />
                              ))}
                            </div>
                          </TabsContent>
                        </Tabs>
                      </TabsContent>

                      <TabsContent value="history" className="mt-4">
                        <BookingHistoryArchive currentLanguage={currentLanguage} />
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.section>
          </div>
        </div>

        {/* Quote Template Manager */}
        {templateRequestId && (
          <QuoteTemplateManager
            requestId={templateRequestId}
            isOpen={!!templateRequestId}
            onClose={() => setTemplateRequestId(null)}
            currentLanguage={currentLanguage}
          />
        )}

        {/* Leave Review Modal */}
        {reviewModalOpen && selectedBookingForReview && (
          <LeaveReviewModal
            open={reviewModalOpen}
            onOpenChange={setReviewModalOpen}
            sellerId={selectedBookingForReview.seller_id}
            sellerName={selectedBookingForReview.seller_name || selectedBookingForReview.seller_company || 'Service Provider'}
            bookingId={selectedBookingForReview.id}
            onSuccess={fetchData}
            currentLanguage={currentLanguage}
          />
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
