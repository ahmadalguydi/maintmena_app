import { useMemo, useState } from 'react';
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
import { Heading3, Body, BodySmall } from '@/components/mobile/Typography';
import { CheckCircle, XCircle, MapPin, Calendar, DollarSign, Star, Image, Shield, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBuyerReviewPath } from '@/lib/buyerReviewNavigation';
import { getRequestLocationLabel } from '@/lib/maintenanceRequest';

interface HistoryProps {
  currentLanguage: 'en' | 'ar';
}

type RequestHistoryItem = {
  id: string;
  status: string | null;
  title?: string | null;
  title_ar?: string | null;
  category?: string | null;
  location?: string | null;
  location_city?: string | null;
  city?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  buyer_completion_date?: string | null;
  buyer_marked_complete?: boolean | null;
  assigned_seller_id?: string | null;
  budget?: number | null;
  final_amount?: number | null;
  completion_photos?: string[] | null;
  warranty_activated_at?: string | null;
  warranty_expires_at?: string | null;
  profiles?: {
    full_name?: string | null;
    company_name?: string | null;
  } | null;
  review?: {
    id: string;
    rating: number;
    review_text?: string | null;
  } | null;
  categoryState: 'completed' | 'rejected';
};

const COMPLETED_STATUSES = new Set(['completed', 'closed']);
const REJECTED_STATUSES = new Set(['cancelled', 'rejected', 'declined']);

