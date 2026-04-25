import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { useAnimation } from 'framer-motion';
import { getCelebrationCopy, localizeCategory } from '@/lib/translations';
import { RequestSummaryCard } from '@/components/mobile/RequestSummaryCard';
import { CelebrationReviewModal } from '@/components/mobile/CelebrationReviewModal';
import { SERVICE_CATEGORIES } from '@/lib/serviceCategories';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BuyerCelebrationData {
  variant: 'buyer';
  providerName: string;
  providerAvatar?: string;
  providerId?: string;
  providerRating?: number;
  providerVerified?: boolean;
  amount?: number;
  category?: string;
  subIssue?: string;
  title?: string;
  date?: string;
  requestId: string;
  location?: string;
  time?: string;
  lat?: number;
  lng?: number;
}

export interface SellerCelebrationData {
  variant: 'seller';
  buyerName: string;
  buyerAvatar?: string;
  amount: number;
  category?: string;
  title?: string;
  date?: string;
  jobId: string;
}

export type CelebrationData = BuyerCelebrationData | SellerCelebrationData;

interface Props {
  data: CelebrationData;
  currentLanguage: 'en' | 'ar';
  onDismiss: () => void;
  onReview?: () => void;
  /**
   * Optional: when provided, the buyer's primary CTA opens the in-place
   * review modal and delegates submission to this callback (rather than
   * falling back to `onReview`, which is the legacy scroll-to-section flow).
   * The callback should resolve on success and throw on failure so the
   * modal can surface retry state.
   */
  onSubmitReview?: (rating: number, reviewText: string) => Promise<void> | void;
}

// ─── Category → icon lookup ──────────────────────────────────────────────────
// The celebration surface is rendered on a dark background. The light
// RequestSummaryCard pops against it; the icon tile inside the card echoes
// the buyer's original request category.
function getCategoryIcon(category: string | undefined): string {
  if (!category) return '✨';
  const key = category.toLowerCase().trim();
  for (const group of Object.values(SERVICE_CATEGORIES)) {
    for (const entry of group) {
      if (entry.key === key || entry.en.toLowerCase() === key || entry.ar === category) {
        return entry.icon;
      }
    }
  }
  // Fallback by substring
  if (key.includes('ac') || key.includes('hvac')) return '❄️';
  if (key.includes('plumb')) return '🚰';
  if (key.includes('elect')) return '⚡';
  if (key.includes('paint')) return '🎨';
  if (key.includes('clean')) return '🧹';
  if (key.includes('carpent') || key.includes('handy')) return '🔧';
  return '✨';
}

// â”€â”€â”€ Animated counter hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useCountUp(target: number, duration = 1600, delay = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const timeout = setTimeout(() => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // cubic-out
        setCount(Math.floor(eased * target * 100) / 100);
        if (progress < 1) requestAnimationFrame(tick);
        else setCount(target);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return count;
}

// â”€â”€â”€ Timeline steps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface TimelineStep {
  labelEn: string;
  labelAr: string;
}

const SELLER_STEPS: TimelineStep[] = [
  { labelEn: 'Scheduled', labelAr: 'مجدول' },
  { labelEn: 'Signed', labelAr: 'تم الاتفاق' },
  { labelEn: 'Working', labelAr: 'شغالين' },
  { labelEn: 'Complete', labelAr: 'تم التنفيذ' },
];

const BUYER_STEPS: TimelineStep[] = [
  { labelEn: 'Requested', labelAr: 'طلبناك' },
  { labelEn: 'Assigned', labelAr: 'في الطريق' },
  { labelEn: 'Working', labelAr: 'شغالين' },
  { labelEn: 'Done!', labelAr: 'خلصنا!' },
];

