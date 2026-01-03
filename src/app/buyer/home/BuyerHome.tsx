import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, ArrowRight, Clock, PenTool } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getAllCategories, isAlphaEnabledCategory } from '@/lib/serviceCategories';
import { SoftCard } from '@/components/mobile/SoftCard';
import { SearchHero } from '@/components/mobile/SearchHero';
import { PromoBanner } from '@/components/mobile/PromoBanner';
import { CategoryCircle } from '@/components/mobile/CategoryCircle';
import { ActiveRequestCard } from '@/components/mobile/ActiveRequestCard';
import { Heading2, Body } from '@/components/mobile/Typography';
import { motion } from 'framer-motion';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { DualResolutionHaltedJobCard } from '@/components/mobile/DualResolutionHaltedJobCard';
import { cn } from '@/lib/utils';

interface BuyerHomeProps {
  currentLanguage: 'en' | 'ar';
}


// Fetch contracts awaiting seller signature - with robust filtering
async function fetchAwaitingSellerSignature(userId: string) {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        seller:profiles!contracts_seller_id_fkey(company_name, full_name, avatar_seed),
        quote:quote_submissions(id, price, estimated_duration, proposal, status),
        booking:booking_requests(id, final_agreed_price, job_description, service_category, status),
        maintenance_request:maintenance_requests(id, title, title_ar, status)
      `)
      .eq('buyer_id', userId)
      // Robust check: Buyer signed, Seller hasn't, and not cancelled/rejected
      .not('signed_at_buyer', 'is', null)
      .is('signed_at_seller', null)
      .neq('status', 'cancelled')
      .neq('status', 'rejected')
      .neq('status', 'terminated')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[BuyerHome] Error fetching awaiting seller contracts:', error);
      return [];
    }

    // Filter out contracts with invalid/rejected quotes or requests
    const validContracts = (data || []).filter((contract: any) => {
      const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;
      const booking = Array.isArray(contract.booking) ? contract.booking[0] : contract.booking;
      const request = contract.maintenance_request;

      // Skip if quote is rejected or doesn't exist
      if (contract.quote_id && (!quote || quote.status === 'rejected')) {
        console.log('[BuyerHome] Filtering out contract with rejected/missing quote:', contract.id);
        return false;
      }

      // Skip if booking is rejected/declined
      if (contract.booking_id && (!booking || booking.status === 'declined' || booking.status === 'cancelled')) {
        console.log('[BuyerHome] Filtering out contract with rejected/missing booking:', contract.id);
        return false;
      }

      // Skip if request is closed/deleted
      if (request && (request.status === 'closed' || request.status === 'deleted')) {
        console.log('[BuyerHome] Filtering out contract with closed/deleted request:', contract.id);
        return false;
      }

      return true;
    });

    console.log('[BuyerHome] Valid awaiting seller contracts:', validContracts.length);
    return validContracts;
  } catch (err) {
    console.error('[BuyerHome] Exception fetching awaiting seller contracts:', err);
    return [];
  }
}

async function fetchActiveRequests(userId: string) {
  const { data } = await supabase
    .from('maintenance_requests')
    .select('*, quote_submissions(status)')
    .eq('buyer_id', userId)
    .eq('status', 'open')
    .eq('halted', false)
    .order('created_at', { ascending: false })
    .limit(5);
  return data || [];
}

async function fetchActiveJobs(userId: string) {
  // Step 1: Fetch active maintenance requests
  const { data: activeRequestsRaw } = await supabase
    .from('maintenance_requests')
    .select('*, contracts(id)')
    .eq('buyer_id', userId)
    .eq('status', 'in_progress')
    .not('assigned_seller_id', 'is', null)
    .order('created_at', { ascending: false });

  // Step 2: Fetch seller profiles separately
  let activeRequestsData: any[] = [];
  if (activeRequestsRaw && activeRequestsRaw.length > 0) {
    const sellerIds = [...new Set(activeRequestsRaw.map((r: any) => r.assigned_seller_id).filter(Boolean))] as string[];
    if (sellerIds.length > 0) {
      const { data: sellerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .in('id', sellerIds);

      const profileMap = new Map(sellerProfiles?.map(p => [p.id, p]));
      activeRequestsData = activeRequestsRaw.map(r => ({
        ...r,
        contractId: r.contracts?.[0]?.id,
        profiles: profileMap.get(r.assigned_seller_id),
        jobType: 'request'
      }));
    }
  }

  // Fetch active booking requests by querying contracts with executed status
  const { data: executedBookingContracts } = await supabase
    .from('contracts')
    .select('booking_id, id, metadata')
    .eq('buyer_id', userId)
    .eq('status', 'executed')
    .not('booking_id', 'is', null);

  // Map contract IDs to bookings
  const bookingContractMap = new Map(executedBookingContracts?.map(c => [c.booking_id, c]));

  let activeBookingsData: any[] = [];
  if (executedBookingContracts && executedBookingContracts.length > 0) {
    const bookingIds = executedBookingContracts.map(c => c.booking_id).filter(Boolean);
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('booking_requests')
        .select('*')
        .in('id', bookingIds)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (bookings && bookings.length > 0) {
        const sellerIds = [...new Set(bookings.map(b => b.seller_id).filter(Boolean))];
        const { data: sellerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, company_name')
          .in('id', sellerIds);

        const profileMap = new Map(sellerProfiles?.map(p => [p.id, p]));
        activeBookingsData = bookings.map(b => {
          const contract = bookingContractMap.get(b.id) as any;
          const contractDate = contract?.metadata?.scheduled_date || contract?.metadata?.start_date;
          return {
            ...b,
            contractId: contract?.id,
            contract_date: contractDate,
            profiles: profileMap.get(b.seller_id),
            jobType: 'booking'
          };
        });
      }
    }
  }

  return [...(activeRequestsData || []), ...activeBookingsData];
}

export const BuyerHome = ({ currentLanguage: propLanguage }: BuyerHomeProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const currentLanguage = propLanguage || (localStorage.getItem('preferredLanguage') as 'en' | 'ar') || 'ar';

  // React Query with caching - staleTime prevents refetch, placeholderData keeps previous values

  const { data: activeRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['buyer-active-requests', user?.id],
    queryFn: () => fetchActiveRequests(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev ?? [],
  });

  const { data: activeJobs = [] } = useQuery({
    queryKey: ['buyer-active-jobs', user?.id],
    queryFn: () => fetchActiveJobs(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev ?? [],
  });

  // Contracts awaiting seller signature - always fetch fresh
  const { data: awaitingSellerContracts = [] } = useQuery({
    queryKey: ['buyer-awaiting-seller-signature', user?.id],
    queryFn: () => fetchAwaitingSellerSignature(user!.id),
    enabled: !!user,
    staleTime: 0, // Always refetch
    refetchOnMount: 'always',
  });

  const content = {
    ar: {
      searchPlaceholder: 'ابحث عن خدمة...',
      postRequest: 'انشر طلب',
      bookNow: 'احجز الآن',
      categories: 'فئات الخدمة',
      seeAll: 'عرض الكل',
      activeRequests: 'طلباتك النشطة',
      activeJobs: 'الأعمال النشطة',
      noActiveJobs: 'لا توجد أعمال نشطة',
      noActiveRequests: 'لا توجد طلبات نشطة',
      startRequest: 'ابدأ طلب جديد',
      emergency: 'تحتاج مساعدة عاجلة؟',
      emergencyDesc: 'احصل على استجابة سريعة من محترفين قريبين منك',
      getNow: 'احصل عليها الآن',
      trusted: 'محترفون موثوقون',
      trustedDesc: 'تواصل مع أفضل مقدمي الخدمات في منطقتك',
      transparent: 'أسعار شفافة',
      transparentDesc: 'قارن العروض واختر الأفضل لميزانيتك',
      awaitingSignature: 'في انتظار توقيع مقدم الخدمة',
      viewContract: 'عرض العقد'
    },
    en: {
      searchPlaceholder: 'Search for a service...',
      postRequest: 'Post Request',
      bookNow: 'Book Now',
      categories: 'Service Categories',
      seeAll: 'See all',
      activeRequests: 'Your Active Requests',
      activeJobs: 'Active Jobs',
      noActiveJobs: 'No active jobs',
      noActiveRequests: 'No active requests',
      startRequest: 'Start a new request',
      emergency: 'Need urgent help?',
      emergencyDesc: 'Get fast response from nearby professionals',
      getNow: 'Get Now',
      trusted: 'Trusted Professionals',
      trustedDesc: 'Connect with top-rated service providers in your area',
      transparent: 'Transparent Pricing',
      transparentDesc: 'Compare quotes and choose what fits your budget',
      awaitingSignature: "Waiting for seller's signature",
      viewContract: 'View Contract'
    }
  };

  const promoBanners = [
    {
      id: '1',
      title: content[currentLanguage].emergency,
      description: content[currentLanguage].emergencyDesc,
      ctaText: content[currentLanguage].getNow,
      ctaAction: () => navigate('/app/buyer/requests/new'),
      gradient: 'bg-gradient-to-br from-red-50 to-orange-50'
    },
    {
      id: '2',
      title: content[currentLanguage].trusted,
      description: content[currentLanguage].trustedDesc,
      ctaText: content[currentLanguage].seeAll,
      ctaAction: () => navigate('/app/buyer/explore'),
      gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      id: '3',
      title: content[currentLanguage].transparent,
      description: content[currentLanguage].transparentDesc,
      ctaText: content[currentLanguage].seeAll,
      ctaAction: () => navigate('/app/buyer/explore'),
      gradient: 'bg-gradient-to-br from-green-50 to-emerald-50'
    }
  ];

  return (
    <div
      className="pb-24 min-h-screen bg-background"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Content */}
      <div className="px-4 space-y-6 pt-4">

        {/* Contracts Awaiting Seller Signature */}
        {awaitingSellerContracts.map((contract: any) => {
          const sellerName = contract.seller?.company_name || contract.seller?.full_name || (currentLanguage === 'ar' ? 'مقدم الخدمة' : 'Seller');
          const quote = Array.isArray(contract.quote) ? contract.quote[0] : contract.quote;
          const booking = Array.isArray(contract.booking) ? contract.booking[0] : contract.booking;
          const isBooking = !!contract.booking_id && booking;

          // For requests: show request title
          const requestTitle = currentLanguage === 'ar'
            ? contract.maintenance_request?.title_ar || contract.maintenance_request?.title
            : contract.maintenance_request?.title;

          // For bookings: show "Booking with [provider]"
          const bookingTitle = currentLanguage === 'ar'
            ? `حجز مع ${sellerName}`
            : `Booking with ${sellerName}`;

          const title = isBooking ? bookingTitle : (requestTitle || (currentLanguage === 'ar' ? 'طلب خدمة' : 'Service Request'));
          const price = isBooking ? booking?.final_agreed_price : quote?.price;

          return (
            <SoftCard
              key={contract.id}
              onClick={() => navigate(`/app/buyer/contract/${contract.id}/sign`)}
              className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <PenTool className="w-3 h-3" />
                      {content[currentLanguage].awaitingSignature}
                    </span>
                  </div>
                  <h4 className={cn("font-semibold text-foreground text-sm truncate", currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {title}
                  </h4>
                  {!isBooking && (
                    <p className={cn("text-xs text-muted-foreground", currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                      {sellerName}
                    </p>
                  )}
                  <p className={cn("text-xs text-muted-foreground", currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {isBooking && booking?.proposed_start_date && `${new Date(booking.proposed_start_date).toLocaleDateString(currentLanguage === 'ar' ? 'ar-SA' : 'en-US')} • `}
                    {price ? `${price.toLocaleString()} ${currentLanguage === 'ar' ? 'ر.س' : 'SAR'}` : ''}
                  </p>
                  <button className={cn("text-xs text-primary font-medium mt-2", currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {content[currentLanguage].viewContract} →
                  </button>
                </div>
              </div>
            </SoftCard>
          );
        })}

        {/* Search Hero */}
        <motion.div
          animate={isSearchActive ? { opacity: 0, scale: 1.05 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <SearchHero
            layoutId="search-hero"
            currentLanguage={currentLanguage}
            placeholder={content[currentLanguage].searchPlaceholder}
            onSearch={(query) => {
              setIsSearchActive(true);
              setTimeout(() => {
                navigate('/app/buyer/explore', { state: { searchQuery: query, fromHome: true } });
              }, 200);
            }}
            onFilterClick={() => {
              setIsSearchActive(true);
              setTimeout(() => {
                navigate('/app/buyer/explore', { state: { openFilters: true, fromHome: true } });
              }, 200);
            }}
            onFocusClick={() => {
              setIsSearchActive(true);
              setTimeout(() => {
                navigate('/app/buyer/explore', { state: { fromHome: true } });
              }, 200);
            }}
          />
        </motion.div>

        {/* Active Jobs Section */}
        {activeJobs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <Heading2 lang={currentLanguage} className="text-lg">
                {content[currentLanguage].activeJobs}
              </Heading2>
            </div>
            <div className="space-y-4">
              {activeJobs.map((job) => {
                const isRequest = (job as any).jobType === 'request';
                const sellerName = isRequest
                  ? (job.profiles as any)?.company_name || (job.profiles as any)?.full_name
                  : (job.profiles as any)?.company_name || (job.profiles as any)?.full_name;

                if (job.halted) {
                  return (
                    <DualResolutionHaltedJobCard
                      key={job.id}
                      jobId={job.id}
                      jobType={isRequest ? 'request' : 'booking'}
                      currentLanguage={currentLanguage}
                      haltReason={job.halted_reason}
                      haltedAt={job.halted_at}
                      buyerId={job.buyer_id}
                      sellerId={isRequest ? job.assigned_seller_id : job.seller_id}
                      buyerApprovedResolution={job.buyer_approved_resolution || false}
                      sellerApprovedResolution={job.seller_approved_resolution || false}
                    />
                  );
                }

                return (
                  <JobTrackingCard
                    key={job.id}
                    jobId={job.id}
                    jobType={isRequest ? 'request' : 'booking'}
                    title={isRequest
                      ? (job.title || job.service_category || job.job_description || 'Job')
                      : (currentLanguage === 'ar' ? `حجز مع ${sellerName || 'مقدم الخدمة'}` : `Booking with ${sellerName || 'Service Provider'}`)
                    }
                    description={(job.description || job.job_description || '').replace(/\n?\[Flexible Time\]/gi, '').replace(/\n?\[وقت مرن\]/gi, '')}
                    currentLanguage={currentLanguage}
                    userRole="buyer"
                    status={job.status}
                    sellerOnWayAt={job.seller_on_way_at}
                    workStartedAt={job.work_started_at}
                    sellerMarkedComplete={job.seller_marked_complete || false}
                    buyerMarkedComplete={job.buyer_marked_complete || false}
                    sellerId={isRequest ? job.assigned_seller_id : job.seller_id}
                    sellerName={sellerName || 'Seller'}
                    paymentMethod={job.payment_method}
                    location={job.location || job.location_address || job.city || job.location_city}
                    date={job.contract_date || job.preferred_start_date || job.proposed_start_date || (currentLanguage === 'ar' ? 'موعد مرن' : 'Flexible Date')}
                    onClick={() => navigate(`/app/buyer/job/${job.id}?type=${isRequest ? 'request' : 'booking'}`)}
                    contractId={(job as any).contractId}
                    completionPhotos={Array.isArray(job.completion_photos) ? job.completion_photos as string[] : undefined}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Promo Banner Carousel */}
        <PromoBanner items={promoBanners} currentLanguage={currentLanguage} />

        {/* Primary CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <SoftCard
            onClick={() => navigate('/app/buyer/requests/new')}
            className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
          >
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-2xl bg-primary/20 self-start">
                <Plus size={24} className="text-primary" />
              </div>
              <span className="font-bold text-base text-foreground">
                {content[currentLanguage].postRequest}
              </span>
            </div>
          </SoftCard>

          <SoftCard
            onClick={() => navigate('/app/buyer/explore')}
            className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20"
          >
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-2xl bg-accent/20 self-start">
                <Zap size={24} className="text-accent" />
              </div>
              <span className="font-bold text-base text-foreground">
                {content[currentLanguage].bookNow}
              </span>
            </div>
          </SoftCard>
        </motion.div>

        {/* Service Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading2 lang={currentLanguage} className="text-lg">
              {content[currentLanguage].categories}
            </Heading2>
            <button
              onClick={() => navigate('/app/buyer/requests/new')}
              className={cn(
                'text-primary text-sm font-semibold flex items-center gap-1 min-h-[44px] px-3',
                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
              )}
            >
              {content[currentLanguage].seeAll}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {getAllCategories().slice(0, 8).map((category, index) => {
              const isEnabled = isAlphaEnabledCategory(category.key);
              return (
                <div key={category.key} className="relative">
                  <CategoryCircle
                    icon={category.icon}
                    label={currentLanguage === 'ar' ? category.ar : category.en}
                    onClick={() => isEnabled && navigate('/app/buyer/requests/new', {
                      state: { category: category.key }
                    })}
                    index={index}
                    className={!isEnabled ? 'opacity-40 grayscale' : ''}
                  />
                  {!isEnabled && (
                    <span className={cn(
                      "absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full whitespace-nowrap",
                      currentLanguage === 'ar' && "font-noto-ar"
                    )}>
                      {currentLanguage === 'ar' ? 'قريباً' : 'Soon'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading2 lang={currentLanguage} className="text-lg">
              {content[currentLanguage].activeRequests}
            </Heading2>
            {activeRequests.length > 0 && (
              <button
                onClick={() => navigate('/app/buyer/requests')}
                className={cn(
                  'text-primary text-sm font-semibold flex items-center gap-1 min-h-[44px] px-3',
                  currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                )}
              >
                {content[currentLanguage].seeAll}
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {requestsLoading && activeRequests.length === 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[220px] h-64 bg-muted/50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : activeRequests.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {activeRequests.map((request, index) => {
                // Calculate valid offers (pending, negotiating, accepted)
                const validQuotes = request.quote_submissions?.filter((q: any) =>
                  ['pending', 'negotiating', 'accepted'].includes(q.status)
                )?.length || 0;

                const r = request as any;

                return (
                  <ActiveRequestCard
                    key={request.id}
                    id={request.id}
                    title={currentLanguage === 'ar' ? request.title_ar || request.title : request.title}
                    description={((currentLanguage === 'ar' ? (r.description_ar || r.description) : r.description) || '').replace(/\n?\[Flexible Time\]/gi, '').replace(/\n?\[وقت مرن\]/gi, '')}
                    category={r.service_category || r.category}
                    imageUrl={r.photos?.[0]}
                    priceRange={request.estimated_budget_min && request.estimated_budget_max
                      ? `$${request.estimated_budget_min}-${request.estimated_budget_max}`
                      : undefined}
                    quotesCount={validQuotes}
                    status={request.status}
                    onClick={() => navigate(`/app/buyer/request/${request.id}`)}
                    index={index}
                    currentLanguage={currentLanguage}
                  />
                );
              })}
            </div>
          ) : (
            <SoftCard className="text-center py-12">
              <div className="space-y-3">
                <div className="text-5xl opacity-20">📋</div>
                <p className="text-muted-foreground">
                  {content[currentLanguage].noActiveRequests}
                </p>
                <button
                  onClick={() => navigate('/app/buyer/requests/new')}
                  className="text-primary font-semibold text-sm"
                >
                  {content[currentLanguage].startRequest} →
                </button>
              </div>
            </SoftCard>
          )}
        </div>
      </div>
    </div>
  );
};