export const History = ({ currentLanguage }: HistoryProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<'completed' | 'rejected'>('completed');

  const { data: historyItems = { completed: [], rejected: [] }, isLoading, isError, refetch } = useQuery({
    queryKey: ['buyer-history-all-v4', user?.id],
    enabled: !!user?.id,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      if (!user?.id) {
        return { completed: [] as RequestHistoryItem[], rejected: [] as RequestHistoryItem[] };
      }

      const { data: requests, error } = await supabase
        .from('maintenance_requests')
        .select(`
          id,
          status,
          title,
          title_ar,
          category,
          location,
          location_city,
          city,
          updated_at,
          completed_at,
          buyer_completion_date,
          buyer_marked_complete,
          assigned_seller_id,
          budget,
          final_amount,
          completion_photos,
          warranty_activated_at,
          warranty_expires_at
        `)
        .eq('buyer_id', user.id)
        .or('status.in.(completed,closed,cancelled,rejected,declined),buyer_marked_complete.eq.true')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const sellerIds = [...new Set((requests ?? []).map((request) => request.assigned_seller_id).filter(Boolean))] as string[];
      const requestIds = (requests ?? []).map((request) => request.id);

      const [profilesResult, reviewsResult] = await Promise.all([
        sellerIds.length
          ? supabase.from('profiles').select('id, full_name, company_name').in('id', sellerIds)
          : Promise.resolve({ data: [], error: null }),
        requestIds.length
          ? supabase.from('seller_reviews').select('id, request_id, rating, review_text').eq('buyer_id', user.id).in('request_id', requestIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (reviewsResult.error) {
        throw reviewsResult.error;
      }

      const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
      const reviewMap = new Map((reviewsResult.data ?? []).map((review) => [review.request_id, review]));

      const normalized = (requests ?? [])
        .map((request) => {
          const isCompleted = COMPLETED_STATUSES.has(request.status ?? '') || Boolean(request.buyer_marked_complete);
          const isRejected = REJECTED_STATUSES.has(request.status ?? '');

          if (!isCompleted && !isRejected) {
            return null;
          }

          return {
            ...request,
            profiles: request.assigned_seller_id ? profileMap.get(request.assigned_seller_id) ?? null : null,
            review: reviewMap.get(request.id) ?? null,
            categoryState: isCompleted ? 'completed' : 'rejected',
          } satisfies RequestHistoryItem;
        })
        .filter((item): item is RequestHistoryItem => Boolean(item));

      const sortByNewest = (items: RequestHistoryItem[]) =>
        [...items].sort(
          (left, right) =>
            new Date(right.buyer_completion_date || right.completed_at || right.updated_at || 0).getTime() -
            new Date(left.buyer_completion_date || left.completed_at || left.updated_at || 0).getTime(),
        );

      return {
        completed: sortByNewest(normalized.filter((item) => item.categoryState === 'completed')),
        rejected: sortByNewest(normalized.filter((item) => item.categoryState === 'rejected')),
      };
    },
  });

  const items = activeTab === 'completed' ? historyItems.completed : historyItems.rejected;

  const content = useMemo(() => ({
    en: {
      title: 'History',
      completed: 'Completed',
      rejected: 'Cancelled',
      completedOn: 'Completed on',
      rejectedOn: 'Updated on',
      noCompleted: 'No completed requests yet',
      noRejected: 'No cancelled requests',
      seller: 'Provider',
      yourReview: 'Your Review',
      editReview: 'Edit Review',
      leaveReview: 'Leave Review',
      photos: 'Proof Photos',
      warranty: 'Warranty',
      warrantyActive: 'Active',
      warrantyExpired: 'Expired',
      failedToLoad: 'Failed to load request history',
      retry: 'Retry',
    },
    ar: {
      title: 'السجل',
      completed: 'المكتمل',
      rejected: 'الملغي',
      completedOn: 'اكتمل في',
      rejectedOn: 'تم التحديث في',
      noCompleted: 'لا توجد طلبات مكتملة بعد',
      noRejected: 'لا توجد طلبات ملغاة',
      seller: 'مقدم الخدمة',
      yourReview: 'تقييمك',
      editReview: 'تعديل التقييم',
      leaveReview: 'ترك تقييم',
      photos: 'صور العمل',
      warranty: 'الضمان',
      warrantyActive: 'نشط',
      warrantyExpired: 'منتهي',
      failedToLoad: 'تعذر تحميل السجل',
      retry: 'إعادة المحاولة',
    },
  }), []);

  const t = content[currentLanguage];

  return (
    <div className="pb-28 min-h-screen bg-background" dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} onBack={() => navigate(-1)} />

      <div className="px-6 pt-6">
        <div className="flex gap-2 p-1 bg-muted/50 rounded-full">
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'flex-1 h-12 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2',
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <CheckCircle size={16} />
            <Body lang={currentLanguage} className={cn(activeTab === 'completed' && '!text-white')}>
              {t.completed}
            </Body>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={cn(
              'flex-1 h-12 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-2',
              activeTab === 'rejected'
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <XCircle size={16} />
            <Body lang={currentLanguage} className={cn(activeTab === 'rejected' && '!text-white')}>
              {t.rejected}
            </Body>
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-3">
        {isLoading ? (
          <>
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
            <LoadingShimmer type="card" />
          </>
        ) : isError ? (
          <SoftCard className="space-y-3">
            <BodySmall lang={currentLanguage} className="text-muted-foreground">
              {t.failedToLoad}
            </BodySmall>
            <Button onClick={() => refetch()}>{t.retry}</Button>
          </SoftCard>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-5xl opacity-20 mb-4">
              {activeTab === 'completed' ? '✓' : '×'}
            </div>
            <BodySmall lang={currentLanguage} className="text-muted-foreground">
              {activeTab === 'completed' ? t.noCompleted : t.noRejected}
            </BodySmall>
          </div>
        ) : (
          items.map((item) => {
            const completionPhotos = item.completion_photos || [];
            const warrantyActive = item.warranty_expires_at && new Date(item.warranty_expires_at) > new Date();

            return (
              <div
                key={item.id}
                onClick={() => navigate(`/app/buyer/request/${item.id}`)}
                className="cursor-pointer transition-transform active:scale-[0.98]"
              >
                <SoftCard>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <Heading3 lang={currentLanguage} className="flex-1 line-clamp-2">
                        {currentLanguage === 'ar' && item.title_ar ? item.title_ar : item.title || item.category || 'Request'}
                      </Heading3>
                      <StatusPill
                        status={activeTab === 'completed' ? 'success' : 'error'}
                        label={activeTab === 'completed' ? t.completed : t.rejected}
                      />
                    </div>

                    {item.profiles && (
                      <BodySmall lang={currentLanguage} className="text-muted-foreground">
                        {t.seller}: {item.profiles.company_name || item.profiles.full_name}
                      </BodySmall>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground truncate">
                          {getRequestLocationLabel(item, currentLanguage === 'ar' ? 'الموقع غير متوفر' : 'Location unavailable')}
                        </BodySmall>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground flex-shrink-0" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground">
                          {activeTab === 'completed' ? t.completedOn : t.rejectedOn}:{' '}
                          {new Date(item.buyer_completion_date || item.completed_at || item.updated_at || Date.now()).toLocaleDateString()}
                        </BodySmall>
                      </div>
                    </div>

                    {(item.final_amount || item.budget) && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                        <DollarSign size={16} className="text-primary" />
                        <BodySmall lang={currentLanguage} className="font-semibold text-primary">
                          {formatAmount(item.final_amount || item.budget || 0)}
                        </BodySmall>
                      </div>
                    )}

                    {activeTab === 'completed' && item.review && (
                      <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                            <BodySmall lang={currentLanguage} className="font-medium">
                              {t.yourReview}
                            </BodySmall>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  className={star <= item.review!.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}
                                />
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(getBuyerReviewPath({ jobId: item.id, jobType: 'request', edit: true }));
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

                    {activeTab === 'completed' && !item.review && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(getBuyerReviewPath({ jobId: item.id, jobType: 'request' }));
                        }}
                      >
                        <Star size={14} className="mr-2" />
                        {t.leaveReview}
                      </Button>
                    )}

                    {activeTab === 'completed' && completionPhotos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Image size={14} className="text-muted-foreground" />
                        <BodySmall lang={currentLanguage} className="text-muted-foreground">
                          {t.photos}: {completionPhotos.length}
                        </BodySmall>
                      </div>
                    )}

                    {activeTab === 'completed' && item.warranty_activated_at && (
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit',
                          warrantyActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
                        )}
                      >
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
