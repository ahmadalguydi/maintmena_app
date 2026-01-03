import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { EnhancedQuoteCard } from '@/components/mobile/EnhancedQuoteCard';
import { EnhancedBookingCard } from '@/components/mobile/EnhancedBookingCard';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/mobile/EmptyState';
import { Button } from '@/components/ui/button';
import { Inbox, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { Label } from '@/components/mobile/Typography';
import { cn } from '@/lib/utils';

interface MyQuotesProps {
  currentLanguage: 'en' | 'ar';
}

export const MyQuotes = ({ currentLanguage }: MyQuotesProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [mainTab, setMainTab] = useState<'quotes' | 'bookings'>('quotes');

  // Fetch seller's quotes  
  const { data: quotes, isLoading: quotesLoading } = useQuery({
    queryKey: ['seller-quotes', user?.id],
    queryFn: async () => {
      const { data: quotesData, error } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(title, title_ar, city, budget, category, status)')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!quotesData) return [];

      // Filter out quotes where the associated request is completed/closed
      let filteredQuotes = quotesData.filter(q =>
        q.maintenance_requests?.status !== 'completed' &&
        q.maintenance_requests?.status !== 'closed' &&
        q.maintenance_requests?.status !== 'in_progress'
      );

      // Fetch contracts for ALL quotes to show proper status
      const quoteIds = filteredQuotes.map(q => q.id);
      let contractsMap = new Map<string, { id: string; status: string }>();

      if (quoteIds.length > 0) {
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('id, quote_id, status')
          .in('quote_id', quoteIds);

        if (contractsData) {
          contractsData.forEach(c => {
            if (c.quote_id) {
              contractsMap.set(c.quote_id, { id: c.id, status: c.status });
            }
          });
        }

        // Filter out quotes that have executed contracts (those are now active jobs, should be hidden)
        const quotesWithExecutedContract = new Set(
          contractsData?.filter(c => c.status === 'executed').map(c => c.quote_id) || []
        );

        filteredQuotes = filteredQuotes.filter(q =>
          !quotesWithExecutedContract.has(q.id)
        );
      }

      // Attach contract data to each quote
      return filteredQuotes.map(q => ({
        ...q,
        contract: contractsMap.get(q.id) || null
      }));
    },
    enabled: !!user
  });

  // Fetch seller's bookings with contracts
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['seller-bookings', user?.id],
    queryFn: async () => {
      const { data: bookingsData, error } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!bookingsData?.length) return [];

      const buyerIds = [...new Set(bookingsData.map(b => b.buyer_id).filter(Boolean))];
      const bookingIds = bookingsData.map(b => b.id);

      // Fetch buyer profiles
      let profilesData: any[] = [];
      if (buyerIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .in('id', buyerIds);
        profilesData = data || [];
      }

      // Fetch contracts for these bookings
      const { data: contractsData } = await supabase
        .from('contracts')
        .select('*')
        .in('booking_id', bookingIds);

      // Filter out bookings that have executed contracts (active jobs)
      const bookingsWithExecutedContract = new Set(
        contractsData?.filter(c => c.status === 'executed' || c.status === 'completed').map(c => c.booking_id) || []
      );

      const filteredBookings = bookingsData.filter(b => !bookingsWithExecutedContract.has(b.id));

      return filteredBookings.map(booking => ({
        ...booking,
        profiles: profilesData.find(p => p.id === booking.buyer_id),
        contract: contractsData?.find(c => c.booking_id === booking.id)
      }));
    },
    enabled: !!user
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const quotesChannel = supabase
      .channel('seller-quotes-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quote_submissions',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seller-quotes', user.id] });
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('seller-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_requests',
          filter: `seller_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['seller-bookings', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [user, queryClient]);

  const content = {
    en: {
      title: 'My Quotes & Bookings',
      history: 'History',
      mainTabs: {
        quotes: 'My Quotes',
        bookings: 'My Bookings',
      },
      sections: {
        inReview: 'In Review',
        sent: 'Sent',
        reviewed: 'Reviewed'
      },
      empty: {
        quotes: 'No quotes yet',
        bookings: 'No bookings yet',
      }
    },
    ar: {
      title: 'عروض الأسعار والحجوزات',
      history: 'السجل',
      mainTabs: {
        quotes: 'عروض الأسعار',
        bookings: 'الحجوزات',
      },
      sections: {
        inReview: 'قيد المراجعة',
        sent: 'مرسل',
        reviewed: 'تمت المراجعة'
      },
      empty: {
        quotes: 'لا توجد عروض بعد',
        bookings: 'لا توجد حجوزات بعد',
      }
    }
  };

  const t = content[currentLanguage];

  const groupedQuotes = {
    inReview: quotes?.filter(q => q.status === 'negotiating' || q.status === 'accepted' || q.status === 'revision_requested') || [],
    sent: quotes?.filter(q => q.status === 'pending') || []
  };

  const groupedBookings = {
    reviewed: bookings?.filter(b => b.seller_response || b.seller_counter_proposal) || [],
    sent: bookings?.filter(b => !b.seller_response && !b.seller_counter_proposal) || []
  };

  const getStatusType = (status: string): 'success' | 'warning' | 'error' | 'info' | 'pending' => {
    if (status === 'accepted') return 'success';
    if (status === 'rejected') return 'error';
    if (status === 'negotiating') return 'info';
    if (status === 'revision_requested') return 'warning';
    return 'pending';
  };

  // Get all quotes for a request
  const getRequestAllQuotes = (requestId: string) => {
    return quotes?.filter(q => q.request_id === requestId) || [];
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

  if (quotesLoading || bookingsLoading) {
    return (
      <div className="pb-20 p-4 space-y-4" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl p-4 border border-border/30">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-2/3 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-4 w-1/3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const mainTabs = [
    { value: 'quotes', label: t.mainTabs.quotes },
    { value: 'bookings', label: t.mainTabs.bookings }
  ];

  return (
    <div className="pb-20" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header with History button */}
      <div className="bg-background px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">{t.title}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/app/seller/history')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            {t.history}
          </Button>
        </div>

        {/* Main Tabs: Quotes vs Bookings */}
        <div className="bg-muted/30 rounded-full p-1 flex gap-1">
          {mainTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setMainTab(tab.value as 'quotes' | 'bookings')}
              className="relative flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
            >
              {mainTab === tab.value && (
                <motion.div
                  layoutId="mainTab"
                  className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/90 rounded-full shadow-sm"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className={`relative z-10 ${mainTab === tab.value ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-4">
        {mainTab === 'quotes' ? (
          <>
            {groupedQuotes.inReview.length === 0 && groupedQuotes.sent.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t.empty.quotes}
                description=""
                actionLabel={currentLanguage === 'ar' ? 'تصفح الفرص' : 'Browse Jobs'}
                onAction={() => navigate('/app/seller/marketplace')}
              />
            ) : (
              <>
                {groupedQuotes.inReview.length > 0 && (
                  <>
                    <SectionDivider label={t.sections.inReview} />
                    {groupedQuotes.inReview.map((quote: any) => (
                      <EnhancedQuoteCard
                        key={quote.id}
                        quote={quote}
                        request={quote.maintenance_requests || {}}
                        allQuotes={getRequestAllQuotes(quote.request_id)}
                        contract={quote.contract}
                        currentLanguage={currentLanguage}
                        onClick={() => navigate(`/app/seller/quote/${quote.id}`)}
                        onEdit={() => navigate(`/app/seller/quote/${quote.id}/edit`)}
                        onMessage={() => navigate(`/app/messages/thread?quote=${quote.id}`)}
                      />
                    ))}
                  </>
                )}

                {groupedQuotes.sent.length > 0 && (
                  <>
                    <SectionDivider label={t.sections.sent} />
                    {groupedQuotes.sent.map((quote: any) => (
                      <EnhancedQuoteCard
                        key={quote.id}
                        quote={quote}
                        request={quote.maintenance_requests || {}}
                        allQuotes={getRequestAllQuotes(quote.request_id)}
                        contract={quote.contract}
                        currentLanguage={currentLanguage}
                        onClick={() => navigate(`/app/seller/quote/${quote.id}`)}
                        onEdit={() => navigate(`/app/seller/quote/${quote.id}/edit`)}
                        onMessage={() => navigate(`/app/messages/thread?quote=${quote.id}`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {groupedBookings.reviewed.length === 0 && groupedBookings.sent.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t.empty.bookings}
                description=""
              />
            ) : (
              <>
                {groupedBookings.reviewed.length > 0 && (
                  <>
                    <SectionDivider label={t.sections.reviewed} />
                    {groupedBookings.reviewed.map((booking: any) => (
                      <EnhancedBookingCard
                        key={booking.id}
                        booking={booking}
                        seller={Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles}
                        contract={booking.contract}
                        currentLanguage={currentLanguage}
                        onClick={() => navigate(`/app/seller/booking/${booking.id}`)}
                        onAccept={() => navigate(`/app/seller/booking/${booking.id}?edit=true`)}
                      />
                    ))}
                  </>
                )}

                {groupedBookings.sent.length > 0 && (
                  <>
                    <SectionDivider label={t.sections.sent} />
                    {groupedBookings.sent.map((booking: any) => (
                      <EnhancedBookingCard
                        key={booking.id}
                        booking={booking}
                        seller={Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles}
                        contract={booking.contract}
                        currentLanguage={currentLanguage}
                        onClick={() => navigate(`/app/seller/booking/${booking.id}`)}
                        onAccept={() => navigate(`/app/seller/booking/${booking.id}?accept=true`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
