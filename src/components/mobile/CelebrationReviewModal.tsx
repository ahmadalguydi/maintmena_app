import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CelebrationReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, reviewText: string) => Promise<void> | void;
  currentLanguage: 'en' | 'ar';
  sellerName?: string;
}

/**
 * Dark-theme review modal for the celebration flow.
 *
 * Progressive reveal: only the star row is visible until a rating is chosen;
 * the textarea and submit button fade/slide in after the first star press.
 * Matches the #1E1B18 / #D97725 spec used on the celebration surface so the
 * transition from the completion screen into the rating ritual stays
 * tonally continuous.
 */
export const CelebrationReviewModal = ({
  open,
  onClose,
  onSubmit,
  currentLanguage,
  sellerName,
}: CelebrationReviewModalProps) => {
  const isArabic = currentLanguage === 'ar';
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      // allow exit animation to play before nuking state
      const timer = setTimeout(() => {
        setRating(0);
        setHovered(0);
        setReviewText('');
        setSubmitting(false);
      }, 220);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, submitting]);

  const handleStar = useCallback((n: number) => {
    setRating(n);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, reviewText);
      // Parent is responsible for closing after success via onClose prop
    } catch {
      // Parent surfaces the error via toast; keep modal open so user can retry
      setSubmitting(false);
    }
  }, [rating, reviewText, submitting, onSubmit]);

  const titleText = isArabic ? 'كيف كانت التجربة؟' : 'How was the experience?';
  const subtitleText = sellerName
    ? isArabic
      ? `شاركنا رأيك في ${sellerName}`
      : `Tell us about ${sellerName}`
    : isArabic
      ? 'تقييمك يساعد غيرك يختار صح'
      : 'Your review helps others choose well';
  const placeholderText = isArabic ? 'شاركنا رأيك...' : 'Share your experience...';
  const submitText = isArabic ? 'إرسال التقييم' : 'Send review';
  const submittingText = isArabic ? 'جاري الإرسال...' : 'Sending...';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="celebration-review-modal"
          className="fixed inset-0 z-[300] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={isArabic ? 'rtl' : 'ltr'}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !submitting && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[420px] bg-[#1E1B18] p-6 rounded-[2rem] border border-white/5 space-y-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              aria-label={isArabic ? 'إغلاق' : 'Close'}
              disabled={submitting}
              className={cn(
                'absolute top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 disabled:opacity-40',
                isArabic ? 'left-3' : 'right-3',
              )}
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div className="text-center space-y-1 pt-1">
              <h3
                className={cn(
                  'text-center font-bold text-xl text-white',
                  isArabic ? 'font-ar-display' : 'font-display',
                )}
              >
                {titleText}
              </h3>
              <p
                className={cn(
                  'text-sm text-white/50',
                  isArabic ? 'font-ar-body' : 'font-body',
                )}
              >
                {subtitleText}
              </p>
            </div>

            {/* Stars */}
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => {
                const isFilled = (hovered || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}`}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => handleStar(n)}
                    disabled={submitting}
                    className={cn(
                      'hover:scale-125 hover:-rotate-6 transition-all duration-300 focus:outline-none disabled:opacity-50',
                      isFilled ? 'text-yellow-500' : 'text-white/25',
                    )}
                  >
                    <Star
                      size={32}
                      className={cn(
                        'transition-all duration-200',
                        isFilled && 'fill-current drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]',
                      )}
                      strokeWidth={isFilled ? 2 : 1.5}
                    />
                  </button>
                );
              })}
            </div>

            {/* Progressive reveal: textarea + submit appear after first star */}
            <AnimatePresence initial={false}>
              {rating > 0 && (
                <motion.div
                  key="text-options"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={placeholderText}
                      disabled={submitting}
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className={cn(
                        'w-full bg-black/20 border border-white/10 text-white placeholder:text-white/20 min-h-[100px] rounded-xl px-4 py-3 text-base transition-colors resize-none',
                        'focus:outline-none focus:border-[#D97725]/50',
                        'disabled:opacity-50',
                        isArabic ? 'font-ar-body' : 'font-body',
                      )}
                    />
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || !rating}
                      className={cn(
                        'w-full bg-[#D97725] hover:opacity-90 text-white rounded-xl h-12 font-bold shadow-lg shadow-[#D97725]/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
                        isArabic ? 'font-ar-body' : 'font-body',
                      )}
                    >
                      {submitting ? submittingText : submitText}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