function TimelineBar({ steps, isRTL, currentLanguage }: { steps: TimelineStep[]; isRTL: boolean; currentLanguage: 'en' | 'ar' }) {
  return (
    <div className="w-full px-4 mb-4">
      <div className={cn('flex items-start justify-between relative', isRTL && 'flex-row-reverse')}>
        {/* Continuous background line */}
        <div className="absolute top-[15px] left-6 right-6 h-[2px] bg-white/10" />

        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex flex-col items-center gap-3 relative z-10" style={{ flex: 1 }}>
              {/* Connector line overlay (animated) */}
              <div className="absolute top-[15px] w-full flex items-center h-[2px] z-0 px-4" style={{ left: isRTL ? 'auto' : '50%', right: isRTL ? '50%' : 'auto' }}>
                {i < steps.length - 1 && (
                  <motion.div
                    className="w-full h-full bg-[#E5832D]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 + i * 0.2, ease: "easeInOut" }}
                    style={{ transformOrigin: isRTL ? 'right' : 'left' }}
                  />
                )}
              </div>

              {/* Step Circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.7 + i * 0.2 }}
                className={cn(
                  'w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 z-10',
                  isLast
                    ? 'bg-[#18181A] border-[2px] border-[#E5832D] shadow-[0_0_15px_rgba(229,131,45,0.4)]'
                    : 'bg-[#E5832D]'
                )}
              >
                <Check
                  size={14}
                  className={isLast ? 'text-[#E5832D]' : 'text-white'}
                  strokeWidth={3}
                />
              </motion.div>

              {/* Label */}
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.2 }}
                className={cn(
                  'text-[11px] text-center leading-tight whitespace-nowrap',
                  isLast ? 'text-[#E5832D] font-bold' : 'text-[#E5832D]',
                )}
              >
                {currentLanguage === 'ar' ? step.labelAr : step.labelEn}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import confetti from 'canvas-confetti';

