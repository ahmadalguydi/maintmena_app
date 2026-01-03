import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { FloatingNav } from '@/components/mobile/FloatingNav';
import { format } from 'date-fns';

interface SellerReviewsProps {
  currentLanguage: 'en' | 'ar';
}

export const SellerReviews = ({ currentLanguage }: SellerReviewsProps) => {
  const { user } = useAuth();
  const isArabic = currentLanguage === 'ar';

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['seller-reviews', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_reviews')
        .select('*, buyer:profiles!buyer_id(full_name, company_name)')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const averageRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const content = {
    en: {
      title: 'My Reviews',
      avgRating: 'Average Rating',
      totalReviews: 'Total Reviews',
      noReviews: 'No reviews yet',
      noReviewsDesc: 'Reviews from your clients will appear here'
    },
    ar: {
      title: 'تقييماتي',
      avgRating: 'متوسط التقييم',
      totalReviews: 'إجمالي التقييمات',
      noReviews: 'لا توجد تقييمات',
      noReviewsDesc: 'ستظهر هنا تقييمات عملائك'
    }
  };

  const t = content[currentLanguage];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
        <GradientHeader title={t.title} />
        <div className="px-6 py-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
        <FloatingNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader title={t.title} />

      <div className="px-6 py-6 space-y-6">
        {/* Stats Card */}
        <SoftCard>
          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                <span className="text-3xl font-bold">{averageRating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.avgRating}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{reviews?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t.totalReviews}</p>
            </div>
          </div>
        </SoftCard>

        {/* Reviews List */}
        {!reviews || reviews.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 px-6"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-12 h-12 text-primary" />
            </div>
            <h3 className={`text-lg font-semibold mb-2 ${isArabic ? 'font-ar-display' : ''}`}>
              {t.noReviews}
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              {t.noReviewsDesc}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <SoftCard>
                  <div className="space-y-3">
                    {/* Buyer Info & Rating */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">
                          {review.buyer?.company_name || review.buyer?.full_name || 'Client'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(review.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                            }
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {review.review_text}
                      </p>
                    )}
                  </div>
                </SoftCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <FloatingNav />
    </div>
  );
};
