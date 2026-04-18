/**
 * ReviewCeremony  ·  Part 2, Moment 4
 *
 * Replaces the "toss-a-rating-and-go" pattern. A review is the moment a buyer
 * gives a seller permission to stay in their life — it is the *trust ceremony*.
 * We honor that with choreography:
 *
 *   – Each star press fires a haptic that **escalates** in intensity (1→5).
 *   – When the 5th star is selected, a Saudi green + gold particle burst
 *     emits from the stars, an ambient halo settles around the seller's avatar,
 *     and a subtle geometric rosette rotates once before fading.
 *   – If ≤3 stars, we show a compassionate support path (what went wrong?)
 *     with gentle motion — no celebration.
 *
 * The component is input-shaped: it owns the star selection only. Submission
 * is handled by the parent (the review composer keeps its existing mutation).
 * The caller passes `onRatingChange(rating, isFinal)` for both interactive
 * and final-commit ticks.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMotion } from '@/hooks/useMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface ReviewCeremonyProps {
    currentLanguage: 'en' | 'ar';
    initialRating?: number;
    /** Avatar URL of the seller being reviewed — the halo lands here. */
    sellerAvatarUrl?: string;
    sellerName?: string;
    onRatingChange: (rating: number, isFinal: boolean) => void;
}

const SAUDI_GREEN = '#047857';
const SAUDI_GOLD = '#B45309';

export function ReviewCeremony({
    currentLanguage,
    initialRating = 0,
    sellerAvatarUrl,
    sellerName,
    onRatingChange,
}: ReviewCeremonyProps) {
    const m = useMotion();
    const [rating, setRating] = useState(initialRating);
    const [hovered, setHovered] = useState(0);
    const [burstKey, setBurstKey] = useState(0);

    const labels = currentLanguage === 'ar'
        ? ['', 'محبط', 'متوسط', 'تمام', 'ممتاز', 'أسطوري']
        : ['', 'Rough', 'Okay', 'Good', 'Great', 'Elite'];

    const ceremonyTitle = currentLanguage === 'ar' ? 'كيف كانت التجربة؟' : 'How was the experience?';
    const ceremonySubtitle = sellerName
        ? (currentLanguage === 'ar' ? `لـ ${sellerName}` : `for ${sellerName}`)
        : '';

    // Escalating haptic intensity by star rank
    const hapticForStar = (n: number) => {
        switch (n) {
            case 1: return haptics.selection();
            case 2: return haptics.light();
            case 3: return haptics.medium();
            case 4: return haptics.heavy();
            case 5: return haptics.celebration();
            default: return;
        }
    };

    const handleStarClick = (n: number) => {
        hapticForStar(n);
        setRating(n);
        const isFinal = n === 5;
        onRatingChange(n, isFinal);
        if (n === 5 && !m.isReduced) fireCeremony();
    };

    const fireCeremony = () => {
        setBurstKey((k) => k + 1);
        // Saudi green/gold confetti, medium
        const colors = [SAUDI_GREEN, SAUDI_GOLD, '#FBBF24', '#059669'];
        // Two bursts slightly offset
        confetti({
            particleCount: 45,
            spread: 70,
            origin: { x: 0.5, y: 0.45 },
            colors,
            ticks: 180,
            gravity: 0.9,
            scalar: 1.15,
            shapes: ['circle', 'square'],
            startVelocity: 35,
        });
        setTimeout(() => {
            confetti({
                particleCount: 30,
                spread: 120,
                origin: { x: 0.5, y: 0.4 },
                colors,
                ticks: 200,
                gravity: 0.6,
                scalar: 0.9,
                startVelocity: 25,
            });
        }, 120);
    };

    const effectiveRating = hovered || rating;

    return (
        <div
            className="relative flex flex-col items-center gap-6 py-8"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
        >
            <div className="text-center space-y-1">
                <h3 className={cn(
                    'text-xl font-bold text-foreground',
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                )}>
                    {ceremonyTitle}
                </h3>
                {ceremonySubtitle && (
                    <p className={cn(
                        'text-sm text-muted-foreground',
                        currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                    )}>
                        {ceremonySubtitle}
                    </p>
                )}
            </div>

            {/* Seller avatar + halo */}
            {sellerAvatarUrl && (
                <div className="relative h-20 w-20">
                    <AnimatePresence>
                        {rating >= 4 && !m.isReduced && (
                            <motion.div
                                key={`halo-${rating}`}
                                className="absolute inset-[-12px] rounded-full"
                                style={{
                                    background: `radial-gradient(circle, ${rating === 5 ? SAUDI_GOLD : SAUDI_GREEN}33 0%, transparent 70%)`,
                                }}
                                initial={{ scale: 0.7, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, ease: m.easing.arrive as number[] | undefined }}
                            />
                        )}
                    </AnimatePresence>
                    <img
                        src={sellerAvatarUrl}
                        alt=""
                        className="relative h-20 w-20 rounded-full object-cover border-2 border-background shadow-lg"
                    />
                </div>
            )}

            {/* Geometric rosette — only fires on 5-star commit */}
            <AnimatePresence>
                {rating === 5 && !m.isReduced && (
                    <SaudiRosette key={`rosette-${burstKey}`} />
                )}
            </AnimatePresence>

            {/* Stars */}
            <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                    <motion.button
                        key={n}
                        type="button"
                        aria-label={`${n} ${labels[n]}`}
                        onMouseEnter={() => setHovered(n)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => handleStarClick(n)}
                        whileTap={m.isReduced ? undefined : { scale: 0.82 }}
                        animate={effectiveRating >= n && !m.isReduced ? { scale: 1.08, rotate: [0, -8, 0] } : { scale: 1 }}
                        transition={m.reviewStarPress(n)}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full p-1"
                    >
                        <Star
                            size={40}
                            className={cn(
                                'transition-colors duration-200',
                                effectiveRating >= n
                                    ? 'fill-amber-400 text-amber-500 drop-shadow'
                                    : 'text-muted-foreground/40',
                            )}
                            strokeWidth={1.5}
                        />
                    </motion.button>
                ))}
            </div>

            {/* Rating label */}
            <div className="min-h-[24px]">
                <AnimatePresence mode="wait">
                    {effectiveRating > 0 && (
                        <motion.p
                            key={effectiveRating}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                'text-sm font-semibold',
                                effectiveRating >= 4 ? 'text-emerald-600' : 'text-foreground',
                                currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                            )}
                        >
                            {labels[effectiveRating]}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

/**
 * An 8-petal Saudi-inspired rosette that rotates once before fading.
 * Used only in the full 5-star trust ceremony.
 */
function SaudiRosette() {
    return (
        <motion.svg
            className="absolute top-10 left-1/2 -translate-x-1/2 pointer-events-none"
            width={240}
            height={240}
            viewBox="0 0 240 240"
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: [0, 0.35, 0], scale: [0.6, 1.1, 1.25], rotate: 45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <defs>
                <radialGradient id="rose-g" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={SAUDI_GOLD} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={SAUDI_GREEN} stopOpacity="0" />
                </radialGradient>
            </defs>
            {[...Array(8)].map((_, i) => (
                <ellipse
                    key={i}
                    cx="120"
                    cy="120"
                    rx="30"
                    ry="90"
                    fill="url(#rose-g)"
                    transform={`rotate(${i * 22.5} 120 120)`}
                />
            ))}
            <circle cx="120" cy="120" r="14" fill={SAUDI_GOLD} opacity="0.25" />
        </motion.svg>
    );
}
