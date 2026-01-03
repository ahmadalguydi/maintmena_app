import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { EnhancedRequestCard } from '@/components/mobile/EnhancedRequestCard';
import { EnhancedBookingCard } from '@/components/mobile/EnhancedBookingCard';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { Heading2, Body, BodySmall, Label } from '@/components/mobile/Typography';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { History } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RequestsListProps {
  currentLanguage: 'en' | 'ar';
}

export const RequestsList = ({ currentLanguage }: RequestsListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState<'requests' | 'bookings'>('requests');
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);
  const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);

  // Fetch maintenance requests
  const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['buyer-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          quote_submissions(id, status, price)
        `)
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user
  });

  // Fetch booking requests with seller data (two-step fetch pattern)
  const { data: bookings = [], isLoading: bookingsLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['buyer-bookings'],
    queryFn: async () => {

      // Step 1: Fetch bookings without profile join
      const { data: bookingData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[RequestsList] Booking query error:', error);
        throw error;
      }

      // Step 2: Fetch seller profiles separately
      if (bookingData && bookingData.length > 0) {
        const sellerIds = [...new Set(bookingData.map(b => b.seller_id))];

        const { data: sellerProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, avatar_seed, seller_rating, completed_projects')
          .in('id', sellerIds);

        if (profileError) {
          console.error('[RequestsList] Profile query error:', profileError);
        }

        // Step 3: Fetch contracts for these bookings
        const bookingIds = bookingData.map(b => b.id);
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, booking_id, signed_at_buyer, signed_at_seller, status')
          .in('booking_id', bookingIds);

        const contractMap = new Map(contractsData?.map(c => [c.booking_id, c]) || []);

        // Step 4: Merge profiles and contracts into bookings
        const profileMap = new Map(sellerProfiles?.map(p => [p.id, p]) || []);
        const mergedBookings = bookingData.map(b => ({
          ...b,
          seller: profileMap.get(b.seller_id) || null,
          contract: contractMap.get(b.id) || null
        }));
        return mergedBookings;
      }

      return bookingData || [];
    },
    enabled: !!user
  });

  // Real-time updates
  useRealtime({
    table: 'quote_submissions',
    event: '*',
    invalidateQueries: ['buyer-requests']
  });

  useRealtime({
    table: 'booking_requests',
    event: '*',
    invalidateQueries: ['buyer-bookings']
  });

  // Pull to refresh
  usePullToRefresh({
    onRefresh: async () => {
      if (activeMainTab === 'requests') {
        await refetchRequests();
      } else {
        await refetchBookings();
      }
    }
  });

  const content = {
    en: {
      title: 'My Requests & Bookings',
      requests: 'My Requests',
      bookings: 'My Bookings',
      history: 'History',
      open: 'Open',
      inReview: 'In Review',
      sent: 'Sent',
      reviewed: 'Reviewed',
      scheduled: 'Scheduled',
      quotes: 'quotes',
      budget: 'Budget',
      location: 'Location',
      urgency: 'Urgency',
      date: 'Date',
      noRequests: 'No requests yet',
      noBookings: 'No bookings yet',
      startPosting: 'Start by posting a request',
      startBooking: 'Start by booking a service'
    },
    ar: {
      title: 'طلباتي وحجوزاتي',
      requests: 'طلباتي',
      bookings: 'حجوزاتي',
      history: 'السجل',
      open: 'مفتوح',
      inReview: 'قيد المراجعة',
      sent: 'مرسل',
      reviewed: 'تمت المراجعة',
      scheduled: 'مجدول',
      quotes: 'عروض',
      budget: 'الميزانية',
      location: 'الموقع',
      urgency: 'الأهمية',
      date: 'التاريخ',
      noRequests: 'لا توجد طلبات بعد',
      noBookings: 'لا توجد حجوزات بعد',
      startPosting: 'ابدأ بنشر طلب',
      startBooking: 'ابدأ بحجز خدمة'
    }
  };

  const t = content[currentLanguage];

  const handleDeleteRequest = async () => {
    if (!deleteRequestId) return;

    const { error } = await supabase
      .from('maintenance_requests')
      .delete()
      .eq('id', deleteRequestId);

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل حذف الطلب' : 'Failed to delete request');
    } else {
      toast.success(currentLanguage === 'ar' ? 'تم حذف الطلب بنجاح' : 'Request deleted successfully');
      refetchRequests();
    }
    setDeleteRequestId(null);
  };

  const handleDeleteBooking = async () => {
    if (!deleteBookingId) return;

    const { error } = await supabase
      .from('booking_requests')
      .delete()
      .eq('id', deleteBookingId);

    if (error) {
      toast.error(currentLanguage === 'ar' ? 'فشل حذف الحجز' : 'Failed to delete booking');
    } else {
      toast.success(currentLanguage === 'ar' ? 'تم حذف الحجز بنجاح' : 'Booking deleted successfully');
      refetchBookings();
    }
    setDeleteBookingId(null);
  };

  const getRequestStatus = (request: any): 'open' | 'in_review' => {
    // Check if buyer has engaged with any quote (in review)
    const hasNegotiatingQuote = request.quote_submissions?.some((q: any) => q.status === 'negotiating');
    if (hasNegotiatingQuote) return 'in_review';

    // Otherwise it's open
    return 'open';
  };

  const getBookingStatus = (booking: any): 'sent' | 'reviewed' => {
    if (booking.seller_response || booking.status === 'counter_proposed') return 'reviewed';
    return 'sent';
  };

  // Filter out requests that have become active jobs (contract executed = status is in_progress)
  // Requests should still show even if quote is accepted, until seller signs and contract is executed
  const hasExecutedContract = (request: any) => request.status === 'in_progress';

  const groupedRequests = {
    open: requests.filter(r => getRequestStatus(r) === 'open' && r.status !== 'in_progress' && r.status !== 'completed' && !r.buyer_marked_complete && !hasExecutedContract(r)),
    in_review: requests.filter(r => getRequestStatus(r) === 'in_review' && r.status !== 'completed' && !r.buyer_marked_complete && !hasExecutedContract(r))
  };

  const groupedBookings = {
    sent: bookings.filter(b => getBookingStatus(b) === 'sent' && b.status !== 'accepted' && b.status !== 'completed' && b.status !== 'declined' && !b.buyer_marked_complete),
    reviewed: bookings.filter(b => getBookingStatus(b) === 'reviewed' && b.status !== 'accepted' && b.status !== 'completed' && b.status !== 'declined' && !b.buyer_marked_complete)
  };

  // Get quotes for a specific request
  const getRequestQuotes = (requestId: string) => {
    return requests?.find(r => r.id === requestId)?.quote_submissions || [];
  };

  const SectionDivider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      <Label lang={currentLanguage} className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </Label>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );

  const isLoading = activeMainTab === 'requests' ? requestsLoading : bookingsLoading;

  return (
    <motion.div
      className="pb-28 min-h-screen bg-background"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h1 className={cn("text-2xl font-bold", currentLanguage === 'ar' ? 'font-ar-display' : 'font-display')}>
          {t.title}
        </h1>
        <button
          onClick={() => navigate('/app/buyer/history')}
          className="text-sm font-semibold text-primary px-3 py-2 rounded-full hover:bg-primary/10 transition-colors flex items-center gap-2"
        >
          <History className="w-4 h-4" />
          {t.history}
        </button>
      </div>

      {/* Main Tabs */}
      <div className="px-6 pt-6">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-full">
          <button
            onClick={() => setActiveMainTab('requests')}
            className={cn(
              "flex-1 h-12 rounded-full font-medium transition-all duration-300",
              activeMainTab === 'requests'
                ? "bg-gradient-to-r from-accent to-primary text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Body lang={currentLanguage} className={cn(activeMainTab === 'requests' && "!text-white")}>
              {t.requests}
            </Body>
          </button>
          <button
            onClick={() => setActiveMainTab('bookings')}
            className={cn(
              "flex-1 h-12 rounded-full font-medium transition-all duration-300",
              activeMainTab === 'bookings'
                ? "bg-gradient-to-r from-accent to-primary text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Body lang={currentLanguage} className={cn(activeMainTab === 'bookings' && "!text-white")}>
              {t.bookings}
            </Body>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-2">
        {isLoading ? (
          <>
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
          </>
        ) : activeMainTab === 'requests' ? (
          <>
            {groupedRequests.open.length === 0 && groupedRequests.in_review.length === 0 ? (
              <div className="py-20 text-center">
                <BodySmall lang={currentLanguage} className="text-muted-foreground">{t.noRequests}</BodySmall>
                <BodySmall lang={currentLanguage} className="text-muted-foreground mt-2">{t.startPosting}</BodySmall>
              </div>
            ) : (
              <>
                {groupedRequests.in_review.length > 0 && (
                  <>
                    <SectionDivider label={t.inReview} />
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {groupedRequests.in_review.map((request: any) => {
                        const status = getRequestStatus(request);
                        return (
                          <EnhancedRequestCard
                            key={request.id}
                            request={request}
                            quotes={getRequestQuotes(request.id)}
                            currentLanguage={currentLanguage}
                            status={status}
                            onClick={() => navigate(`/app/buyer/request/${request.id}`)}
                            onDelete={() => setDeleteRequestId(request.id)}
                          />
                        );
                      })}
                    </motion.div>
                  </>
                )}

                {groupedRequests.open.length > 0 && (
                  <>
                    <SectionDivider label={t.open} />
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="space-y-2"
                    >
                      {groupedRequests.open.map((request: any) => {
                        const status = getRequestStatus(request);
                        return (
                          <EnhancedRequestCard
                            key={request.id}
                            request={request}
                            quotes={getRequestQuotes(request.id)}
                            currentLanguage={currentLanguage}
                            status={status}
                            onClick={() => navigate(`/app/buyer/request/${request.id}`)}
                            onDelete={() => setDeleteRequestId(request.id)}
                            onEdit={() => navigate(`/app/buyer/request/${request.id}/edit`)}
                          />
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {groupedBookings.sent.length === 0 && groupedBookings.reviewed.length === 0 ? (
              <div className="py-20 text-center">
                <BodySmall lang={currentLanguage} className="text-muted-foreground">{t.noBookings}</BodySmall>
                <BodySmall lang={currentLanguage} className="text-muted-foreground mt-2">{t.startBooking}</BodySmall>
              </div>
            ) : (
              <>
                {groupedBookings.reviewed.length > 0 && (
                  <>
                    <SectionDivider label={t.reviewed} />
                    {groupedBookings.reviewed.map((booking: any) => (
                      <EnhancedBookingCard
                        key={booking.id}
                        booking={booking}
                        seller={booking.seller}
                        contract={booking.contract}
                        currentLanguage={currentLanguage}
                        viewerRole="buyer"
                        onClick={() => navigate(`/app/buyer/booking/${booking.id}`)}
                        onAccept={() => navigate(`/app/buyer/booking/${booking.id}`)}
                        onDelete={() => setDeleteBookingId(booking.id)}
                        onMessage={() => navigate(`/app/messages/thread?booking=${booking.id}`)}
                      />
                    ))}
                  </>
                )}

                {groupedBookings.sent.length > 0 && (
                  <>
                    <SectionDivider label={t.sent} />
                    {groupedBookings.sent.map((booking: any) => (
                      <EnhancedBookingCard
                        key={booking.id}
                        booking={booking}
                        seller={booking.seller}
                        contract={booking.contract}
                        currentLanguage={currentLanguage}
                        viewerRole="buyer"
                        onClick={() => navigate(`/app/buyer/booking/${booking.id}`)}
                        onAccept={() => navigate(`/app/buyer/booking/${booking.id}`)}
                        onDelete={() => setDeleteBookingId(booking.id)}
                        onMessage={() => navigate(`/app/messages/thread?booking=${booking.id}`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'}>
              {currentLanguage === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
              {currentLanguage === 'ar'
                ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this request? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className={cn("bg-destructive hover:bg-destructive/90", currentLanguage === 'ar' ? 'font-ar-body' : '')}
            >
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Booking Confirmation Dialog */}
      <AlertDialog open={!!deleteBookingId} onOpenChange={() => setDeleteBookingId(null)}>
        <AlertDialogContent dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={currentLanguage === 'ar' ? 'font-ar-display' : 'font-display'}>
              {currentLanguage === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}
            </AlertDialogTitle>
            <AlertDialogDescription className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
              {currentLanguage === 'ar'
                ? 'هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'Are you sure you want to delete this booking? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={currentLanguage === 'ar' ? 'font-ar-body' : ''}>
              {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className={cn("bg-destructive hover:bg-destructive/90", currentLanguage === 'ar' ? 'font-ar-body' : '')}
            >
              {currentLanguage === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div >
  );
};
