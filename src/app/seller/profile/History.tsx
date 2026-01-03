import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { StatusPill } from '@/components/mobile/StatusPill';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { CheckCircle, XCircle, MapPin, Calendar, DollarSign, Star, Camera, Shield } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface HistoryProps {
  currentLanguage: 'en' | 'ar';
}

export const History = ({ currentLanguage }: HistoryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<'completed' | 'rejected'>('completed');

  // Fetch ALL history items (similar to buyer's pattern - no joins, separate queries)
  const { data: allHistoryItems = { completed: [], rejected: [] }, isLoading } = useQuery({
    queryKey: ['seller-history-all-v2', user?.id],
    queryFn: async () => {
      // 1. Fetch ALL requests where seller was assigned
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('assigned_seller_id', user?.id)
        .order('created_at', { ascending: false });

      // 2. Fetch ALL bookings for this seller
      const { data: bookings } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      // 3. Fetch ALL contracts for this seller
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, status, request_id, booking_id, quote_id, metadata')
        .eq('seller_id', user?.id);

      // Create maps for quick lookup
      const contractByRequestId = new Map(contracts?.filter(c => c.request_id).map(c => [c.request_id, c]) || []);
      const contractByBookingId = new Map(contracts?.filter(c => c.booking_id).map(c => [c.booking_id, c]) || []);

      // 4. Fetch quotes for price info
      const quoteIds = contracts?.filter(c => c.quote_id).map(c => c.quote_id) || [];
      let quoteMap = new Map<string, any>();
      if (quoteIds.length > 0) {
        const { data: quotes } = await supabase
          .from('quote_submissions')
          .select('id, price')
          .in('id', quoteIds);
        quoteMap = new Map(quotes?.map(q => [q.id, q]) || []);
      }

      // 5. Fetch Reviews for this seller
      const { data: reviews } = await supabase
        .from('seller_reviews')
        .select('*')
        .eq('seller_id', user?.id);

      const reviewsByRequest = new Map(reviews?.map(r => [r.request_id, r]) || []);
      const reviewsByContractId = new Map(reviews?.filter((r: any) => r.contract_id).map((r: any) => [r.contract_id, r]) || []);

      // 6. Gather Buyer IDs for Bulk Fetch
      const buyerIds = new Set<string>();
      requests?.forEach(r => { if (r.buyer_id) buyerIds.add(r.buyer_id); });
      bookings?.forEach(b => { if (b.buyer_id) buyerIds.add(b.buyer_id); });

      // 7. Fetch Profiles
      let profileMap = new Map();
      if (buyerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', Array.from(buyerIds));

        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      // 8. Process Requests
      const processedRequests = (requests || []).map(r => {
        const contract = contractByRequestId.get(r.id);
        const buyerProfile = r.buyer_id ? profileMap.get(r.buyer_id) : null;
        const quote = contract?.quote_id ? quoteMap.get(contract.quote_id) : null;

        let isCompleted = false;
        let isRejected = false;

        // Completion logic
        if (['completed', 'closed'].includes(r.status)) isCompleted = true;
        else if (r.seller_marked_complete && r.buyer_marked_complete) isCompleted = true;
        else if (contract && contract.status === 'completed') isCompleted = true;

        // Rejection logic
        if (['cancelled', 'rejected', 'declined'].includes(r.status)) isRejected = true;

        // Price extraction: quote > contract metadata > budget
        const price = quote?.price || (contract?.metadata as any)?.final_price || r.budget || 0;

        return {
          ...r,
          type: 'request' as const,
          review: reviewsByRequest.get(r.id) || (contract?.id ? reviewsByContractId.get(contract.id) : null),
          contract_id: contract?.id,
          profiles: buyerProfile,
          calculated_price: price,
          category: isCompleted ? 'completed' : (isRejected ? 'rejected' : 'active')
        };
      });

      // 9. Process Bookings
      const processedBookings = (bookings || []).map(b => {
        const contract = contractByBookingId.get(b.id);
        const buyerProfile = b.buyer_id ? profileMap.get(b.buyer_id) : null;

        let isCompleted = false;
        let isRejected = false;

        // Completion logic
        if (['completed', 'closed'].includes(b.status)) isCompleted = true;
        else if (b.seller_marked_complete && b.buyer_marked_complete) isCompleted = true;
        else if (contract && contract.status === 'completed') isCompleted = true;

        // Rejection logic
        if (['cancelled', 'rejected', 'declined'].includes(b.status)) isRejected = true;

        // Price extraction
        const price = b.final_agreed_price || b.final_amount || (contract?.metadata as any)?.final_price || 0;

        return {
          ...b,
          type: 'booking' as const,
          review: (contract?.id ? reviewsByContractId.get(contract.id) : null),
          contract_id: contract?.id,
          profiles: buyerProfile,
          calculated_price: price,
          category: isCompleted ? 'completed' : (isRejected ? 'rejected' : 'active')
        };
      });

      // 10. Fetch rejected quotes separately (quotes that were rejected by buyer)
      const { data: rejectedQuotes } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(id, title, title_ar, city, budget, buyer_id)')
        .eq('seller_id', user?.id)
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false });

      // Fetch buyer profiles for rejected quotes
      const quoteBuyerIds = rejectedQuotes?.map(q => q.maintenance_requests?.buyer_id).filter(Boolean) || [];
      for (const buyerId of quoteBuyerIds) {
        if (buyerId && !profileMap.has(buyerId)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, company_name')
            .eq('id', buyerId)
            .maybeSingle();
          if (profile) profileMap.set(profile.id, profile);
        }
      }

      const processedRejectedQuotes = (rejectedQuotes || []).map(q => ({
        ...q,
        type: 'quote' as const,
        profiles: q.maintenance_requests?.buyer_id ? profileMap.get(q.maintenance_requests.buyer_id) : null,
        calculated_price: q.price,
        category: 'rejected' as const
      }));

      // Combine all items
      const allItems = [...processedRequests, ...processedBookings, ...processedRejectedQuotes];

      // Split into completed and rejected
      const completed = allItems
        .filter(item => item.category === 'completed')
        .sort((a: any, b: any) =>
          new Date(b.seller_completion_date || b.completed_at || b.updated_at).getTime() -
          new Date(a.seller_completion_date || a.completed_at || a.updated_at).getTime()
        );

      const rejected = allItems
        .filter(item => item.category === 'rejected')
        .sort((a: any, b: any) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );

      return { completed, rejected };
    },
    enabled: !!user
  });

  const content = {
    en: {
      title: 'History',
      completed: 'Completed',
      rejected: 'Rejected',
      completedOn: 'Completed on',
      rejectedOn: 'Rejected on',
      noCompleted: 'No completed jobs yet',
      noRejected: 'No rejected items',
      buyer: 'Client',
      totalEarnings: 'Total Earnings',
      review: 'Review',
      noReview: 'No review yet',
      proofPhotos: 'Proof Photos',
      warranty: 'Warranty',
      warrantyActive: 'Active',
      warrantyExpired: 'Expired',
      bookingWith: 'Booking with'
    },
    ar: {
      title: 'السجل',
      completed: 'مكتمل',
      rejected: 'مرفوض',
      completedOn: 'اكتمل في',
      rejectedOn: 'رفض في',
      noCompleted: 'لا توجد أعمال مكتملة بعد',
      noRejected: 'لا توجد عناصر مرفوضة',
      buyer: 'العميل',
      totalEarnings: 'إجمالي الأرباح',
      review: 'التقييم',
      noReview: 'لا يوجد تقييم بعد',
      proofPhotos: 'صور الإثبات',
      warranty: 'الضمان',
      warrantyActive: 'ساري',
      warrantyExpired: 'منتهي',
      bookingWith: 'حجز مع'
    }
  };

  const t = content[currentLanguage];
  const completedJobs = allHistoryItems.completed;
  const rejectedItems = allHistoryItems.rejected;
  const items = activeTab === 'completed' ? completedJobs : rejectedItems;

  // Calculate total earnings
  const totalEarnings = completedJobs.reduce((sum: number, job: any) => {
    return sum + (job.calculated_price || 0);
  }, 0);

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={cn(
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    );
  };

  // Get display title for item
  const getDisplayTitle = (item: any) => {
    const isBooking = item.type === 'booking';
    const isQuote = item.type === 'quote';
    const buyerName = item.profiles?.company_name || item.profiles?.full_name || (currentLanguage === 'ar' ? 'العميل' : 'Client');

    if (isBooking) {
      return `${t.bookingWith} ${buyerName}`;
    }
    if (isQuote) {
      return currentLanguage === 'ar' && item.maintenance_requests?.title_ar
        ? item.maintenance_requests.title_ar
        : item.maintenance_requests?.title || item.service_category;
    }
    // Request
    return currentLanguage === 'ar' && item.title_ar ? item.title_ar : item.title || item.service_category;
  };

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} onBack={() => navigate(-1)} />

      {/* Total Earnings Card */}
      {activeTab === 'completed' && completedJobs.length > 0 && (
        <div className="px-6 pt-6">
          <SoftCard className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <div className="text-center">
              <BodySmall lang={currentLanguage} className="text-muted-foreground mb-1">
                {t.totalEarnings}
              </BodySmall>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatAmount(totalEarnings, 'SAR')}
              </div>
            </div>
          </SoftCard>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-6">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-full">
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "flex-1 h-12 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2",
              activeTab === 'completed'
                ? "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CheckCircle size={16} />
            <Body lang={currentLanguage} className={cn(activeTab === 'completed' && "!text-white")}>
              {t.completed}
            </Body>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={cn(
              "flex-1 h-12 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2",
              activeTab === 'rejected'
                ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <XCircle size={16} />
            <Body lang={currentLanguage} className={cn(activeTab === 'rejected' && "!text-white")}>
              {t.rejected}
            </Body>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6 space-y-3">
        {isLoading ? (
          <>
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
          </>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl opacity-20 mb-4">
              {activeTab === 'completed' ? '✅' : '❌'}
            </div>
            <BodySmall lang={currentLanguage} className="text-muted-foreground">
              {activeTab === 'completed' ? t.noCompleted : t.noRejected}
            </BodySmall>
          </div>
        ) : (
          items.map((item: any) => {
            const isBooking = item.type === 'booking';
            const isRequest = item.type === 'request';
            const hasReview = item.review;
            const hasCompletionPhotos = item.completion_photos && Array.isArray(item.completion_photos) && item.completion_photos.length > 0;
            const warrantyActive = item.warranty_expires_at && new Date(item.warranty_expires_at) > new Date();
            const price = item.calculated_price;

            return (
              <SoftCard key={item.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Heading3 lang={currentLanguage} className="flex-1 line-clamp-2">
                      {getDisplayTitle(item)}
                    </Heading3>
                    <StatusPill
                      status={activeTab === 'completed' ? 'success' : 'error'}
                      label={activeTab === 'completed' ? t.completed : t.rejected}
                    />
                  </div>

                  {/* Buyer Name (for non-booking items) */}
                  {!isBooking && item.profiles && (
                    <BodySmall lang={currentLanguage} className="text-muted-foreground">
                      {t.buyer}: {(item.profiles as any).company_name || (item.profiles as any).full_name}
                    </BodySmall>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {(item.city || item.location_city || item.maintenance_requests?.city) && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground truncate">
                          {item.city || item.location_city || item.maintenance_requests?.city}
                        </BodySmall>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
                      <BodySmall lang={currentLanguage} className="text-muted-foreground">
                        {activeTab === 'completed' ? t.completedOn : t.rejectedOn}:{' '}
                        {new Date(
                          activeTab === 'completed'
                            ? item.seller_completion_date || item.completed_at
                            : item.updated_at
                        ).toLocaleDateString()}
                      </BodySmall>
                    </div>
                  </div>

                  {/* Price */}
                  {price > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                      <DollarSign size={16} className="text-primary" />
                      <BodySmall lang={currentLanguage} className="font-semibold text-primary">
                        {formatAmount(price)}
                      </BodySmall>
                    </div>
                  )}

                  {/* Review Section (for completed jobs) */}
                  {activeTab === 'completed' && (
                    <div className="pt-2 border-t border-border/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-muted-foreground" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground font-medium">
                          {t.review}:
                        </BodySmall>
                        {hasReview ? (
                          <div className="flex items-center gap-2">
                            {renderStars(item.review.rating)}
                            <span className="text-sm font-medium">({item.review.rating}/5)</span>
                          </div>
                        ) : (
                          <BodySmall lang={currentLanguage} className="text-muted-foreground italic">
                            {t.noReview}
                          </BodySmall>
                        )}
                      </div>
                      {hasReview && item.review.review_text && (
                        <p className="text-sm text-muted-foreground italic pl-6">
                          "{item.review.review_text}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completion Photos */}
                  {activeTab === 'completed' && hasCompletionPhotos && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera size={14} className="text-muted-foreground" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground font-medium">
                          {t.proofPhotos}
                        </BodySmall>
                      </div>
                      <div className="flex gap-2 overflow-x-auto">
                        {item.completion_photos.slice(0, 4).map((photo: string, idx: number) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`Proof ${idx + 1}`}
                            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                          />
                        ))}
                        {item.completion_photos.length > 4 && (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium">+{item.completion_photos.length - 4}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warranty Status */}
                  {activeTab === 'completed' && item.warranty_expires_at && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className={warrantyActive ? 'text-green-500' : 'text-muted-foreground'} />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground font-medium">
                          {t.warranty}:
                        </BodySmall>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          warrantyActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {warrantyActive ? t.warrantyActive : t.warrantyExpired}
                        </span>
                        {warrantyActive && (
                          <BodySmall className="text-muted-foreground">
                            ({new Date(item.warranty_expires_at).toLocaleDateString()})
                          </BodySmall>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </SoftCard>
            );
          })
        )}
      </div>
    </div>
  );
};
