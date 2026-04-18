/**
 * Motion Token System — Siqal Design Language
 *
 * Purpose-shaped motion primitives that make animations feel human, not robotic.
 * Layered on top of the Apple-inspired spring library (`animations.ts`), this file
 * provides the higher-level "choreography vocabulary" the app uses for:
 *
 *   – Request Submit (3-beat ceremony)
 *   – Fish-on-the-Line opportunity (tug + drain)
 *   – Mission Mode (breathing + flow state)
 *   – Review Ceremony (escalating haptics + geometric burst)
 *   – Notification Center (sweep / spine)
 *   – Milestone Celebrations (Saudi geometric art)
 *
 * All public tokens respect `prefers-reduced-motion` when accessed through
 * `useMotion()` from `@/hooks/useMotion`.
 *
 * References:
 *   – Dan Saffer, Microinteractions (Trigger → Rules → Feedback → Loops)
 *   – Issara Willenskomer, 12 Principles of UX in Motion
 *   – Val Head, Designing Interface Animation
 *   – Rachel Nabors, Animation at Work
 */

import type { Transition, Variants } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════
// EASINGS
// Each curve has an *intent*. Pick by meaning, not look.
// ═══════════════════════════════════════════════════════════════════════════

/** UI element arrives on screen. Decelerates gently. "Settling in." */
export const easeArrive = [0.16, 1, 0.3, 1] as const;

/** UI element departs. Accelerates. "Getting out of the way." */
export const easeDepart = [0.7, 0, 0.84, 0] as const;

/** Used when an element pulls back before moving forward (rubber-band). */
export const easeAnticipate = [0.68, -0.55, 0.27, 1.55] as const;

/** Balanced motion, good default when in doubt. */
export const easeHumanize = [0.4, 0.0, 0.2, 1] as const;

/** Organic, breath-like. Used for living ambient surfaces (Mission Mode aura). */
export const easeBreathe = [0.45, 0.05, 0.55, 0.95] as const;

/** Sharp, decisive. "This is a firm outcome." (Accept stamp, commit action) */
export const easeStamp = [0.85, 0, 0.15, 1] as const;

// ═══════════════════════════════════════════════════════════════════════════
// DURATIONS (seconds — Framer Motion native unit)
// ═══════════════════════════════════════════════════════════════════════════

