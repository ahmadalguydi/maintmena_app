/**
 * FishOnTheLineCard  ·  Part 2, Moment 2
 *
 * An opportunity card that FEELS ALIVE. Wraps `OpportunityCard` and adds:
 *
 *   1. TUG          — a micro 3% scale+bob the instant it mounts, as if the
 *                     fish on the line just tugged the rod.
 *   2. COLOR DRAIN  — as the expiration countdown approaches 0, the
 *                     saturation of the card's ambient gradient drains
 *                     from full → 55% → 25%, creating visceral urgency
 *                     without being alarmist.
 *   3. HEARTBEAT    — at ≤5s remaining, a 0.9s heartbeat pulse kicks in.
 *   4. ACCEPTED STAMP — when the seller taps Accept, a Saudi-green "قُبِل"
 *                     wax stamp rotates 8° and lands with a haptic punch.
 *
 * This is a pure presentational wrapper — it does not change any API
 * surface of the existing OpportunityCard. Pass the same props through;
 * the tug/drain/heartbeat are derived from `expiresAt`.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OpportunityCard } from './OpportunityCard';
import { useMotion } from '@/hooks/useMotion';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

type OpportunityCardProps = React.ComponentProps<typeof OpportunityCard>;

interface FishOnTheLineCardProps extends Omit<OpportunityCardProps, 'onAccept'> {
    onAccept: (id: string) => void;
    /** Total window for the opportunity in seconds — used to compute saturation. */
    totalWindowSec?: number;
}

/**
 * Compute a 0..1 urgency value.
 *   1 = fresh, 0 = expired.
 */
function computeFreshness(expiresAt: Date | undefined, totalSec: number): number {
    if (!expiresAt) return 1;
    const remaining = (expiresAt.getTime() - Date.now()) / 1000;
    return Math.max(0, Math.min(1, remaining / totalSec));
}

export function FishOnTheLineCard({
    totalWindowSec = 120,
    onAccept,
    expiresAt,
    currentLanguage,
    ...rest
}: FishOnTheLineCardProps) {
    const m = useMotion();
    const [stamped, setStamped] = useState(false);
    const [freshness, setFreshness] = useState(() => computeFreshness(expiresAt, totalWindowSec));
    const mounted = useRef(false);

    // Poll urgency once per second — cheap and idempotent.
    useEffect(() => {
        if (!expiresAt) return;
        const t = setInterval(() => setFreshness(computeFreshness(expiresAt, totalWindowSec)), 1000);
        return () => clearInterval(t);
    }, [expiresAt, totalWindowSec]);

    // Tug on mount — only the first time.
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            // Light tactile tap to signal arrival.
            haptics.selection();
        }
    }, []);

    // Heartbeat kicks in when ≤5s remain.
    // Derived from `freshness` (which ticks every second) so the memo
    // re-evaluates on schedule without referencing Date.now().
    const heartbeating = useMemo(() => {
        if (!expiresAt) return false;
        const remainingSec = freshness * totalWindowSec;
        return remainingSec > 0 && remainingSec <= 5;
    }, [expiresAt, freshness, totalWindowSec]);

    // Accept handler with ceremony
    const handleAccept = (id: string) => {
        haptics.heavy();
        setStamped(true);
        // Delay the parent's accept so the stamp is visible
        setTimeout(() => onAccept(id), m.isReduced ? 0 : 520);
    };

    const saturation = m.isReduced ? 1 : Math.max(0.25, 0.55 + freshness * 0.45);
    const bgGradient = `linear-gradient(180deg, rgba(218,165,32,${0.04 * freshness}) 0%, rgba(16,185,129,${0.03 * freshness}) 100%)`;

    return (
        <motion.div
            className={cn('relative')}
            // Tug-on-mount
            initial={m.isReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={m.isReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            transition={m.isReduced ? { duration: 0.01 } : m.spring.tug}
            style={{
                filter: m.isReduced ? undefined : `saturate(${saturation})`,
                background: bgGradient,
                borderRadius: 24,
                transition: 'filter 400ms linear',
            }}
        >
            {/* Heartbeat pulse wrapper (only when < 5s) */}
            <motion.div
                animate={heartbeating ? {
                    scale: [1, 1.018, 1, 1.018, 1],
                } : { scale: 1 }}
                transition={heartbeating ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            >
                <OpportunityCard
                    {...rest}
                    expiresAt={expiresAt}
                    currentLanguage={currentLanguage}
                    onAccept={handleAccept}
                />
            </motion.div>

            {/* Accepted stamp */}
            <AnimatePresence>
                {stamped && (
                    <motion.div
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 1.8, rotate: -14 }}
                        animate={{ opacity: 1, scale: 1, rotate: 8 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 14, mass: 0.7 }}
                    >
                        <div
                            className={cn(
                                'relative rounded-3xl border-[3px] border-emerald-600/80 bg-emerald-500/10 backdrop-blur-sm px-8 py-4 shadow-lg',
                            )}
                            style={{ boxShadow: '0 12px 40px rgba(4, 120, 87, 0.35)' }}
                        >
                            <span
                                className={cn(
                                    'text-2xl font-black tracking-wider text-emerald-700 dark:text-emerald-400',
                                    currentLanguage === 'ar' ? 'font-ar-display' : 'font-display',
                                )}
                                style={{ letterSpacing: currentLanguage === 'ar' ? '0.08em' : '0.15em' }}
                            >
                                {currentLanguage === 'ar' ? 'قُبِل' : 'ACCEPTED'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
