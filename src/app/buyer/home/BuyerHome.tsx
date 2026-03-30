import { Suspense, lazy, type ComponentType, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Zap, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllCategories } from '@/lib/serviceCategories';
import { STALE_TIME, REFETCH_INTERVAL } from '@/lib/queryConfig';
import * as jobService from '@/services/jobService';
import { SoftCard } from '@/components/mobile/SoftCard';
import { PromoBanner } from '../../../components/mobile/PromoBanner';
import { CategoryCircle } from '@/components/mobile/CategoryCircle';
import { Heading2 } from '@/components/mobile/Typography';
import { motion } from 'framer-motion';
import { DualResolutionHaltedJobCard } from '@/components/mobile/DualResolutionHaltedJobCard';
import { JobTrackingCard } from '@/components/mobile/JobTrackingCard';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useJobIssuesMap, IssueStatus } from '@/hooks/useJobIssues';
import { SearchHero } from '@/components/mobile/SearchHero';
import { StickySearchBar } from '@/components/mobile/StickySearchBar';
import { ActiveRequestCard, RequestStatus, ActiveRequest } from '@/components/mobile/ActiveRequestCard';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import type { ServiceFlowScreenProps } from '@/components/mobile/ServiceFlowScreen';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getBuyerReviewPromptCount,
  getBuyerReviewPromptStorageKey,
  hasBuyerReviewBeenSubmittedLocally,
  incrementBuyerReviewPromptCount,
  markBuyerReviewSubmitted,
  shouldPromptBuyerForReview,
  shouldShowBuyerRequestOnHome,
} from '@/lib/buyerCompletionFlow';
import { submitSellerReview } from '@/lib/reviewFlow';
import {
  isSupabaseRelationKnownUnavailable,
} from '@/lib/supabaseSchema';
import { executeSupabaseQuery } from '@/lib/supabaseQuery';
import {
  getBuyerRequestPresentationStatus,
  getRequestLocationLabel,
  toCanonicalRequest,
} from '@/lib/maintenanceRequest';
import { toast } from 'sonner';

interface BuyerHomeProps {
  currentLanguage: 'en' | 'ar';
}

interface PendingReviewPrompt {
  id: string;
  category: string | null;
  location: string | null;
  promptCount: number;
  sellerId: string;
  sellerName: string;
  title: string | null;
}

const ServiceFlowScreen = lazy(async () => {
  const module = await import('@/components/mobile/ServiceFlowScreen');
  return { default: module.ServiceFlowScreen };
}) as ComponentType<ServiceFlowScreenProps>;