export const duration = {
    /** ≤120ms — imperceptible, state flips, hover */
    instant: 0.12,
    /** Button press, tab switch */
    fast: 0.18,
    /** Card transitions, small reveals */
    quick: 0.25,
    /** Default "comfortable" duration */
    base: 0.35,
    /** Sheets, modals, ceremony beats */
    medium: 0.5,
    /** Multi-beat ceremonies, morning digest reveal */
    slow: 0.8,
    /** Ambient / storytelling moments (milestone celebrations) */
    cinematic: 1.4,
    /** Breathing cycle (4s one full inhale–exhale) */
    breath: 4,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// SPRINGS — tuned for tactile feedback
// ═══════════════════════════════════════════════════════════════════════════

export const spring = {
    /** Subtle, elegant. For modals, cards settling. */
    gentle: { type: 'spring', stiffness: 180, damping: 26, mass: 1 } as Transition,
    /** Balanced default. For most interactive elements. */
    smooth: { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 } as Transition,
    /** Quick and alert. For accept/decline buttons, toggles. */
    snappy: { type: 'spring', stiffness: 420, damping: 32 } as Transition,
    /** Playful, celebratory. For success pops, confetti-adjacent. */
    bouncy: { type: 'spring', stiffness: 500, damping: 22, mass: 0.5 } as Transition,
    /** Slow, heavy. Commits and commitments. */
    committed: { type: 'spring', stiffness: 140, damping: 30, mass: 1.2 } as Transition,
    /** Tug — for Fish-on-the-Line cards pulling toward the viewer. */
    tug: { type: 'spring', stiffness: 600, damping: 18, mass: 0.9 } as Transition,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// CEREMONY — Multi-beat choreographies
// A ceremony is a named sequence of meaningful beats.
// ═══════════════════════════════════════════════════════════════════════════

export interface CeremonyBeat {
    name: string;
    delay: number; // seconds from ceremony start
    duration: number;
}

/** 3-beat Request Sent choreography (Part 2, Moment 1) */
export const requestSentCeremony: CeremonyBeat[] = [
    { name: 'collapse', delay: 0, duration: 0.45 }, // form → ticket
    { name: 'seal', delay: 0.45, duration: 0.4 }, // envelope seal
    { name: 'ripple', delay: 0.85, duration: 1.2 }, // signal tower + concentric rings
];

/** 4-beat Milestone celebration (Part 5.4) */
export const milestoneCeremony: CeremonyBeat[] = [
    { name: 'bloom', delay: 0, duration: 0.8 }, // geometric art unfolds
    { name: 'title', delay: 0.6, duration: 0.6 }, // headline fades in
    { name: 'voice', delay: 1.0, duration: 2.5 }, // voiceover plays
    { name: 'exit', delay: 3.2, duration: 0.6 }, // dissolves
];

// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE VARIANTS — Part 2 moments
// ═══════════════════════════════════════════════════════════════════════════

/** The three-beat "Request Sent" ceremony variants */
export const requestTicketCollapse: Variants = {
    initial: { scaleY: 1, opacity: 1 },
    collapsing: {
        scaleY: 0.2,
        opacity: 1,
        transition: { duration: 0.35, ease: easeStamp },
    },
};

export const envelopeSeal: Variants = {
    initial: { scaleX: 0, opacity: 0.4 },
    sealing: {
        scaleX: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: easeStamp },
    },
};

export const envelopeLiftoff: Variants = {
    initial: { y: 0, opacity: 1, scale: 1 },
    flying: {
        y: -80,
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.5, ease: easeDepart },
    },
};

export const signalRing: Variants = {
    initial: { scale: 0.3, opacity: 0.9 },
    expanding: {
        scale: 6,
        opacity: 0,
        transition: { duration: 1.6, ease: easeDepart },
    },
};

/** Fish-on-the-Line card tug */
export const fishTug: Variants = {
    idle: { scale: 1, y: 0 },
    tug: {
        scale: [1, 1.03, 1],
        y: [0, -4, 0],
        transition: { duration: 0.35, ease: easeHumanize, times: [0, 0.4, 1] },
    },
    /** Heartbeat that kicks in when countdown < 5s */
    heartbeat: {
        scale: [1, 1.025, 1, 1.025, 1],
        transition: { duration: 0.9, ease: easeHumanize, repeat: Infinity },
    },
};

/** Mission-mode breathing halo (1.0 → 1.01 → 1.0 over 4s) */
export const missionBreathe: Variants = {
    animate: {
        scale: [1, 1.012, 1],
        opacity: [0.85, 1, 0.85],
        transition: {
            duration: duration.breath,
            ease: easeBreathe,
            repeat: Infinity,
        },
    },
};

/** Review star press — each star press triggers a spring with increasing spring stiffness */
export const reviewStarPress = (starIndex: number): Transition => ({
    type: 'spring',
    stiffness: 400 + starIndex * 60,
    damping: 22,
    mass: 0.5,
});

// ═══════════════════════════════════════════════════════════════════════════
// REDUCED MOTION — static fallbacks
// When prefers-reduced-motion is set, all animated variants collapse to these.
// ═══════════════════════════════════════════════════════════════════════════

export const reducedTransition: Transition = {
    duration: 0.01,
};

export const reducedVariant: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: reducedTransition },
    exit: { opacity: 0, transition: reducedTransition },
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compose a stagger transition with a total budget.
 * Useful for notification center groups: given N items and a 400ms budget,
 * each item fires after `400 / N` ms.
 */
export const composeStagger = (itemCount: number, totalMs = 400) => ({
    staggerChildren: Math.min(0.12, (totalMs / 1000) / Math.max(itemCount, 1)),
    delayChildren: 0.04,
});