export const JobCompletionCelebration = ({ data, currentLanguage, onDismiss, onReview, onSubmitReview }: Props) => {
  const navigate = useNavigate();
  const { vibrate, notificationSuccess } = useHaptics();
  const firedRef = useRef(false);
  const isRTL = currentLanguage === 'ar';
  const isSeller = data.variant === 'seller';
  const [showReviewModal, setShowReviewModal] = useState(false);

  const amount = isSeller
    ? (data as SellerCelebrationData).amount
    : (data as BuyerCelebrationData).amount ?? 0;

  const category = data.category;
  const categoryIcon = useMemo(() => getCategoryIcon(category), [category]);
  const emojiControls = useAnimation();
  
  // Memoize celebration copy so random string doesn't jump around on re-renders
  const dynamicCopy = useRef(getCelebrationCopy(category, isSeller)).current;

  const countedAmount = useCountUp(amount, 1600, 700);

  // Effect to handle the "Charged Explosion" sequence
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const runCelebration = async () => {
      // 1. Initial success haptic
      notificationSuccess();

      // 2. Squeeze Animation (Charge up)
      await emojiControls.start({
        scale: 0.82,
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } 
      });

      // 3. Release Explosion (Burst)
      vibrate('heavy');
      emojiControls.start({
        scale: [1.32, 1],
        transition: { 
          duration: 0.9, 
          times: [0, 1],
          ease: "easeOut" 
        }
      });

      // -- STAGE 1: THE BIG BANG (Initial Explosion) --
      // Using zIndex: 1000 to ensure it's on top of the overlay
      confetti({
        particleCount: 120, // Slightly less for "cleaner" feel
        spread: 100,
        origin: { y: 0.4 },
        startVelocity: 45,
        colors: ['#E5832D', '#FF9A44', '#FFFFFF', '#FFD700', '#FF3366', '#00BAFF'], // More colorful
        gravity: 0.9,
        scalar: 1.1,
        ticks: 300,
        zIndex: 1000, // FIX: Show on top of screen
      });
    };

    runCelebration();
  }, [emojiControls, notificationSuccess, vibrate]);

  const handlePrimary = useCallback(() => {
    if (isSeller) {
      onDismiss();
      navigate('/app/seller/earnings');
      return;
    }
    // Buyer path: prefer the in-place review modal; fall back to legacy scroll.
    if (onSubmitReview) {
      setShowReviewModal(true);
    } else {
      onDismiss();
      if (onReview) onReview();
    }
  }, [isSeller, onDismiss, navigate, onReview, onSubmitReview]);

  const handleReviewSubmit = useCallback(async (rating: number, reviewText: string) => {
    if (!onSubmitReview) return;
    await onSubmitReview(rating, reviewText);
    setShowReviewModal(false);
    onDismiss();
  }, [onSubmitReview, onDismiss]);

  const handleSecondary = useCallback(() => {
    onDismiss();
    if (isSeller) {
      navigate('/app/seller/home');
    } else {
      navigate('/app/buyer/home');
    }
  }, [isSeller, onDismiss, navigate]);

  const t = {
    en: {
      title: isSeller ? 'Job Closed!' : 'Great Job!',
      subtitle: isSeller
        ? 'The buyer confirmed the price and completion code. This request is officially complete.'
        : 'Your job has been successfully completed by the pro.',
      earningsLabel: 'Final Amount Recorded',
      primarySeller: 'View My Earnings',
      primaryBuyer: 'Rate the Service',
      secondary: 'Close',
    },
    ar: {
      title: isSeller ? 'تم إغلاق الطلب!' : dynamicCopy.title,
      subtitle: isSeller
        ? 'أكد العميل السعر ورمز الإغلاق. الطلب مكتمل وموثق الآن.'
        : dynamicCopy.subtitle,
      earningsLabel: 'المبلغ النهائي المسجل',
      primarySeller: 'شوف أرباحك',
      primaryBuyer: 'قيّم البطل',
      secondary: 'الرجوع للرئيسية',
    },
  }[currentLanguage];

  const steps = isSeller ? SELLER_STEPS : BUYER_STEPS;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden bg-[#14120f]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Dismiss button */}
      <motion.button
        className="absolute top-safe right-4 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 z-20 hover:bg-white/10 active:scale-95 transition-all"
        style={{ top: 'max(env(safe-area-inset-top), 24px)' }}
        onClick={onDismiss}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <X size={20} />
      </motion.button>

      {/* â”€â”€ Top section: Hero circle & text â”€â”€ */}
      <div className="flex flex-col items-center justify-center w-full px-6 pt-16 pb-4 z-10 relative shrink-0">
        {/* Simpler solid circle — matches spec: w-28 h-28, solid #D97725, soft tinted shadow */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={emojiControls}
          className="relative mb-6 w-28 h-28 bg-[#D97725] rounded-full flex items-center justify-center shadow-lg shadow-[#D97725]/20"
        >
          <span className="text-5xl leading-none">🎉</span>
        </motion.div>

        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <motion.h1
            className={cn(
              'text-[36px] font-extrabold text-white text-center leading-tight tracking-tight',
              isRTL ? 'font-ar-display' : 'font-heading',
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.3 }}
          >
            {t.title}
          </motion.h1>
          <motion.span
            initial={{ opacity: 0, scale: 0, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
            className="text-3xl"
          >
            🎊
          </motion.span>
        </div>

        {/* Subtitle */}
        <motion.p
          className={cn(
            'text-[15px] text-[#A1A1AA] text-center max-w-[300px] leading-relaxed',
            isRTL ? 'font-ar-body' : '',
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          {t.subtitle}
        </motion.p>
      </div>

      {/* â”€â”€ Middle section â”€â”€ */}
      <div className="w-full px-5 mt-2 z-10 flex-1 flex flex-col justify-start relative">
        {/* Timeline (Stepper) - Moved here ABOVE the card */}
        <TimelineBar steps={steps} isRTL={isRTL} currentLanguage={currentLanguage} />

        {/* SELLER: SHOW EARNINGS CARD */}
        {isSeller && amount > 0 && (
          <motion.div
            className="w-full rounded-[36px] bg-[#1A1A1A] border border-white/5 px-6 py-10 text-center relative overflow-hidden shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.6 }}
          >
            {/* Ambient glow inside card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-full bg-[#E5832D]/5 blur-[60px] pointer-events-none" />

            {/* Label */}
            <p className={cn(
              'text-[15px] text-[#E5832D] font-medium mb-4 relative z-10',
              isRTL ? 'font-ar-body' : '',
            )}>
              {t.earningsLabel}
            </p>

            {/* Amount */}
            <div className={cn('flex items-baseline gap-2 justify-center relative z-10', isRTL ? 'flex-row-reverse' : '')}>
              <span className="text-[#AE764B] text-3xl font-bold tracking-wider">SAR</span>
              <span className="text-white font-extrabold tracking-tight" style={{ fontSize: '64px', lineHeight: 1 }}>
                {countedAmount.toFixed(2)}
              </span>
            </div>

            {/* Subtle shimmer sweep */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 1.5, delay: 1.2, ease: 'easeInOut' }}
            />
          </motion.div>
        )}

        {/* BUYER: REQUEST SUMMARY CARD (matches home-screen language) */}
        {!isSeller && (() => {
          const buyer = data as BuyerCelebrationData;
          const fallbackDate = new Date().toLocaleDateString(
            currentLanguage === 'ar' ? 'ar-EG' : 'en-US',
            { day: 'numeric', month: 'short' },
          );
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.6 }}
              className="mb-4 dark"
            >
              <RequestSummaryCard
                forceDark
                currentLanguage={currentLanguage}
                category={localizeCategory(category, currentLanguage)}
                categoryIcon={<span>{categoryIcon}</span>}
                subIssue={buyer.subIssue ?? null}
                description={buyer.title ?? null}
                location={buyer.location ?? (isRTL ? 'الموقع' : 'Location')}
                time={buyer.date || fallbackDate}
                lat={buyer.lat}
                lng={buyer.lng}
                statusTitle={isRTL ? 'مكتمل' : 'Completed'}
                statusSubtitle={isRTL ? 'تم التوثيق' : 'Verified completion'}
                statusColor="bg-green-500"
                providerName={buyer.providerName}
                providerAvatar={buyer.providerAvatar}
                providerId={buyer.providerId}
                providerRating={buyer.providerRating}
                providerVerified={buyer.providerVerified}
                isProviderAssigned
                onViewProvider={
                  buyer.providerId
                    ? () => {
                        onDismiss();
                        navigate(`/app/buyer/vendor/${buyer.providerId}`);
                      }
                    : undefined
                }
              />
            </motion.div>
          );
        })()}
      </div>

      {/* â”€â”€ Bottom section: Actions â”€â”€ */}
      <div className="w-full pb-safe-or-8 pt-4 px-5 relative z-10 mt-auto bg-gradient-to-t from-[#14120f]/95 via-[#14120f]/80 to-transparent shrink-0">
        {/* Timeline removed from here */}

        {/* CTA buttons */}
        <motion.div
          className="space-y-3 mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          {/* Primary CTA */}
          <button
            onClick={handlePrimary}
            className={cn(
              'w-full h-14 rounded-full font-bold text-[17px] flex items-center justify-center transition-transform active:scale-[0.98] bg-[#E5832D] text-white shadow-[0_8px_20px_rgba(229,131,45,0.3)] hover:bg-[#D66512]',
              isRTL ? 'font-ar-body' : '',
            )}
          >
            {isSeller ? t.primarySeller : t.primaryBuyer}
          </button>

          {/* Secondary CTA */}
          <button
            onClick={handleSecondary}
            className={cn(
              'w-full h-14 rounded-full font-bold text-[17px] flex items-center justify-center transition-transform active:scale-[0.98] bg-transparent text-[#A1A1AA] hover:bg-white/5',
              isRTL ? 'font-ar-body' : '',
            )}
          >
            {t.secondary}
          </button>
        </motion.div>
      </div>

      {/* In-place review modal (buyer only, requires onSubmitReview) */}
      {!isSeller && onSubmitReview && (
        <CelebrationReviewModal
          open={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={handleReviewSubmit}
          currentLanguage={currentLanguage}
          sellerName={(data as BuyerCelebrationData).providerName}
        />
      )}
    </motion.div>
  );
};



