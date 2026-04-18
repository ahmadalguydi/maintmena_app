/**
 * RequestSentChoreography  ·  Part 2, Moment 1
 *
 * The 3-beat ceremony that plays the instant a buyer submits a request.
 * This is the first place we ask the buyer for trust ("we've got it from here")
 * and it sets the tone for the entire journey.
 *
 * Beats:
 *   1. COLLAPSE — the form visually compacts into a "ticket" card
 *   2. SEAL     — an envelope flap closes over the ticket (wax-stamp spring)
 *   3. RIPPLE   — the envelope lifts off while three concentric signal rings
 *                 pulse outward from a subtle tower icon ("broadcasting to pros")
 *
 * The whole thing lasts ~2s (instant in reduced-motion mode). When it finishes,
 * `onDone()` fires — the caller typically navigates to the activity screen.
 *
 * Usage:
 *   {showSentCeremony && (
 *     <RequestSentChoreography
 *       currentLanguage="en"
 *       serviceLabel="AC Maintenance"
 *       onDone={() => navigate('/app/buyer/activity')}
 *     />
 *   )}
 */

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, Check } from 'lucide-react';
import { useMotion } from '@/hooks/useMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface RequestSentChoreographyProps {
    currentLanguage: 'en' | 'ar';
    serviceLabel?: string;
    onDone: () => void;
}

export function RequestSentChoreography({
    currentLanguage,
    serviceLabel,
    onDone,
}: RequestSentChoreographyProps) {
    const motion$ = useMotion();
    const fired = useRef(false);

    useEffect(() => {
        // Sequenced haptics across the three beats
        const timers: ReturnType<typeof setTimeout>[] = [];
        timers.push(setTimeout(() => haptics.selection(), 0)); // collapse
        timers.push(setTimeout(() => haptics.medium(), 450)); // seal
        timers.push(setTimeout(() => haptics.success(), 900)); // ripple
        const doneDelay = motion$.isReduced ? 300 : 2200;
        timers.push(setTimeout(() => {
            if (!fired.current) {
                fired.current = true;
                onDone();
            }
        }, doneDelay));
        return () => { timers.forEach((t) => clearTimeout(t)); };
    }, [onDone, motion$.isReduced]);

    const copy = currentLanguage === 'ar'
        ? {
            title: 'طلبك انطلق',
            subtitle: 'نوصلها لأقرب الفنيين المتاحين الآن',
            reassure: 'ما حاجة تفضل الشاشة — راح نخبرك أول ما يوافق فني.',
        }
        : {
            title: 'Sent to pros',
            subtitle: 'Broadcasting to the nearest available technicians',
            reassure: 'No need to wait here — we\'ll notify you the moment someone accepts.',
        };

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl px-6"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="status"
            aria-live="polite"
        >
            {/* Stage */}
            <div className="relative h-52 w-52 flex items-center justify-center">
                {/* BEAT 3: Concentric signal rings (rendered behind) */}
                <SignalRings delay={0.9} reduced={motion$.isReduced} />

                {/* BEAT 1 + 2: Ticket that collapses then seals */}
                <motion.div
                    className="absolute h-32 w-40 rounded-2xl bg-primary text-primary-foreground shadow-[0_20px_60px_rgb(0,0,0,0.18)] flex flex-col items-center justify-center gap-1"
                    initial={{ scaleY: 1.4, scaleX: 1.2, opacity: 0, y: 20 }}
                    animate={{ scaleY: 1, scaleX: 1, opacity: 1, y: 0 }}
                    transition={motion$.spring.snappy}
                    aria-hidden
                >
                    <Radio className="h-8 w-8" strokeWidth={1.5} />
                    {serviceLabel && (
                        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                            {serviceLabel}
                        </span>
                    )}
                </motion.div>

                {/* BEAT 2: Envelope flap seal (animates from top) */}
                <AnimatePresence>
                    <motion.div
                        key="seal"
                        className="absolute top-0 h-16 w-40 origin-top"
                        initial={{ rotateX: -90, opacity: 0 }}
                        animate={{ rotateX: 0, opacity: 1 }}
                        transition={{ delay: motion$.isReduced ? 0 : 0.5, duration: 0.3, ease: motion$.easing.stamp }}
                    >
                        <div
                            className="h-full w-full rounded-t-2xl bg-primary/90"
                            style={{
                                clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                            }}
                        />
                        {/* Wax seal in the center */}
                        <motion.div
                            className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                                delay: motion$.isReduced ? 0 : 0.75,
                                type: 'spring',
                                stiffness: 500,
                                damping: 18,
                            }}
                        >
                            <Check className="h-4 w-4" strokeWidth={3} />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Text reveal (post-beat) */}
            <motion.div
                className="mt-10 text-center max-w-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: motion$.isReduced ? 0 : 1.1, duration: 0.4, ease: motion$.easing.arrive }}
            >
                <h2 className={cn(
                    'text-2xl font-bold text-foreground mb-2',
                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                )}>
                    {copy.title}
                </h2>
                <p className={cn(
                    'text-sm text-muted-foreground leading-relaxed',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                )}>
                    {copy.subtitle}
                </p>
                <p className={cn(
                    'mt-4 text-xs text-muted-foreground/80 leading-relaxed',
                    currentLanguage === 'ar' ? 'font-ar-body' : 'font-body',
                )}>
                    {copy.reassure}
                </p>
            </motion.div>
        </motion.div>
    );
}

/**
 * Three concentric rings that expand & fade, staggered ~220ms apart.
 * Each ring starts at ~24px and grows to ~220px.
 */
function SignalRings({ delay, reduced }: { delay: number; reduced: boolean }) {
    if (reduced) return null;
    return (
        <>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    className="absolute h-6 w-6 rounded-full border-2 border-primary/40"
                    initial={{ scale: 0.3, opacity: 0.9 }}
                    animate={{ scale: 9, opacity: 0 }}
                    transition={{
                        delay: delay + i * 0.22,
                        duration: 1.6,
                        ease: [0.16, 1, 0.3, 1],
                        repeat: Infinity,
                    }}
                />
            ))}
        </>
    );
}
