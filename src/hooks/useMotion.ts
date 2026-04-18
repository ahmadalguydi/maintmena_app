/**
 * useMotion()
 *
 * Central hook that returns motion primitives gated on `prefers-reduced-motion`.
 * When a user has requested reduced motion (OS-level accessibility), every
 * token flattens into a near-instant opacity fade. Otherwise the full
 * Siqal motion language is exposed.
 *
 * Usage:
 *   const m = useMotion();
 *   <motion.div {...m.variants.fadeInUp} transition={m.spring.smooth} />
 *
 * Exposes:
 *   – spring, easing, duration tokens (respecting reduced motion)
 *   – variants for common ceremonies (fish tug, breathe, ripple, seal…)
 *   – helper `pick(fullConfig)` that returns the full config or a reduced one
 *   – raw `isReduced` for callers that need to branch imperatively
 */

import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';
import {
    spring,
    duration,
    easeArrive,
    easeDepart,
    easeHumanize,
    easeStamp,
    easeBreathe,
    easeAnticipate,
    reducedTransition,
    reducedVariant,
    requestTicketCollapse,
    envelopeSeal,
    envelopeLiftoff,
    signalRing,
    fishTug,
    missionBreathe,
    reviewStarPress,
    composeStagger,
    requestSentCeremony,
    milestoneCeremony,
} from '@/lib/motion';

export function useMotion() {
    const prefersReducedMotion = useReducedMotion();

    return useMemo(() => {
        const isReduced = !!prefersReducedMotion;

        /** Return the full config when motion is allowed, else a flat fade. */
        function pick<T>(full: T, reduced?: T): T {
            if (isReduced) return reduced ?? (reducedVariant as unknown as T);
            return full;
        }

        /** Transition helper — flattens when reduced. */
        const transition = (t: Transition): Transition => (isReduced ? reducedTransition : t);

        /** Variants helper — flattens when reduced. */
        const variants = (v: Variants): Variants => (isReduced ? reducedVariant : v);

        return {
            isReduced,
            pick,
            transition,
            variants,
            spring: {
                gentle: isReduced ? reducedTransition : spring.gentle,
                smooth: isReduced ? reducedTransition : spring.smooth,
                snappy: isReduced ? reducedTransition : spring.snappy,
                bouncy: isReduced ? reducedTransition : spring.bouncy,
                committed: isReduced ? reducedTransition : spring.committed,
                tug: isReduced ? reducedTransition : spring.tug,
            },
            duration,
            easing: {
                arrive: easeArrive,
                depart: easeDepart,
                humanize: easeHumanize,
                stamp: easeStamp,
                breathe: easeBreathe,
                anticipate: easeAnticipate,
            },
            // Ceremonies
            ceremonies: {
                requestSent: requestSentCeremony,
                milestone: milestoneCeremony,
            },
            // Named variants
            v: {
                requestTicketCollapse: variants(requestTicketCollapse),
                envelopeSeal: variants(envelopeSeal),
                envelopeLiftoff: variants(envelopeLiftoff),
                signalRing: variants(signalRing),
                fishTug: variants(fishTug),
                missionBreathe: variants(missionBreathe),
            },
            reviewStarPress,
            composeStagger,
        };
    }, [prefersReducedMotion]);
}

export type UseMotionReturn = ReturnType<typeof useMotion>;
