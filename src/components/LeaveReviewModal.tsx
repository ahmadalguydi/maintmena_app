import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
  currentLanguage = 'en'
}: LeaveReviewModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error(currentLanguage === 'ar' ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
      return;
    }

    if (rating === 0) {
      toast.error(currentLanguage === 'ar' ? 'يرجى اختيار تقييم' : 'Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('seller_reviews')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('buyer_id', user.id)
        .eq('request_id', requestId || null)
        .maybeSingle();

      if (existingReview) {
        toast.error(currentLanguage === 'ar' ? 'لقد قدمت تقييماً بالفعل' : 'You have already reviewed this seller');
        setSubmitting(false);
        return;
      }

      // Insert the review
      const { error: insertError } = await supabase
        .from('seller_reviews')
        .insert({
          seller_id: sellerId,
          buyer_id: user.id,
          request_id: requestId || null,
          rating,
          review_text: reviewText.trim() || null
        });

      if (insertError) throw insertError;

      // Update seller's average rating
      const { data: allReviews } = await supabase
        .from('seller_reviews')
        .select('rating')
        .eq('seller_id', sellerId);

      if (allReviews && allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from('profiles')
          .update({ seller_rating: avgRating })
          .eq('id', sellerId);
      }

      toast.success(currentLanguage === 'ar' ? 'شكراً لتقييمك!' : 'Thank you for your review!');
      onOpenChange(false);
      if (onSuccess) onSuccess();

      // Reset form
      setRating(0);
      setReviewText('');
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(currentLanguage === 'ar' ? 'فشل إرسال التقييم' : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {currentLanguage === 'ar' ? `تقييم ${sellerName}` : `Review ${sellerName}`}
          </DialogTitle>
          <DialogDescription>
            {currentLanguage === 'ar'
              ? 'شارك تجربتك مع هذا المزود لمساعدة الآخرين'
              : 'Share your experience with this service provider'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {currentLanguage === 'ar' ? 'التقييم *' : 'Rating *'}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                      }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted-foreground ml-2">
                  {rating === 1 && (currentLanguage === 'ar' ? 'ضعيف' : 'Poor')}
                  {rating === 2 && (currentLanguage === 'ar' ? 'مقبول' : 'Fair')}
                  {rating === 3 && (currentLanguage === 'ar' ? 'جيد' : 'Good')}
                  {rating === 4 && (currentLanguage === 'ar' ? 'جيد جداً' : 'Very Good')}
                  {rating === 5 && (currentLanguage === 'ar' ? 'ممتاز' : 'Excellent')}
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {currentLanguage === 'ar' ? 'تعليقك (اختياري)' : 'Your Review (Optional)'}
            </label>
            <Textarea
              placeholder={
                currentLanguage === 'ar'
                  ? 'شارك تفاصيل تجربتك...'
                  : 'Share details about your experience...'
              }
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {reviewText.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {currentLanguage === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || rating === 0}>
            {submitting
              ? (currentLanguage === 'ar' ? 'جاري الإرسال...' : 'Submitting...')
              : (currentLanguage === 'ar' ? 'إرسال التقييم' : 'Submit Review')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
