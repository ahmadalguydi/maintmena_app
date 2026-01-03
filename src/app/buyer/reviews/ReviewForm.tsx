import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GradientHeader } from '@/components/mobile/GradientHeader';
import { SoftCard } from '@/components/mobile/SoftCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ReviewFormProps {
  currentLanguage: 'en' | 'ar';
}

export const ReviewForm = ({ currentLanguage }: ReviewFormProps) => {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Check if editing
  const isEdit = searchParams.get('edit') === 'true';
  const reviewId = searchParams.get('reviewId');
  const sellerIdParam = searchParams.get('seller');
  const contractIdParam = searchParams.get('contract');
  const jobType = searchParams.get('type') || 'booking';

  // Fetch existing review if editing
  const { data: existingReview } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: async () => {
      if (!reviewId) return null;
      const { data, error } = await supabase
        .from('seller_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!reviewId && isEdit
  });

  // Pre-populate form if editing
  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || '');
    }
  }, [existingReview]);

  // Fetch seller info based on job type
  const { data: sellerInfo } = useQuery({
    queryKey: ['seller-info', sellerIdParam],
    queryFn: async () => {
      if (!sellerIdParam) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, company_name')
        .eq('id', sellerIdParam)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!sellerIdParam
  });

  const { data: booking } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_requests')
        .select(`
          seller_id,
          seller:profiles!seller_id(full_name, company_name)
        `)
        .eq('id', bookingId)
        .maybeSingle();

      if (error) throw error;

      // Handle the case where seller might be an array
      if (data && Array.isArray(data.seller) && data.seller.length > 0) {
        return { ...data, seller: data.seller[0] };
      }

      return data;
    },
    enabled: !!bookingId && !sellerIdParam
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const sellerId = sellerIdParam || booking?.seller_id;

      if (!sellerId) {
        throw new Error('Seller ID is required');
      }

      if (isEdit && reviewId) {
        // Update existing review
        const { error } = await supabase
          .from('seller_reviews')
          .update({
            rating,
            review_text: reviewText,
            updated_at: new Date().toISOString()
          })
          .eq('id', reviewId);

        if (error) throw error;
      } else {
        // ROBUST DUPLICATE CHECK: Check by seller_id + buyer_id + request_id
        const { data: existingReviews, error: checkError } = await supabase
          .from('seller_reviews')
          .select('id, request_id')
          .eq('seller_id', sellerId)
          .eq('buyer_id', user!.id);

        if (checkError) {
          console.error('[ReviewForm] Error checking existing reviews:', checkError);
        }

        // Find if any existing review matches this job's request_id
        let existingJobReview = null;
        if (existingReviews && existingReviews.length > 0 && bookingId) {
          existingJobReview = existingReviews.find((r: any) => r.request_id === bookingId);
        }

        console.log('[ReviewForm] Duplicate check:', {
          sellerId,
          buyerId: user!.id,
          bookingId,
          existingReviews: existingReviews?.length || 0,
          existingJobReview: existingJobReview?.id
        });

        if (existingJobReview) {
          // Update existing review for this job (overwrite)
          console.log('[ReviewForm] Updating existing review:', existingJobReview.id);
          const { error } = await supabase
            .from('seller_reviews')
            .update({
              rating,
              review_text: reviewText,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingJobReview.id);

          if (error) throw error;
        } else {
          // Insert new review
          console.log('[ReviewForm] Inserting new review');
          const { error } = await supabase
            .from('seller_reviews')
            .insert({
              seller_id: sellerId,
              buyer_id: user!.id,
              rating,
              review_text: reviewText,
              request_id: bookingId
            });

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      // Invalidate all related queries so UI updates immediately
      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-history'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-profile', sellerIdParam] });

      // Trigger confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // confetti might fail in some browsers
      }

      toast.success(
        currentLanguage === 'ar'
          ? (isEdit ? 'تم تحديث تقييمك!' : 'شكراً لتقييمك!')
          : (isEdit ? 'Review updated!' : 'Thank you for your review!')
      );

      setTimeout(() => {
        navigate('/app/buyer/history');
      }, 2000);
    },
    onError: () => {
      toast.error(
        currentLanguage === 'ar'
          ? 'فشل إرسال التقييم'
          : 'Failed to submit review'
      );
    }
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error(
        currentLanguage === 'ar'
          ? 'الرجاء اختيار تقييم'
          : 'Please select a rating'
      );
      return;
    }
    submitReviewMutation.mutate();
  };

  const content = {
    en: {
      title: isEdit ? 'Edit Review' : 'Leave a Review',
      ratingLabel: 'How was your experience?',
      ratingHelp: 'Tap to rate',
      reviewLabel: 'Share your feedback',
      reviewPlaceholder: 'Tell us about your experience with this service provider...',
      submit: isEdit ? 'Update Review' : 'Submit Review',
      cancel: 'Cancel'
    },
    ar: {
      title: isEdit ? 'تعديل التقييم' : 'اترك تقييماً',
      ratingLabel: 'كيف كانت تجربتك؟',
      ratingHelp: 'اضغط للتقييم',
      reviewLabel: 'شارك رأيك',
      reviewPlaceholder: 'أخبرنا عن تجربتك مع مزود الخدمة...',
      submit: isEdit ? 'تحديث التقييم' : 'إرسال التقييم',
      cancel: 'إلغاء'
    }
  };

  // Get seller display info
  const sellerDisplayInfo = sellerInfo || (booking?.seller as any);

  const t = content[currentLanguage];
  const isArabic = currentLanguage === 'ar';

  return (
    <div className="min-h-screen bg-background pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <GradientHeader
        title={t.title}
        onBack={() => navigate(-1)}
      />

      <div className="px-6 py-6 space-y-6">
        <SoftCard>
          <div className="text-center space-y-4">
            {/* Seller Info */}
            {sellerDisplayInfo && (
              <div>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {(sellerDisplayInfo.company_name || sellerDisplayInfo.full_name || 'S').charAt(0).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold">
                  {sellerDisplayInfo.company_name || sellerDisplayInfo.full_name}
                </h3>
              </div>
            )}

            {/* Rating Stars */}
            <div className="space-y-2">
              <p className={`text-sm text-muted-foreground ${isArabic ? 'font-ar-display' : ''}`}>
                {t.ratingLabel}
              </p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform"
                  >
                    <Star
                      size={40}
                      className={`transition-colors ${star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                        }`}
                    />
                  </motion.button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t.ratingHelp}</p>
            </div>
          </div>
        </SoftCard>

        {/* Review Text */}
        <SoftCard>
          <div className="space-y-3">
            <label className={`text-sm font-medium ${isArabic ? 'font-ar-display' : ''}`}>
              {t.reviewLabel}
            </label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t.reviewPlaceholder}
              rows={6}
              className="resize-none rounded-2xl"
            />
          </div>
        </SoftCard>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-full h-14"
          >
            {t.cancel}
          </Button>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={rating === 0 || submitReviewMutation.isPending}
            className="flex-1 rounded-full h-14 bg-gradient-to-r from-primary to-accent"
          >
            {submitReviewMutation.isPending ? '...' : t.submit}
          </Button>
        </div>
      </div>
    </div>
  );
};
