import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ReviewComposer } from '@/components/reviews/ReviewComposer';
import { findExistingSellerReview, submitSellerReview } from '@/lib/reviewFlow';

interface LeaveReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  sellerName: string;
  requestId?: string;
  bookingId?: string;
  onSuccess?: () => void;
  currentLanguage?: 'en' | 'ar';
}

export const LeaveReviewModal = ({
  open,
  onOpenChange,
  sellerId,
  sellerName,
  requestId,
  bookingId,
  onSuccess,
  currentLanguage = 'en',
}: LeaveReviewModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: existingReview } = useQuery({
    queryKey: ['modal-review', sellerId, user?.id, requestId],
    queryFn: async () => {
      if (!user?.id || !open) {
        return null;
      }

      return findExistingSellerReview({
        client: supabase as any,
        buyerId: user.id,
        sellerId,
        requestId: requestId || null,
      });
    },
    enabled: !!user?.id && !!sellerId && open,
  });

  useEffect(() => {
    if (existingReview && open) {
      setRating(existingReview.rating);
      setReviewText(existingReview.review_text || '');
      return;
    }

    if (!open) {
      setRating(0);
      setHoveredRating(0);
      setReviewText('');
    }
  }, [existingReview, open]);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error(currentLanguage === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
      return;
    }

    if (rating === 0) {
      toast.error(currentLanguage === 'ar' ? 'يرجى اختيار تقييم' : 'Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      const result = await submitSellerReview({
        client: supabase as any,
        buyerId: user.id,
        sellerId,
        rating,
        reviewText,
        requestId: requestId || null,
        reviewId: existingReview?.id || null,
      });

      queryClient.invalidateQueries({ queryKey: ['seller-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['existing-review', requestId || bookingId, user.id] });
      queryClient.invalidateQueries({ queryKey: ['vendor-profile', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['buyer-history'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-history-all-v4'] });
      queryClient.invalidateQueries({ queryKey: ['saved-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });

      toast.success(
        currentLanguage === 'ar'
          ? result.mode === 'updated'
            ? 'تم تحديث تقييمك'
            : 'شكراً لتقييمك'
          : result.mode === 'updated'
            ? 'Review updated'
            : 'Thanks for your review',
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل إرسال التقييم' : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {currentLanguage === 'ar'
              ? existingReview
                ? 'تحديث التقييم'
                : `قيّم ${sellerName}`
              : existingReview
                ? 'Update review'
                : `Review ${sellerName}`}
          </DialogTitle>
        </DialogHeader>

        <ReviewComposer
          currentLanguage={currentLanguage}
          sellerName={sellerName}
          rating={rating}
          hoveredRating={hoveredRating}
          reviewText={reviewText}
          isSubmitting={submitting}
          isEdit={Boolean(existingReview)}
          compact
          onRatingChange={setRating}
          onHoverRatingChange={setHoveredRating}
          onReviewTextChange={setReviewText}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={currentLanguage === 'ar' ? 'إرسال التقييم' : 'Submit review'}
          cancelLabel={currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
        />
      </DialogContent>
    </Dialog>
  );
};
