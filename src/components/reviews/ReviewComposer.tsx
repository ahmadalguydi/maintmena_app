import { motion } from 'framer-motion';
import { MessageSquareQuote, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getReviewPromptChips, getReviewSentiment } from '@/lib/reviewFlow';

interface ReviewComposerProps {
  currentLanguage: 'en' | 'ar';
  sellerName?: string | null;
  rating: number;
  hoveredRating: number;
  reviewText: string;
  isSubmitting?: boolean;
  isEdit?: boolean;
  compact?: boolean;
  onRatingChange: (rating: number) => void;
  onHoverRatingChange: (rating: number) => void;
  onReviewTextChange: (value: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  cancelLabel?: string;
}

export const ReviewComposer = ({
  currentLanguage,
  sellerName,
  rating,
  hoveredRating,
  reviewText,
  isSubmitting = false,
  isEdit = false,
  compact = false,
  onRatingChange,
  onHoverRatingChange,
  onReviewTextChange,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
}: ReviewComposerProps) => {
  const isArabic = currentLanguage === 'ar';
  const sentiment = getReviewSentiment(rating, currentLanguage);
  const promptChips = getReviewPromptChips(rating, currentLanguage);

  const title = isArabic
    ? compact
      ? `قيّم ${sellerName || 'الفني'}`
      : `كيف كانت تجربتك مع ${sellerName || 'الفني'}؟`
    : compact
      ? `Rate ${sellerName || 'this provider'}`
      : `How was your experience with ${sellerName || 'this provider'}?`;

  const subtitle = isArabic
    ? 'تقييمك يساعد العميل اللي بعدك ويعطي صورة أوضح عن الخدمة.'
    : 'Specific feedback builds real trust across MaintMENA.';

  const helper = isArabic
    ? compact
      ? 'اختر التقييم، وإذا ودك أضف ملاحظة بسيطة.'
      : 'اختر التقييم، وإذا عندك ملاحظة سريعة أضفها.'
    : compact
      ? 'Pick a rating, then add a short note if needed.'
      : 'Start with a rating, then add any details that would help the next customer.';

  const appendPrompt = (prompt: string) => {
    if (!prompt || reviewText.includes(prompt)) {
      return;
    }

    onReviewTextChange(reviewText ? `${reviewText.trim()} ${prompt}` : prompt);
  };

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')} dir={isArabic ? 'rtl' : 'ltr'}>
      <div
        className={cn(
          compact ? 'rounded-2xl border border-border/60 bg-background/80 p-4' : 'rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-amber-50/70 dark:to-card p-5 shadow-[0_14px_40px_rgba(0,0,0,0.06)]',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            {!compact && (
              <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                <MessageSquareQuote size={14} />
                <span>{isArabic ? 'بعد اكتمال الطلب' : 'After job completion'}</span>
              </div>
            )}
            <div>
              <h3 className={cn(compact ? 'text-base font-semibold tracking-tight' : 'text-xl font-semibold tracking-tight', isArabic ? 'font-ar-display' : 'font-display')}>
                {title}
              </h3>
              {!compact && (
                <p className={cn('mt-1 text-sm text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className={cn('hidden flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 sm:flex', compact ? 'h-10 w-10' : 'h-12 w-12')}>
            <Sparkles size={22} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = star <= (hoveredRating || rating);
            return (
              <motion.button
                key={star}
                whileTap={{ scale: 0.92 }}
                onMouseEnter={() => onHoverRatingChange(star)}
                onMouseLeave={() => onHoverRatingChange(0)}
                onClick={() => onRatingChange(star)}
                type="button"
                className={cn(
                  'rounded-2xl border p-2.5 transition-all',
                  active
                    ? 'border-amber-300 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-500/15 shadow-sm'
                    : 'border-border/60 bg-background hover:border-amber-200 dark:hover:border-amber-700/40 hover:bg-amber-50/60 dark:hover:bg-amber-500/10',
                )}
              >
                <Star
                  size={compact ? 28 : 34}
                  className={cn(
                    'transition-colors',
                    active ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/60',
                  )}
                />
              </motion.button>
            );
          })}
        </div>

        <div className="text-center">
          <p className={cn('font-semibold text-foreground', isArabic ? 'font-ar-display' : 'font-display')}>
            {sentiment.title}
          </p>
          <p className={cn('mt-1 text-sm text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
            {rating > 0 ? sentiment.body : helper}
          </p>
        </div>
      </div>

      {promptChips.length > 0 && (
        <div className="space-y-2">
            <p className={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', isArabic ? 'font-ar-body' : 'font-body')}>
            {isArabic ? 'اقتراحات سريعة' : 'Helpful prompts'}
          </p>
          <div className="flex flex-wrap gap-2">
            {promptChips.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => appendPrompt(prompt)}
                className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className={cn('text-sm font-medium', isArabic ? 'font-ar-body' : 'font-body')}>
          {isArabic ? 'ملاحظتك' : 'Your feedback'}
        </label>
        <Textarea
          value={reviewText}
          onChange={(event) => onReviewTextChange(event.target.value)}
          placeholder={
            isArabic
              ? 'اكتب ملاحظة قصيرة تفيد العميل اللي بعدك...'
              : 'Write what the next customer should know about this experience...'
          }
          rows={compact ? 3 : 6}
          maxLength={500}
          className="resize-none rounded-[22px] border-border/60 bg-background/90"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{isEdit ? (isArabic ? 'أنت تعدّل على تقييمك الحالي' : 'Updating your current review') : (isArabic ? 'التعليق اختياري' : 'Comment is optional')}</span>
          <span>{reviewText.length}/500</span>
        </div>
      </div>

      <div className={cn('flex gap-3', compact && 'pt-1')}>
        {onCancel && cancelLabel && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onCancel}
            className={cn('h-12 flex-1 rounded-full', !compact && 'h-14')}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onSubmit}
          disabled={rating === 0 || isSubmitting}
          className={cn(
            'flex-1 rounded-full bg-gradient-to-r from-primary to-accent',
            compact ? 'h-12' : 'h-14',
          )}
        >
          {isSubmitting ? '...' : submitLabel}
        </Button>
      </div>
    </div>
  );
};
