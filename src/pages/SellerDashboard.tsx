import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import OpportunityMap from '@/components/OpportunityMap';
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

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: string;
  budget: number;
  estimated_budget_min?: number | null;
  estimated_budget_max?: number | null;
  status: string;
  created_at: string;
  buyer_type?: 'company' | 'individual';
  buyer_company_name?: string | null;
  is_saved?: boolean;
  profiles?: {
    id: string;
    company_name?: string;
    buyer_type?: 'company' | 'individual';
    verified_seller?: boolean;
  };
}

interface Quote {
  id: string;
  request_id: string;
  price: number;
  estimated_duration: string;
  status: string;
  created_at: string;
  proposal: string;
  request_title?: string;
  unread_messages?: number;
  buyer_info?: {
    id: string;
    company_name?: string;
    buyer_type?: 'company' | 'individual';
    verified_seller?: boolean;
  };
}

const SellerDashboard = ({ currentLanguage }: DashboardProps) => {
  const { user, loading, userType } = useAuth();
  const { formatAmount } = useCurrency();
  const navigate = useNavigate();
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [myQuotes, setMyQuotes] = useState<Quote[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [opportunityData, setOpportunityData] = useState<any[]>([]);
  const [trackedItemsList, setTrackedItemsList] = useState<any[]>([]);
  const [isActionQueueOpen, setIsActionQueueOpen] = useState(true);
  const [selectedQuoteForMessages, setSelectedQuoteForMessages] = useState<string | null>(null);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState<any>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name?: string; company_name?: string } | null>(null);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [bookingResponseModalOpen, setBookingResponseModalOpen] = useState(false);
  const [bookingMessagingModalOpen, setBookingMessagingModalOpen] = useState(false);
  const [selectedBookingForMessaging, setSelectedBookingForMessaging] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    // Allow sellers and admins to access this page
    if (!loading && userType && userType === 'buyer') {
      navigate('/buyer-dashboard');
    }
  }, [user, loading, userType, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      checkAdminStatus();
      fetchNegotiations();
      fetchBookingRequests();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

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

      // Fetch available jobs (open maintenance requests) with buyer profiles
      const { data: jobsData, error: jobsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('status', 'open')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;

      // Check which jobs are saved
      const { data: savedData } = await supabase
        .from('saved_requests')
        .select('request_id')
        .eq('seller_id', user.id);

      const savedIds = new Set((savedData || []).map((s: any) => s.request_id));
      const jobsWithSaved = (jobsData || []).map((job: any) => ({
        ...job,
        is_saved: savedIds.has(job.id)
      }));

      setAvailableJobs(jobsWithSaved as any);

      // Fetch seller's quotes with buyer profiles
      const { data: quotesData, error: quotesError } = await supabase
        .from('quote_submissions')
        .select(`
          *,
          maintenance_requests!inner(
            title,
            buyer_id
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // Fetch unread message counts for each quote (messages not sent by seller)
      const formattedQuotesPromises = (quotesData || []).map(async (q: any) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('quote_id', q.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          ...q,
          request_title: q.maintenance_requests?.title,
          unread_messages: count || 0
        };
      });

      const formattedQuotes = await Promise.all(formattedQuotesPromises);
      setMyQuotes(formattedQuotes);

      // Fetch saved jobs (two-step since there is no FK relationship)
      const { data: savedRows, error: savedError } = await supabase
        .from('saved_requests')
        .select('request_id')
        .eq('seller_id', user.id)
        .limit(50);

      if (savedError) throw savedError;

      let savedJobsList: any[] = [];
      if (savedRows && savedRows.length > 0) {
        const ids = savedRows.map((s: any) => s.request_id);
        const { data: savedReqs, error: savedReqsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .in('id', ids);
        if (savedReqsError) throw savedReqsError;
        savedJobsList = savedReqs || [];
      }

      setSavedJobs(savedJobsList.map((j: any) => ({ ...j, is_saved: true })));

      // Fetch tracked signals and tenders for the map
      const { data: trackedData } = await supabase
        .from('tracked_items')
        .select('item_id, item_type')
        .eq('user_id', user.id);

      const trackedIds = trackedData || [];
      const signalIds = trackedIds.filter((t: any) => t.item_type === 'signal').map((t: any) => t.item_id);
      const tenderIds = trackedIds.filter((t: any) => t.item_type === 'tender').map((t: any) => t.item_id);

      const opportunities = [];
      let trackedList: any[] = [];

      // Fetch tracked signals (only tracked items for map)
      if (signalIds.length > 0) {
        const { data: signalsData } = await supabase
          .from('signals')
          .select('*')
          .in('id', signalIds);

        (signalsData || []).forEach((signal: any) => {
          opportunities.push({
            id: signal.id,
            title: signal.company_name,
            location: signal.location || 'Unknown',
            type: 'signal',
            isRemote: signal.location?.toLowerCase().includes('remote') || signal.location?.toLowerCase().includes('online'),
            latitude: getCoordinatesForLocation(signal.location || 'Saudi Arabia').lat,
            longitude: getCoordinatesForLocation(signal.location || 'Saudi Arabia').lng
          });

          trackedList.push({
            id: signal.id,
            title: signal.description,
            company: signal.company_name,
            deadline: signal.deadline || null,
            value: signal.estimated_value || null,
            type: 'signal',
            location: signal.location || null
          });
        });
      }

      // Fetch tracked tenders (only tracked items for map)
      if (tenderIds.length > 0) {
        const { data: tendersData } = await supabase
          .from('tenders')
          .select('*')
          .in('id', tenderIds);

        (tendersData || []).forEach((tender: any) => {
          opportunities.push({
            id: tender.id,
            title: tender.title,
            location: tender.location || 'Unknown',
            type: 'tender',
            isRemote: tender.location?.toLowerCase().includes('remote') || tender.location?.toLowerCase().includes('online'),
            latitude: getCoordinatesForLocation(tender.location || 'Saudi Arabia').lat,
            longitude: getCoordinatesForLocation(tender.location || 'Saudi Arabia').lng
          });

          trackedList.push({
            id: tender.id,
            title: tender.title,
            company: tender.location || 'KSA',
            deadline: tender.submission_deadline || null,
            value: tender.value_max ? formatAmount(tender.value_max) : null,
            type: 'tender',
            location: tender.location || null
          });
        });
      }

      setOpportunityData(opportunities);
      setTrackedItemsList(trackedList);

    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

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
      fetchData();
    } catch (error) {
      console.error('Error untracking item:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل إلغاء التتبع' : 'Failed to untrack');
    }
  };

  const getCoordinatesForLocation = (location: string) => {
    const cityCoords: { [key: string]: { lat: number; lng: number } } = {
      'riyadh': { lat: 24.7136, lng: 46.6753 },
      'jeddah': { lat: 21.4858, lng: 39.1925 },
      'mecca': { lat: 21.3891, lng: 39.8579 },
      'medina': { lat: 24.5247, lng: 39.5692 },
      'dammam': { lat: 26.4207, lng: 50.0888 },
      'khobar': { lat: 26.2172, lng: 50.1971 },
      'dhahran': { lat: 26.2885, lng: 50.1520 },
      'tabuk': { lat: 28.3838, lng: 36.5550 },
      'abha': { lat: 18.2164, lng: 42.5053 },
      'khamis mushait': { lat: 18.3065, lng: 42.7291 },
      'hail': { lat: 27.5114, lng: 41.7208 },
      'najran': { lat: 17.4924, lng: 44.1277 },
      'jubail': { lat: 27.0174, lng: 49.6583 },
      'yanbu': { lat: 24.0891, lng: 38.0618 },
      'taif': { lat: 21.2703, lng: 40.4154 },
      'buraidah': { lat: 26.3260, lng: 43.9750 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'abu dhabi': { lat: 24.4539, lng: 54.3773 },
      'sharjah': { lat: 25.3573, lng: 55.4033 },
      'ajman': { lat: 25.4052, lng: 55.5136 },
      'fujairah': { lat: 25.1288, lng: 56.3265 },
      'ras al khaimah': { lat: 25.7897, lng: 55.9433 },
      'al ain': { lat: 24.2075, lng: 55.7447 },
      'cairo': { lat: 30.0444, lng: 31.2357 },
      'alexandria': { lat: 31.2001, lng: 29.9187 },
      'giza': { lat: 30.0131, lng: 31.2089 },
      'sharm el sheikh': { lat: 27.9158, lng: 34.3300 },
      'hurghada': { lat: 27.2579, lng: 33.8116 },
      'luxor': { lat: 25.6872, lng: 32.6396 },
      'aswan': { lat: 24.0889, lng: 32.8998 },
      'amman': { lat: 31.9454, lng: 35.9284 },
      'aqaba': { lat: 29.5321, lng: 35.0063 },
      'irbid': { lat: 32.5556, lng: 35.8500 },
      'zarqa': { lat: 32.0853, lng: 36.0880 },
      'beirut': { lat: 33.8886, lng: 35.4955 },
      'tripoli': { lat: 34.4368, lng: 35.8498 },
      'sidon': { lat: 33.5574, lng: 35.3695 },
      'kuwait city': { lat: 29.3759, lng: 47.9774 },
      'hawalli': { lat: 29.3328, lng: 48.0289 },
      'salmiya': { lat: 29.3336, lng: 48.0753 },
      'manama': { lat: 26.2285, lng: 50.5860 },
      'muharraq': { lat: 26.2572, lng: 50.6119 },
      'doha': { lat: 25.2854, lng: 51.5310 },
      'al wakrah': { lat: 25.1716, lng: 51.5985 },
      'muscat': { lat: 23.5880, lng: 58.3829 },
      'salalah': { lat: 17.0151, lng: 54.0924 },
      'sohar': { lat: 24.3473, lng: 56.7091 },
      'baghdad': { lat: 33.3152, lng: 44.3661 },
      'basra': { lat: 30.5085, lng: 47.7835 },
      'mosul': { lat: 36.3350, lng: 43.1189 },
      'erbil': { lat: 36.1911, lng: 44.0091 },
      'sulaymaniyah': { lat: 35.5558, lng: 45.4375 },
      'casablanca': { lat: 33.5731, lng: -7.5898 },
      'rabat': { lat: 34.0209, lng: -6.8416 },
      'marrakech': { lat: 31.6295, lng: -7.9811 },
      'fes': { lat: 34.0181, lng: -5.0078 },
      'tangier': { lat: 35.7595, lng: -5.8340 },
      'tunis': { lat: 36.8065, lng: 10.1815 },
      'sfax': { lat: 34.7406, lng: 10.7603 },
      'sousse': { lat: 35.8254, lng: 10.6378 },
      'algiers': { lat: 36.7372, lng: 3.0865 },
      'oran': { lat: 35.6976, lng: -0.6337 },
      'constantine': { lat: 36.3650, lng: 6.6147 },
      'tripoli libya': { lat: 32.8872, lng: 13.1913 },
      'benghazi': { lat: 32.1191, lng: 20.0869 },
      'ramallah': { lat: 31.9073, lng: 35.2044 },
      'gaza': { lat: 31.5000, lng: 34.4667 },
      'hebron': { lat: 31.5292, lng: 35.0938 },
      'damascus': { lat: 33.5138, lng: 36.2765 },
      'aleppo': { lat: 36.2021, lng: 37.1343 },
      'sanaa': { lat: 15.3694, lng: 44.1910 },
      'aden': { lat: 12.7855, lng: 45.0187 },
      'remote': { lat: 25.0, lng: 35.0 },
      'online': { lat: 25.0, lng: 35.0 }
    };

    const locationLower = location.toLowerCase();

    if (cityCoords[locationLower]) {
      return cityCoords[locationLower];
    }

    for (const city in cityCoords) {
      if (locationLower.includes(city)) {
        return cityCoords[city];
      }
    }

    return { lat: 25.0, lng: 35.0 };
  };

  const fetchNegotiations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('quote_negotiations')
        .select(`
          *,
          quote_submissions!inner(
            id,
            request_id,
            maintenance_requests!inner(title, buyer_id)
          )
        `)
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      setNegotiations(data || []);
    } catch (error) {
      console.error('Error fetching negotiations:', error);
    }
  };

  const fetchBookingRequests = async () => {
    if (!user) return;

    try {
      const { data: bookings, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch buyer profiles separately
      const buyerIds = Array.from(new Set((bookings || []).map(b => b.buyer_id).filter(Boolean)));
      let profilesMap: Record<string, any> = {};

      if (buyerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, email')
          .in('id', buyerIds);

        profilesMap = Object.fromEntries((profilesData || []).map(p => [p.id, p]));
      }

      // Attach buyer profiles to bookings
      const bookingsWithProfiles = (bookings || []).map(booking => ({
        ...booking,
        profiles: profilesMap[booking.buyer_id] || null
      }));

      setBookingRequests(bookingsWithProfiles);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
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
      fetchData();
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
      fetchNegotiations();
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

  if (loading || dataLoading) {
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

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-rule">
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
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 1. Marketplace Jobs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
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
                            <div className="p-3 border border-rule rounded-lg hover:shadow-md hover:border-primary/50 transition-all">
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
                            <div className="p-3 border border-rule rounded-lg hover:shadow-md hover:border-primary/50 transition-all">
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
        </motion.section>

        {/* 2. My Quotes Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
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
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedQuoteForMessages === quote.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-rule hover:border-primary/50'
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
                        <div key={quote.id} className="p-3 sm:p-4 border border-rule rounded-lg hover:shadow-md hover:border-primary/50 transition-all">
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
        </motion.section>

        {/* 2.5 Booking Requests */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
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
                        <Card key={booking.id} className="border-border">
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
                        <Card key={booking.id} className="border-border opacity-75">
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
                      <Card key={booking.id} className="border-border">
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
        </motion.section>

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
            fetchData();
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
            fetchBookingRequests();
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
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                      className="flex items-start gap-3 p-3 border border-rule rounded-lg hover:border-accent/50 hover:shadow-sm transition-all"
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
        </motion.section>

        {/* 4. Opportunity Hub */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
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
                <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border border-primary/30">
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

                <div className="p-3 bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg border border-accent/30">
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
                <div className="p-4 bg-gradient-to-r from-green-500/20 via-green-500/10 to-green-500/5 rounded-lg border border-green-500/30">
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
        </motion.section>

        {/* 5. Action Queue */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
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
        </motion.section>
      </div>
    </div>
  );
};

export default SellerDashboard;
