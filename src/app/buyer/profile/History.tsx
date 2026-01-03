import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { StatusPill } from '@/components/mobile/StatusPill';
import { LoadingShimmer } from '@/components/LoadingShimmer';
import { Button } from '@/components/ui/button';
import { Heading3, Body, BodySmall, Label } from '@/components/mobile/Typography';
import { CheckCircle, XCircle, MapPin, Calendar, DollarSign, Star, Image, Shield, Edit } from 'lucide-react';
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

  // Fetch ALL history items (Fetch everything and filter client-side to ensure nothing is missed)
  const { data: allHistoryItems = { completed: [], rejected: [] }, isLoading } = useQuery({
    queryKey: ['buyer-history-all-v4'],
    queryFn: async () => {
      // 1. Fetch ALL requests for this buyer
      // 1. Fetch ALL requests for this buyer (NO JOINS)
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      // 2. Fetch ALL bookings for this buyer (NO JOINS)
      const { data: bookings } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false });

      // 3. Fetch ALL contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, status, request_id, booking_id')
        .eq('buyer_id', user?.id);

      // Create maps for quick lookup
      const contractByRequestId = new Map(contracts?.filter(c => c.request_id).map(c => [c.request_id, c]) || []);
      const contractByBookingId = new Map(contracts?.filter(c => c.booking_id).map(c => [c.booking_id, c]) || []);

      // 4. Fetch Reviews
      const { data: reviews } = await supabase
        .from('seller_reviews')
        .select('*')
        .eq('buyer_id', user?.id);

      const reviewMap = new Map(reviews?.map(r => [r.request_id, r]) || []);
      const reviewByContractId = new Map(reviews?.filter((r: any) => r.contract_id).map((r: any) => [r.contract_id, r]) || []);

      // 5. Gather Seller IDs for Bulk Fetch
      const sellerIds = new Set<string>();
      requests?.forEach(r => { if (r.assigned_seller_id) sellerIds.add(r.assigned_seller_id); });
      bookings?.forEach(b => { if (b.seller_id) sellerIds.add(b.seller_id); });

      // 6. Fetch Profiles
      let profileMap = new Map();
      if (sellerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', Array.from(sellerIds));

        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      // 7. Process Contracts and Join Data
      // Process Requests
      const processedRequests = (requests || []).map(r => {
        const contract = contractByRequestId.get(r.id);
        const sellerProfile = r.assigned_seller_id ? profileMap.get(r.assigned_seller_id) : null;

        // Determine status category
        let isCompleted = false;
        let isRejected = false;
        let waitingForSeller = false;

        // Completion logic:
        if (['completed', 'closed'].includes(r.status)) isCompleted = true;
        else if (r.buyer_marked_complete) {
          isCompleted = true;
          if (!r.seller_marked_complete && r.status !== 'completed' && r.status !== 'closed') {
            waitingForSeller = true;
          }
        }
        else if (contract && ['completed', 'fully_executed', 'signed'].includes(contract.status)) {
          if (contract.status === 'completed') isCompleted = true;
        }

        // Rejection/Cancellation logic:
        if (['cancelled', 'rejected', 'declined'].includes(r.status)) isRejected = true;

        return {
          ...r,
          type: 'request',
          review: reviewMap.get(r.id) || (contract?.id ? reviewByContractId.get(contract.id) : null),
          contract_id: contract?.id,
          waiting_for_seller: waitingForSeller,
          category: isCompleted ? 'completed' : (isRejected ? 'rejected' : 'active'),
          profiles: sellerProfile // Attach manually joined profile
        };
      });

      // Process Bookings
      const processedBookings = (bookings || []).map(b => {
        const contract = contractByBookingId.get(b.id);
        const sellerProfile = b.seller_id ? profileMap.get(b.seller_id) : null;

        let isCompleted = false;
        let isRejected = false;
        let waitingForSeller = false;

        if (['completed', 'closed'].includes(b.status)) isCompleted = true;
        else if (b.buyer_marked_complete) {
          isCompleted = true;
          if (!b.seller_marked_complete && b.status !== 'completed') {
            waitingForSeller = true;
          }
        }

        if (['cancelled', 'rejected', 'declined'].includes(b.status)) isRejected = true;

        return {
          ...b,
          type: 'booking',
          review: (contract?.id ? reviewByContractId.get(contract.id) : null) || (contract?.request_id ? reviewMap.get(contract.request_id) : null),
          contract_id: contract?.id,
          waiting_for_seller: waitingForSeller,
          category: isCompleted ? 'completed' : (isRejected ? 'rejected' : 'active'),
          profiles: sellerProfile // Attach manually joined profile
        };
      });

      // 8. Fetch quotes (only for rejected items logic which is specific)
      // Rejected/Cancelled quotes logic remains similar but integrated
      const { data: rejectedQuotes } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(title, title_ar, city, budget, buyer_id)')
        .eq('status', 'rejected')
        .order('updated_at', { ascending: false });

      const buyerRejectedQuotes = (rejectedQuotes || [])
        .filter(quote => quote.maintenance_requests?.buyer_id === user?.id)
        .map(quote => ({ ...quote, type: 'quote', expired: false, category: 'rejected' }));

      // Expired quotes logic
      const { data: expiredQuotes } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(title, title_ar, city, budget, buyer_id, status)')
        .in('status', ['pending', 'negotiating'])
        .order('updated_at', { ascending: false });

      const buyerExpiredQuotes: any[] = [];
      if (expiredQuotes) {
        for (const quote of expiredQuotes) {
          if (quote.maintenance_requests?.buyer_id !== user?.id) continue;
          const { data: acceptedQuotes } = await supabase
            .from('quote_submissions')
            .select('id')
            .eq('request_id', quote.request_id)
            .eq('status', 'accepted')
            .neq('id', quote.id)
            .limit(1);

          if (acceptedQuotes && acceptedQuotes.length > 0) {
            buyerExpiredQuotes.push({ ...quote, type: 'quote', expired: true, category: 'rejected' });
          }
        }
      }

      // Combine and filter
      const allItems = [...processedRequests, ...processedBookings];

      const completedItems = allItems.filter(i => i.category === 'completed').sort((a, b) =>
        new Date(b.buyer_completion_date || b.updated_at).getTime() - new Date(a.buyer_completion_date || a.updated_at).getTime()
      );

      const rejectedItemsList = [
        ...allItems.filter(i => i.category === 'rejected'),
        ...buyerRejectedQuotes,
        ...buyerExpiredQuotes
      ].sort((a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return {
        completed: completedItems,
        rejected: rejectedItemsList
      };
    },
    enabled: !!user
  });

  // Use the new consolidated data
  const items = activeTab === 'completed' ? allHistoryItems.completed : allHistoryItems.rejected;

  const content = {
    en: {
      title: 'History',
      completed: 'Completed',
      rejected: 'Rejected',
      expired: 'Expired',
      completedOn: 'Completed on',
      rejectedOn: 'Rejected on',
      expiredOn: 'Expired on',
      noCompleted: 'No completed jobs yet',
      noRejected: 'No rejected items',
      seller: 'Service Provider',
      yourReview: 'Your Review',
      editReview: 'Edit Review',
      leaveReview: 'Leave Review',
      photos: 'Proof Photos',
      warranty: 'Warranty',
      warrantyActive: 'Active',
      warrantyExpired: 'Expired',
      viewPhotos: 'View Photos'
    },
    ar: {
      title: 'السجل',
      completed: 'مكتمل',
      rejected: 'مرفوض',
      expired: 'منتهي',
      completedOn: 'اكتمل في',
      rejectedOn: 'رفض في',
      expiredOn: 'انتهى في',
      noCompleted: 'لا توجد أعمال مكتملة بعد',
      noRejected: 'لا توجد عناصر مرفوضة',
      seller: 'مقدم الخدمة',
      yourReview: 'تقييمك',
      editReview: 'تعديل التقييم',
      leaveReview: 'ترك تقييم',
      photos: 'صور العمل',
      warranty: 'الضمان',
      warrantyActive: 'نشط',
      warrantyExpired: 'منتهي',
      viewPhotos: 'عرض الصور'
    }
  };

  const t = content[currentLanguage];

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} onBack={() => navigate(-1)} />

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
            const isQuote = item.type === 'quote';
            const isClosedRequest = item.type === 'closed_request';
            const completionPhotos = item.completion_photos || [];
            const warrantyActive = item.warranty_expires_at && new Date(item.warranty_expires_at) > new Date();

            const handleCardClick = () => {
              if (isQuote) {
                // If it's a quote, maybe go to quote detail or request detail?
                // Usually buyer wants to see the request context
                navigate(`/app/buyer/request/${item.request_id}`);
              } else if (isBooking) {
                // Bookings (Jobs) go to job detail
                // If rejected, go to booking detail to see reason
                if (item.category === 'rejected' || activeTab === 'rejected') {
                  navigate(`/app/buyer/booking/${item.id}`);
                } else {
                  navigate(`/app/buyer/job/${item.id}`);
                }
              } else if (isRequest) {
                // Requests go to request detail
                navigate(`/app/buyer/request/${item.id}`);
              }
            };

            return (
              <div onClick={handleCardClick} className="cursor-pointer transition-transform active:scale-[0.98]">
                <SoftCard key={item.id}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Heading3 lang={currentLanguage} className="flex-1 line-clamp-2">
                        {isQuote
                          ? (currentLanguage === 'ar' && item.maintenance_requests?.title_ar
                            ? item.maintenance_requests.title_ar
                            : item.maintenance_requests?.title)
                          : isBooking
                            ? (currentLanguage === 'ar'
                              ? `حجز مع ${(item.profiles as any)?.company_name || (item.profiles as any)?.full_name || 'البائع'}`
                              : `Booking with ${(item.profiles as any)?.company_name || (item.profiles as any)?.full_name || 'Seller'}`)
                            : (currentLanguage === 'ar' && item.title_ar ? item.title_ar : item.title || item.service_category)}
                      </Heading3>
                      <div className="flex flex-col gap-1 items-end">
                        <StatusPill
                          status={
                            activeTab === 'completed'
                              ? (item.waiting_for_seller ? 'warning' : 'success')
                              : (item.expired === true ? 'warning' : 'error')
                          }
                          label={
                            activeTab === 'completed'
                              ? (item.waiting_for_seller ? (currentLanguage === 'ar' ? 'بانتظار البائع' : 'Waiting for Seller') : t.completed)
                              : (item.expired === true ? t.expired : (item.is_cancelled || item.status === 'cancelled' ? (currentLanguage === 'ar' ? 'ملغي' : 'Cancelled') : t.rejected))
                          }
                        />
                      </div>
                    </div>

                    {/* Seller Name */}
                    {(isRequest || isBooking) && item.profiles && (
                      <BodySmall lang={currentLanguage} className="text-muted-foreground">
                        {t.seller}: {(item.profiles as any).company_name || (item.profiles as any).full_name}
                      </BodySmall>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {(item.city || item.location_city) && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                          <BodySmall lang={currentLanguage} className="text-muted-foreground truncate">
                            {item.city || item.location_city}
                          </BodySmall>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground">
                          {activeTab === 'completed'
                            ? (item.waiting_for_seller ? (currentLanguage === 'ar' ? 'تم الانتهاء:' : 'Action taken:') : t.completedOn)
                            : (item.expired === true ? t.expiredOn : (item.is_cancelled ? (currentLanguage === 'ar' ? 'ألغيت في' : 'Cancelled on') : t.rejectedOn))}:{' '}
                          {new Date(
                            activeTab === 'completed'
                              ? item.buyer_completion_date || item.completed_at || item.updated_at
                              : item.updated_at
                          ).toLocaleDateString()}
                        </BodySmall>
                      </div>
                    </div>

                    {/* Price */}
                    {(item.budget || item.final_amount || item.final_agreed_price || item.price) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <DollarSign size={16} className="text-primary" />
                        <BodySmall lang={currentLanguage} className="font-semibold text-primary">
                          {formatAmount(item.final_agreed_price || item.budget || item.final_amount || item.price)}
                        </BodySmall>
                      </div>
                    )}

                    {/* Review Section - only for completed jobs */}
                    {activeTab === 'completed' && item.review && (
                      <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                            <BodySmall lang={currentLanguage} className="font-medium">{t.yourReview}</BodySmall>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={star <= item.review.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}
                                />
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/app/buyer/review/${item.id}?type=${item.type}&seller=${item.assigned_seller_id || item.seller_id}&reviewId=${item.review.id}&edit=true&contract=${item.contract_id || ''}`);
                            }}
                          >
                            <Edit size={12} className="mr-1" />
                            {t.editReview}
                          </Button>
                        </div>
                        {item.review.review_text && (
                          <BodySmall lang={currentLanguage} className="text-muted-foreground line-clamp-2">
                            "{item.review.review_text}"
                          </BodySmall>
                        )}
                      </div>
                    )}

                    {/* Leave Review Button - if no review yet */}
                    {activeTab === 'completed' && !item.review && (isRequest || isBooking) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/app/buyer/review/${item.id}?type=${item.type}&seller=${item.assigned_seller_id || item.seller_id}&contract=${item.contract_id || ''}`);
                        }}
                      >
                        <Star size={14} className="mr-2" />
                        {t.leaveReview}
                      </Button>
                    )}

                    {/* Proof Photos - only for completed jobs */}
                    {activeTab === 'completed' && completionPhotos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Image size={14} className="text-muted-foreground" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground">
                          {t.photos}: {completionPhotos.length}
                        </BodySmall>
                        <div className="flex -space-x-2">
                          {completionPhotos.slice(0, 3).map((photo: string, idx: number) => (
                            <img
                              key={idx}
                              src={photo}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border-2 border-background"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warranty Status - only for completed jobs */}
                    {activeTab === 'completed' && item.warranty_activated_at && (
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit",
                        warrantyActive
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Shield size={12} />
                        {t.warranty}: {warrantyActive ? t.warrantyActive : t.warrantyExpired}
                      </div>
                    )}
                  </div>
                </SoftCard>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};