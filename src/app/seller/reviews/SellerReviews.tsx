import { useQuery } from '@tanstack/react-query';
import { MessageSquare, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FloatingNav } from '@/components/mobile/FloatingNav';
import { attachReviewBuyerProfiles, getRelativeReviewDate } from '@/lib/reviewFlow';
import { cn } from '@/lib/utils';

interface SellerReviewsProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerReviews = ({ currentLanguage }: SellerReviewsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isArabic = currentLanguage === 'ar';

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['seller-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seller_reviews')
        .select('id, buyer_id, rating, review_text, created_at, request_id')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return attachReviewBuyerProfiles(supabase as any, data ?? []);
    },
    enabled: !!user,
  });

  const totalReviews = reviews.length;
  type ReviewWithBuyer = { id: string; rating: number; review_text?: string | null; created_at: string; buyer?: { company_name?: string | null; full_name?: string | null } | null };
  const typedReviews = reviews as ReviewWithBuyer[];
  const averageRating = totalReviews
    ? (typedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  const ratingBreakdown = [5, 4, 3, 2, 1].map((level) => ({
    level,
    count: typedReviews.filter((review) => review.rating === level).length,
  }));

  const content = {
    en: {
      title: 'My Reviews',
      avgRating: 'Average Rating',
      totalReviews: 'Total Reviews',
      recentFeedback: 'Recent feedback',
      noReviews: 'No reviews yet',
      noReviewsDesc: 'Completed jobs and buyer feedback will appear here.',
    },
    ar: {
      title: 'تقييماتي',
      avgRating: 'متوسط التقييم',
      totalReviews: 'إجمالي التقييمات',
      recentFeedback: 'أحدث الملاحظات',
      noReviews: 'لا توجد تقييمات بعد',
      noReviewsDesc: 'ستظهر هنا تقييمات المشترين بعد اكتمال الأعمال.',
    },
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} showBack onBack={() => navigate(-1)} />
        <div className="px-6 py-6 space-y-3">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <FloatingNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} />

      <div className="px-6 py-6 space-y-6">
        <SoftCard className="overflow-hidden p-0">
          <div className="bg-gradient-to-br from-primary/10 via-background to-amber-50/70 p-5">
            <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span>{t.avgRating}</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight">{averageRating}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/ 5</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {totalReviews} {t.totalReviews.toLowerCase()}
                </p>
              </div>

              <div className="space-y-2">
                {ratingBreakdown.map(({ level, count }) => {
                  const width = totalReviews ? `${(count / totalReviews) * 100}%` : '0%';
                  return (
                    <div key={level} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-muted-foreground">{level}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/70">
                        <div className="h-full rounded-full bg-amber-400" style={{ width }} />
                      </div>
                      <span className="w-5 text-right text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SoftCard>

        {!reviews.length ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-12 w-12 text-primary" />
            </div>
            <h3 className={cn('mb-2 text-lg font-semibold', isArabic ? 'font-ar-display' : 'font-display')}>
              {t.noReviews}
            </h3>
            <p className="text-center text-sm text-muted-foreground">{t.noReviewsDesc}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <div className="px-1">
              <p className={cn('text-sm font-semibold text-foreground', isArabic ? 'font-ar-display' : 'font-display')}>
                {t.recentFeedback}
              </p>
            </div>

            {typedReviews.map((review, index) => {
              const buyerName =
                review.buyer?.company_name ||
                review.buyer?.full_name ||
                (currentLanguage === 'ar' ? 'عميل' : 'Client');

              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <SoftCard className="p-5">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                            {buyerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-semibold text-foreground">{buyerName}</h4>
                            <p className="text-xs text-muted-foreground">
                              {getRelativeReviewDate(review.created_at, currentLanguage)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              size={16}
                              className={
                                starIndex < review.rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/30'
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {review.review_text ? (
                        <p className="text-sm leading-relaxed text-muted-foreground">{review.review_text}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground/70">
                          {currentLanguage === 'ar'
                            ? 'تم إرسال تقييم نجوم بدون تعليق مكتوب.'
                            : 'A star rating was submitted without a written comment.'}
                        </p>
                      )}
                    </div>
                  </SoftCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <FloatingNav />
    </div>
  );
};