const ServiceFlowFallback = ({ currentLanguage }: { currentLanguage: 'en' | 'ar' }) => (
  <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
    <p className={cn('text-sm font-semibold text-muted-foreground', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
      {currentLanguage === 'ar' ? 'جاري تجهيز الطلب...' : 'Preparing request flow...'}
    </p>
  </div>
);

const CATEGORY_LOOKUP = new Map(getAllCategories().map((category) => [category.key, category]));


import { BuyerHomeSkeleton } from './BuyerHomeSkeleton';

export const BuyerHome = ({ currentLanguage: propLanguage }: BuyerHomeProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const [isServiceFlowOpen, setIsServiceFlowOpen] = useState(false);
  const [prefilledCategory, setPrefilledCategory] = useState<string | null>(null);
  const [showCompletedReviewPrompt, setShowCompletedReviewPrompt] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [hoveredReviewRating, setHoveredReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const searchHeroRef = useRef<HTMLDivElement>(null);
  const countedReviewPromptKeyRef = useRef<string | null>(null);
  const currentLanguage = propLanguage || (localStorage.getItem('preferredLanguage') as 'en' | 'ar') || 'ar';

  // Fetch buyer's open/accepted/in_progress requests for the ActiveRequestCards
  const {
    data: activeDispatchRequests,
    error: activeDispatchRequestsError,
    refetch: refetchActiveDispatchRequests,
  } = useQuery({
    queryKey: ['buyer-dispatch-requests', user?.id],
    queryFn: async (): Promise<ActiveRequest[]> => {
      if (!user?.id) return [];

      const reqs = await jobService.fetchBuyerRequests(user.id);

      if (!reqs || reqs.length === 0) return [];

      const visibleRequests = reqs.filter((req) => shouldShowBuyerRequestOnHome(req));

      if (visibleRequests.length === 0) return [];

      // Batch-fetch all seller profiles in a single query (fixes N+1)
      const sellerIds = [...new Set(
        visibleRequests
          .filter((r) => r.assigned_seller_id)
          .map((r) => r.assigned_seller_id as string)
      )] as string[];

      const sellerProfileMap = new Map<
        string,
        {
          full_name: string | null;
          company_name: string | null;
          avatar_url: string | null;
          phone: string | null;
        }
      >();
      if (sellerIds.length > 0) {
        const sellerProfiles = await executeSupabaseQuery<{ id: string; full_name: string | null; company_name: string | null; avatar_url: string | null; phone: string | null; }[]>(
          () => supabase
            .from('profiles')
            .select('id, full_name, company_name, avatar_url, phone')
            .in('id', sellerIds),
          {
            context: 'buyer-home-seller-profiles',
            fallbackData: [],
            relationName: 'profiles',
          },
        );
        (sellerProfiles || []).forEach((p) => sellerProfileMap.set(p.id, p));
      }

      const results: ActiveRequest[] = [];

      for (const req of visibleRequests) {
        const canonicalRequest = toCanonicalRequest(req);
        if (!canonicalRequest) continue;

        const requestStatus: RequestStatus = getBuyerRequestPresentationStatus(canonicalRequest) as RequestStatus;
        let providerName: string | undefined;
        let providerCompany: string | undefined;
        let providerAvatar: string | undefined;
        let providerPhone: string | undefined;
        let providerRating: number | undefined;
        let providerVerified: boolean | undefined;
        let providerExperienceYears: number | undefined;

        if (canonicalRequest.providerAssignment === 'assigned' && req.assigned_seller_id) {
          const sellerProfile = sellerProfileMap.get(req.assigned_seller_id);
          if (sellerProfile) {
            providerName = sellerProfile.full_name || undefined;
            providerCompany = sellerProfile.company_name || undefined;
            providerAvatar = sellerProfile.avatar_url || undefined;
            providerPhone = sellerProfile.phone || undefined;
          }
        }

        const categoryInfo = CATEGORY_LOOKUP.get(canonicalRequest.category);

        // Compute estimated price from seller_pricing or final_amount
        let estimatedPrice: string | undefined;
        if (req.final_amount) {
          estimatedPrice = `${req.final_amount} SAR`;
        } else if (req.seller_pricing) {
          try {
            const p = typeof req.seller_pricing === 'object' ? req.seller_pricing : JSON.parse(req.seller_pricing);
            if (p?.type === 'fixed' && p?.fixedPrice) estimatedPrice = `${p.fixedPrice} SAR`;
            else if (p?.type === 'range' && p?.minPrice) estimatedPrice = `${p.minPrice}–${p.maxPrice} SAR`;
            else if (p?.type === 'inspection') estimatedPrice = currentLanguage === 'ar' ? 'بعد المعاينة' : 'After inspection';
          } catch {
            // seller_pricing is not valid JSON — skip price estimate
          }
        }

        results.push({
          id: canonicalRequest.id,
          category: currentLanguage === 'ar'
            ? (categoryInfo?.ar || canonicalRequest.category)
            : (categoryInfo?.en || canonicalRequest.category),
          categoryIcon: categoryInfo?.icon || '🛠️',
          situation: canonicalRequest.title ? canonicalRequest.title.split(' - ').pop() : undefined,
          description: canonicalRequest.description ? canonicalRequest.description.replace(/^.*\n{2,}/, '') : undefined,
          location: getRequestLocationLabel(req, currentLanguage === 'ar' ? 'الموقع قيد التحديث' : 'Location pending'),
          timeMode: canonicalRequest.timingMode,
          status: requestStatus,
          providerName,
          providerCompany,
          providerAvatar,
          providerPhone,
          providerRating,
          providerVerified,
          providerExperienceYears,
          providerId: req.assigned_seller_id || undefined,
          lat: canonicalRequest.latitude ?? canonicalRequest.lat,
          lng: canonicalRequest.longitude ?? canonicalRequest.lng,
          estimatedPrice,
          sellerPricing: req.seller_pricing,
          finalAmount: req.final_amount,
          sellerMarkedComplete: req.seller_marked_complete || false,
        });
      }
      
      return results;
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    placeholderData: (previousData) => previousData ?? [],
    // 15s polling: acceptance is also pushed immediately via queryClient.invalidateQueries
    // inside ServiceFlowScreen, so we don't need to poll more aggressively.
    refetchInterval: REFETCH_INTERVAL.BUYER_ACTIVE,
  });

  const {
    data: pendingReviewPrompt,
    error: pendingReviewPromptError,
    refetch: refetchPendingReviewPrompt,
  } = useQuery({
    queryKey: ['buyer-completed-review-prompt', user?.id, currentLanguage],
    queryFn: async (): Promise<PendingReviewPrompt | null> => {
      if (!user?.id) return null;

      interface CompletedRequestRow {
        id: string;
        title: string | null;
        category: string | null;
        location: string | null;
        assigned_seller_id: string;
        buyer_marked_complete: boolean | null;
        buyer_completion_date: string | null;
      }

      const completedRequests = await executeSupabaseQuery<CompletedRequestRow[]>(
        () => (supabase as any)
          .from('maintenance_requests')
          .select('id, title, category, location, assigned_seller_id, buyer_marked_complete, buyer_completion_date')
          .eq('buyer_id', user.id)
          .eq('buyer_marked_complete', true)
          .not('assigned_seller_id', 'is', null)
          .order('buyer_completion_date', { ascending: false })
          .limit(6),
        {
          context: 'buyer-home-review-prompt-requests',
          fallbackData: [],
          relationName: 'maintenance_requests',
          throwOnError: true,
        },
      );

      if (!completedRequests || completedRequests.length === 0) {
        return null;
      }

      const requestIds = completedRequests.map((request) => request.id);
      const reviews = isSupabaseRelationKnownUnavailable('seller_reviews')
        ? []
        : await executeSupabaseQuery<{ request_id: string | null }[]>(
            () => (supabase as any)
              .from('seller_reviews')
              .select('request_id')
              .eq('buyer_id', user.id)
              .in('request_id', requestIds),
            {
              context: 'buyer-home-review-prompt-reviews',
              fallbackData: [],
              relationName: 'seller_reviews',
              retries: 0,
            },
          );

      const reviewedRequestIds = new Set(
        reviews
          .map((review) => review.request_id)
          .filter(Boolean),
      );

      const nextPromptRequest = completedRequests.find((request) => {
        const hasExistingReview = reviewedRequestIds.has(request.id);
        const promptCount = getBuyerReviewPromptCount(window.localStorage, request.id);
        const hasLocalReviewSubmission = hasBuyerReviewBeenSubmittedLocally(
          window.localStorage,
          request.id,
        );

        return shouldPromptBuyerForReview({
          buyerMarkedComplete: request.buyer_marked_complete,
          hasExistingReview,
          promptCount,
          hasLocalReviewSubmission,
        });
      });

      if (!nextPromptRequest) {
        return null;
      }

      const promptCount = getBuyerReviewPromptCount(window.localStorage, nextPromptRequest.id);

      const seller = await executeSupabaseQuery<{ full_name: string | null; company_name: string | null } | null>(
        () => supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('id', nextPromptRequest.assigned_seller_id)
          .maybeSingle(),
        {
          context: 'buyer-home-review-prompt-seller',
          fallbackData: null,
          relationName: 'profiles',
        },
      );

      return {
        id: nextPromptRequest.id,
        category: nextPromptRequest.category,
        location: nextPromptRequest.location,
        promptCount,
        sellerId: nextPromptRequest.assigned_seller_id,
        sellerName:
          seller?.company_name ||
          seller?.full_name ||
          (currentLanguage === 'ar' ? 'مقدم الخدمة' : 'Service Provider'),
        title: nextPromptRequest.title,
      };
    },
    enabled: !!user?.id,
    staleTime: 10_000,
    placeholderData: (previousData) => previousData ?? null,
    refetchInterval: REFETCH_INTERVAL.BUYER_ACTIVE,
  });

  useEffect(() => {
    if (!pendingReviewPrompt?.id) {
      countedReviewPromptKeyRef.current = null;
      return;
    }

    const promptInstanceKey = `${pendingReviewPrompt.id}:${pendingReviewPrompt.promptCount}`;
    if (!showCompletedReviewPrompt && countedReviewPromptKeyRef.current !== promptInstanceKey) {
      incrementBuyerReviewPromptCount(window.localStorage, pendingReviewPrompt.id);
      countedReviewPromptKeyRef.current = promptInstanceKey;
      setShowCompletedReviewPrompt(true);
      setReviewRating(0);
      setHoveredReviewRating(0);
      setReviewText('');
    }
  }, [pendingReviewPrompt?.id, pendingReviewPrompt?.promptCount, showCompletedReviewPrompt]);

  const markReviewPromptSeen = useCallback((requestId: string) => {
    window.localStorage.setItem(
      getBuyerReviewPromptStorageKey(requestId),
      String(Math.max(getBuyerReviewPromptCount(window.localStorage, requestId), 1)),
    );
  }, []);

  const handleReviewPromptLater = useCallback(() => {
    if (pendingReviewPrompt?.id) {
      markReviewPromptSeen(pendingReviewPrompt.id);
    }
    setShowCompletedReviewPrompt(false);
  }, [markReviewPromptSeen, pendingReviewPrompt?.id]);

  const submitModalReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !pendingReviewPrompt?.id || !pendingReviewPrompt.sellerId) {
        throw new Error('Missing review context');
      }

      return submitSellerReview({
        client: supabase as any,
        buyerId: user.id,
        sellerId: pendingReviewPrompt.sellerId,
        rating: reviewRating,
        reviewText,
        requestId: pendingReviewPrompt.id,
      });
    },
    onSuccess: ({ mode }) => {
      if (pendingReviewPrompt?.id) {
        markBuyerReviewSubmitted(window.localStorage, pendingReviewPrompt.id);
      }

      setShowCompletedReviewPrompt(false);
      setReviewRating(0);
      setHoveredReviewRating(0);
      setReviewText('');

      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-completed-review-prompt', user?.id, currentLanguage] });
      queryClient.invalidateQueries({ queryKey: ['request-review-context', pendingReviewPrompt?.id, user?.id, pendingReviewPrompt?.sellerId] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking', pendingReviewPrompt?.id] });
      queryClient.invalidateQueries({ queryKey: ['buyer-history'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-history-all-v4'] });

      toast.success(
        currentLanguage === 'ar'
          ? mode === 'updated'
            ? 'تم تحديث تقييمك'
            : 'تم إرسال تقييمك بنجاح'
          : mode === 'updated'
            ? 'Your review was updated'
            : 'Your review was submitted',
      );
    },
    onError: () => {
      toast.error(currentLanguage === 'ar' ? 'فشل إرسال التقييم' : 'Failed to submit review');
    },
  });

  // IntersectionObserver to detect when SearchHero scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sticky search when original search is less than 50% visible
        setShowStickySearch(!entry.isIntersecting);
      },
      { threshold: 0.5 }
    );

    if (searchHeroRef.current) {
      observer.observe(searchHeroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Handler to open ServiceFlowScreen overlay — stable reference avoids child re-renders
  const handleSearchClick = useCallback((category?: string | null) => {
    haptics.light();
    const safeCategory = typeof category === 'string' && category.trim() ? category : null;
    setPrefilledCategory(safeCategory);
    setIsServiceFlowOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('compose') !== '1') {
      return;
    }

    handleSearchClick(searchParams.get('category'));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('compose');
    nextParams.delete('category');
    setSearchParams(nextParams, { replace: true });
  }, [handleSearchClick, searchParams, setSearchParams]);

  // The separate queries for activeRequests and activeJobs were redundant as they overlapped
  // with activeDispatchRequests. We consolidated them above.
  const isActivityLoading = false; // Query results are ready by the time we render
  const haltedJobs: never[] = []; // In-memory filter if needed

  const hasBuyerHomeDataError = Boolean(
    activeDispatchRequestsError || pendingReviewPromptError,
  );

  const retryBuyerHomeData = useCallback(() => {
    void refetchActiveDispatchRequests();
    void refetchPendingReviewPrompt();
  }, [refetchActiveDispatchRequests, refetchPendingReviewPrompt]);

  // The old handleViewQuotes and notification counts were removed

  const content = {
    ar: {
      searchPlaceholder: 'وش الخدمة اللي تحتاجها؟',
      postRequest: 'انشر طلب',
      postRequestDesc: 'ارسل طلبك ونبدأ نطابقه مع الفني المناسب',
      bookNow: 'احجز الآن',
      bookNowDesc: 'ابدأ طلب خدمة جديد',
      categories: 'فئات الخدمة',
      seeAll: 'عرض الكل',
      activeRequests: 'طلباتك النشطة',
      activeJobs: 'الأعمال النشطة',
      noActiveJobs: 'لا توجد أعمال نشطة',
      noActiveRequests: 'لا توجد طلبات نشطة',
      startRequest: 'ابدأ طلب جديد',
      requestAnother: 'اطلب خدمة جديدة...',
      emergency: 'تحتاج فني بسرعة؟',
      emergencyDesc: 'نلقى لك أقرب فني مناسب بأسرع وقت',
      getNow: 'ابدأ الآن',
      trusted: 'فنيين موثوقين',
      trustedDesc: 'اختر فني مناسب في منطقتك بثقة ووضوح',
      transparent: 'سعر واضح',
      transparentDesc: 'تشوف السعر والخطوات قبل ما تأكد',
      newQuotes: 'عروض جديدة',
      newQuotesDesc: 'راجع العروض واختر الأفضل',
      viewQuotes: 'عرض'
    },
    en: {
      searchPlaceholder: 'Search for a service...',
      postRequest: 'Post Request',
      postRequestDesc: 'Send your request and start provider matching',
      bookNow: 'Request Now',
      bookNowDesc: 'Start a new service request',
      categories: 'Service Categories',
      seeAll: 'See all',
      activeRequests: 'Your Active Requests',
      activeJobs: 'Active Jobs',
      noActiveJobs: 'No active jobs',
      noActiveRequests: 'No active requests',
      startRequest: 'Start a new request',
      requestAnother: 'Request another service...',
      emergency: 'Need urgent help?',
      emergencyDesc: 'Get fast response from nearby professionals',
      getNow: 'Get Now',
      trusted: 'Trusted Professionals',
      trustedDesc: 'Connect with top-rated service providers in your area',
      transparent: 'Transparent Pricing',
      transparentDesc: 'See clear pricing and expectations before you confirm'
    }
  };

  const reviewPromptCopy = currentLanguage === 'ar'
    ? {
        title: 'قيّم الخدمة بسرعة',
        body: 'تقدر تضيف تقييمك من هنا مباشرة.',
        later: 'لاحقاً',
        badge: 'اكتمل الطلب',
      }
    : {
        title: 'Leave a quick review',
        body: 'You can submit it right from this modal.',
        later: 'Later',
        badge: 'Job completed',
      };

  // Memoised: only rebuilds when language changes, not on every activeDispatchRequests poll
  const promoBanners = useMemo(() => [
    {
      id: '1',
      title: content[currentLanguage].emergency,
      description: content[currentLanguage].emergencyDesc,
      ctaText: content[currentLanguage].getNow,
      ctaAction: () => handleSearchClick(),
      gradient: 'bg-gradient-to-br from-red-50 to-orange-50'
    },
    {
      id: '2',
      title: content[currentLanguage].trusted,
      description: content[currentLanguage].trustedDesc,
      ctaText: content[currentLanguage].seeAll,
      ctaAction: () => handleSearchClick(),
      gradient: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      id: '3',
      title: content[currentLanguage].transparent,
      description: content[currentLanguage].transparentDesc,
      ctaText: content[currentLanguage].seeAll,
      ctaAction: () => navigate('/app/buyer/activity'),
      gradient: 'bg-gradient-to-br from-green-50 to-emerald-50'
    }
  ], [currentLanguage, handleSearchClick, navigate]);

  // Fully block render until initial data is ready to prevent "pop-in"
  const isPageLoading = false; // Simplified for now as we use placeholders or skeletons elsewhere

  if (isPageLoading) {
    return <BuyerHomeSkeleton />;
  }

  return (
    <div
      className="pb-24 min-h-screen bg-background"
      dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Sticky Search Bar - appears when scrolled past SearchHero */}
      <StickySearchBar
        currentLanguage={currentLanguage}
        isVisible={showStickySearch}
        onFocusClick={handleSearchClick}
        placeholder={
          activeDispatchRequests && activeDispatchRequests.length > 0
            ? content[currentLanguage].requestAnother
            : content[currentLanguage].searchPlaceholder
        }
      />

      {/* Content */}
      <div className="px-4 space-y-6 pt-4">
        {/* Search Hero sentinel - always present */}
        <div ref={searchHeroRef} className="transition-all duration-300 mb-2">
          <SearchHero
            currentLanguage={currentLanguage}
            onFocusClick={handleSearchClick}
            placeholder={
              activeDispatchRequests && activeDispatchRequests.length > 0
                ? content[currentLanguage].requestAnother
                : content[currentLanguage].searchPlaceholder
            }
          />
        </div>

        {hasBuyerHomeDataError && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center justify-between gap-3">
              <span>
                {currentLanguage === 'ar'
                  ? 'تعذر تحديث الطلبات الآن. نحتفظ بآخر بيانات متاحة.'
                  : 'Could not refresh requests right now. Showing the latest available data.'}
              </span>
              <button
                onClick={retryBuyerHomeData}
                className="shrink-0 rounded-full bg-amber-900 px-3 py-1 text-xs font-semibold text-white"
              >
                {currentLanguage === 'ar' ? 'إعادة المحاولة' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Display all active maintenance requests - unified section */}
        {activeDispatchRequests && activeDispatchRequests.length > 0 && (
          <div className="space-y-4">
            <Heading2 lang={currentLanguage} className="text-lg">
              {content[currentLanguage].activeJobs}
            </Heading2>
            <div className="space-y-4">
              {activeDispatchRequests.map(req => (
                <ActiveRequestCard
                  key={req.id}
                  currentLanguage={currentLanguage}
                  request={req}
                  onTrack={(id) => navigate(`/app/buyer/request/${id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Promo Banner Carousel */}
        <PromoBanner items={promoBanners} currentLanguage={currentLanguage} />

        {/* Primary CTA - Single Request Button (Dispatch-First) */}
        {(!activeDispatchRequests || activeDispatchRequests.length === 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              onClick={handleSearchClick}
              role="button"
              className="bg-gradient-to-r from-primary to-primary/80 border border-primary shadow-lg shadow-primary/20 rounded-3xl p-5 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-bold text-xl text-white",
                    currentLanguage === 'ar' ? 'font-ar-heading' : 'font-heading'
                  )}>
                    {currentLanguage === 'ar' ? 'اطلب خدمة' : 'Request Service'}
                  </h3>
                  <p className={cn(
                    "text-sm text-white/80 mt-1",
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body'
                  )}>
                    {currentLanguage === 'ar'
                      ? 'اوصف مشكلتك وسنجد لك الحل'
                      : 'Describe your issue, we\'ll find the solution'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Plus size={28} className="text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Service Categories */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <Heading2 lang={currentLanguage} className="text-lg">
              {content[currentLanguage].categories}
            </Heading2>
            <button
              onClick={() => handleSearchClick()}
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
            {getAllCategories().slice(0, 8).map((category, index) => (
              <CategoryCircle
                key={category.key}
                icon={category.icon}
                label={currentLanguage === 'ar' ? category.ar : category.en}
                onClick={() => handleSearchClick(category.key)}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Service Flow Overlay */}
        {isServiceFlowOpen ? (
          <Suspense fallback={<ServiceFlowFallback currentLanguage={currentLanguage} />}>
            <ServiceFlowScreen
              currentLanguage={currentLanguage}
              isOpen={isServiceFlowOpen}
              initialCategory={prefilledCategory}
              onClose={() => {
                setIsServiceFlowOpen(false);
                setPrefilledCategory(null);
              }}
            />
          </Suspense>
        ) : null}
      </div>

      <Dialog
        open={showCompletedReviewPrompt && !!pendingReviewPrompt}
        onOpenChange={(open) => {
          if (!open) {
            handleReviewPromptLater();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-3">
            <div className="inline-flex w-max items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              {reviewPromptCopy.badge}
            </div>
            <DialogTitle className={cn(currentLanguage === 'ar' ? 'font-ar-heading text-right' : 'font-heading')}>
              {reviewPromptCopy.title}
            </DialogTitle>
            <DialogDescription className={cn(currentLanguage === 'ar' ? 'font-ar-body text-right' : 'font-body')}>
              {reviewPromptCopy.body}
            </DialogDescription>
          </DialogHeader>

          {pendingReviewPrompt && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <p className={cn('text-sm font-semibold text-foreground', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                  {pendingReviewPrompt.sellerName}
                </p>
                {pendingReviewPrompt.title && (
                  <p className={cn('mt-1 text-sm text-muted-foreground', currentLanguage === 'ar' ? 'font-ar-body' : 'font-body')}>
                    {pendingReviewPrompt.title}
                  </p>
                )}
              </div>

              <ReviewComposer
                compact
                currentLanguage={currentLanguage}
                sellerName={pendingReviewPrompt.sellerName}
                rating={reviewRating}
                hoveredRating={hoveredReviewRating}
                reviewText={reviewText}
                isSubmitting={submitModalReviewMutation.isPending}
                onRatingChange={setReviewRating}
                onHoverRatingChange={setHoveredReviewRating}
                onReviewTextChange={setReviewText}
                onSubmit={() => submitModalReviewMutation.mutate()}
                onCancel={handleReviewPromptLater}
                submitLabel={currentLanguage === 'ar' ? 'إرسال التقييم' : 'Submit Review'}
                cancelLabel={reviewPromptCopy.later}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
