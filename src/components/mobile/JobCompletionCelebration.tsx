import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptics } from '@/hooks/useHaptics';
import { celebrateFireworks, celebrateSuccess } from '@/lib/celebration';
import { useAnimation, AnimatePresence } from 'framer-motion';
import { LazyServiceLocationMap } from '@/components/maps/LazyServiceLocationMap';
import { getCelebrationCopy, localizeCategory } from '@/lib/translations';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface BuyerCelebrationData {
  variant: 'buyer';
  providerName: string;
  providerAvatar?: string;
  amount?: number;
  category?: string;
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

export const JobCompletionCelebration = ({ data, currentLanguage, onDismiss, onReview }: Props) => {
  const navigate = useNavigate();
  const { vibrate, notificationSuccess } = useHaptics();
  const firedRef = useRef(false);
  const isRTL = currentLanguage === 'ar';
  const isSeller = data.variant === 'seller';

  const amount = isSeller
    ? (data as SellerCelebrationData).amount
    : (data as BuyerCelebrationData).amount ?? 0;

  const jobTitle = (data as any).title; 
  const category = data.category;
  const avatar = isSeller ? (data as SellerCelebrationData).buyerAvatar : (data as BuyerCelebrationData).providerAvatar;
  const jobDate = data.date;
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
    } else {
      onDismiss();
      if (onReview) onReview();
    }
  }, [isSeller, onDismiss, navigate, onReview]);

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
      title: 'Great Job!',
      subtitle: isSeller
        ? 'Awaiting buyer approval. Make sure you left a good impression to get an excellent rating!'
        : 'Your job has been successfully completed by the pro.',
      earningsLabel: 'Earning Reward',
      jobSummaryPrefix: 'Job Summary',
      verifiedText: 'Verified Completion',
      primarySeller: 'View My Earnings',
      primaryBuyer: 'Rate the Service',
      secondary: 'Close',
      details: 'Details',
      provider: 'With',
      buyer: 'For',
    },
    ar: {
      title: dynamicCopy.title,
      subtitle: dynamicCopy.subtitle,
      earningsLabel: 'أرباحك بهالمهمة',
      jobSummaryPrefix: 'ملخص الطلب',
      verifiedText: 'إتمام موثق',
      primarySeller: 'شوف أرباحك',
      primaryBuyer: 'قيّم البطل',
      secondary: 'الرجوع للرئيسية',
      details: 'التفاصيل',
      provider: 'مع',
      buyer: 'لـ',
    },
  }[currentLanguage];

  const steps = isSeller ? SELLER_STEPS : BUYER_STEPS;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden bg-[#111111]"
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

      {/* â”€â”€ Top section: Glowing circle & text â”€â”€ */}
      <div className="flex flex-col items-center justify-center w-full px-6 pt-16 pb-4 z-10 relative shrink-0">
        {/* Glowing Orange Circle */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={emojiControls}
          className="relative mb-6"
        >
          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full bg-[#E5832D]/30 blur-[40px] transform scale-150" />
          
          {/* Main circle */}
          <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-[#FF9A44] to-[#D66512] shadow-inner flex items-center justify-center relative z-10">
            {/* The confetti emoji inside */}
            <div
              className="text-6xl"
              style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.3))' }}
            >
              🎉
            </div>
          </div>
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

        {/* BUYER: SHOW ELEGANT SUMMARY CARD (MIMICS HOME SCREEN) */}
        {!isSeller && (
          <motion.div
            className="w-full rounded-[24px] bg-[#1A1A1A] border border-white/5 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col mb-4"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.6 }}
          >
             {/* Map Preview at top */}
             <div className="h-28 w-full border-b border-white/5 relative overflow-hidden shrink-0">
                <LazyServiceLocationMap
                   currentLanguage={currentLanguage}
                   lat={(data as BuyerCelebrationData).lat}
                   lng={(data as BuyerCelebrationData).lng}
                   locationLabel={(data as BuyerCelebrationData).location || ''}
                   heightClassName="h-full"
                   className="rounded-none opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
             </div>

             <div className="p-6 pt-4 relative">
                {/* Verified Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit mb-5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{t.verifiedText}</span>
                </div>

                <div className="flex items-center gap-4 mb-6">
                   {/* Provider Avatar */}
                   <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl border border-white/10 p-0.5 overflow-hidden bg-[#222] shadow-xl">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full rounded-[14px] object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl bg-[#333]">👤</div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-[3px] ring-[#1A1A1A] text-white">
                        <Check size={10} strokeWidth={4} />
                      </div>
                   </div>
                   
                   <div className="min-w-0">
                      <p className={cn("text-white/40 text-[11px] mb-0.5 font-medium uppercase tracking-tight", isRTL ? "font-ar-body" : "font-body")}>
                        {isSeller ? t.buyer : t.provider} {(data as any).providerName || (data as any).buyerName}
                      </p>
                      <h3 className={cn("text-white font-bold text-[20px] leading-tight truncate", isRTL ? "font-ar-heading" : "font-heading")}>
                        {jobTitle || (isRTL ? 'طلب خدمة صيانة' : 'Maintenance Request')}
                      </h3>
                   </div>
                </div>

                {/* Info Row */}
                <div className="w-full grid grid-cols-2 gap-8 pt-5 border-t border-white/5">
                   <div>
                     <p className="text-white/30 text-[10px] mb-1.5 uppercase tracking-widest font-bold">{t.details}</p>
                     <p className="text-white/90 text-[14px] font-bold truncate">{localizeCategory(category, currentLanguage)}</p>
                   </div>
                   <div className={cn("border-white/5", isRTL ? "border-r pr-8" : "border-l pl-8")}>
                     <p className="text-white/30 text-[10px] mb-1.5 uppercase tracking-widest font-bold">Date</p>
                     <p className="text-white/90 text-[14px] font-bold">{jobDate || new Date().toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}</p>
                   </div>
                </div>
             </div>

             {/* Subtle scanline background effect */}
             <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 2px)', backgroundSize: '100% 2px' }} />
          </motion.div>
        )}
      </div>

      {/* â”€â”€ Bottom section: Actions â”€â”€ */}
      <div className="w-full pb-safe-or-8 pt-4 px-5 relative z-10 mt-auto bg-gradient-to-t from-[#000000]/95 via-[#000000]/80 to-transparent shrink-0">
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
    </motion.div>
  );
};



