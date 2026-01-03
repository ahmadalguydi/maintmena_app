/**
 * Apple-Inspired Animation Presets
 * 
 * These presets replicate the tactile, responsive feel of iOS/macOS animations.
 * Use these consistently throughout the app for a cohesive premium experience.
 */

import type { Transition, Variants } from 'framer-motion';

// ============================================================================
// SPRING PRESETS
// Apple uses spring physics with carefully tuned stiffness/damping/mass
// ============================================================================

export const springPresets = {
    /** Quick, snappy interactions (buttons, toggles) */
    snappy: { type: "spring", stiffness: 400, damping: 30 } as Transition,

    /** Smooth, fluid animations (page transitions, cards) */
    smooth: { type: "spring", stiffness: 300, damping: 28, mass: 0.8 } as Transition,

    /** Playful bounce (success states, notifications) */
    bouncy: { type: "spring", stiffness: 500, damping: 25, mass: 0.5 } as Transition,

    /** Gentle, elegant motion (modals, overlays) */
    gentle: { type: "spring", stiffness: 200, damping: 24, mass: 1 } as Transition,

    /** Ultra-responsive (tab indicators, small UI elements) */
    swift: { type: "spring", stiffness: 600, damping: 35 } as Transition,

    /** iOS-style navigation spring */
    navigation: { type: "spring", stiffness: 350, damping: 30, mass: 0.9 } as Transition,
};

// ============================================================================
// EASING CURVES
// Custom bezier curves for non-spring animations
// ============================================================================

export const easingPresets = {
    /** Apple's ease-out curve for exits */
    appleEaseOut: [0.25, 0.46, 0.45, 0.94] as const,

    /** Apple's ease-in-out for balanced motion */
    appleEaseInOut: [0.42, 0, 0.58, 1] as const,

    /** Smooth deceleration */
    decelerate: [0, 0, 0.2, 1] as const,

    /** Quick acceleration */
    accelerate: [0.4, 0, 1, 1] as const,

    /** Sharp snap */
    sharp: [0.4, 0, 0.6, 1] as const,
};

// ============================================================================
// DURATION PRESETS
// ============================================================================

export const durationPresets = {
    instant: 0.1,
    fast: 0.15,
    normal: 0.25,
    slow: 0.4,
    gentle: 0.6,
};

// ============================================================================
// PAGE TRANSITION VARIANTS
// ============================================================================

export const pageTransition: Variants = {
    initial: {
        opacity: 0,
        x: 20,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
    },
    exit: {
        opacity: 0,
        x: -10,
        scale: 0.99,
    },
};

export const pageTransitionConfig: Transition = {
    ...springPresets.navigation,
};

// ============================================================================
// STAGGER CHILDREN VARIANTS
// For lists and grids that reveal items sequentially
// ============================================================================

export const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

export const staggerItem: Variants = {
    hidden: {
        opacity: 0,
        y: 16,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: springPresets.smooth,
    },
};

export const staggerItemFast: Variants = {
    hidden: {
        opacity: 0,
        y: 10,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: springPresets.snappy,
    },
};

// ============================================================================
// INTERACTIVE ELEMENT VARIANTS
// For buttons, cards, and tappable elements
// ============================================================================

export const tapScale = {
    tap: { scale: 0.97 },
    hover: { scale: 1.02 },
};

export const cardInteraction: Variants = {
    rest: {
        scale: 1,
        y: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    },
    hover: {
        scale: 1.01,
        y: -2,
        boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
        transition: springPresets.snappy,
    },
    tap: {
        scale: 0.98,
        y: 0,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        transition: springPresets.swift,
    },
};

export const buttonInteraction: Variants = {
    rest: {
        scale: 1,
    },
    hover: {
        scale: 1.02,
        transition: springPresets.snappy,
    },
    tap: {
        scale: 0.96,
        transition: springPresets.swift,
    },
};

// ============================================================================
// MODAL & SHEET VARIANTS
// ============================================================================

export const modalBackdrop: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: durationPresets.normal },
    },
    exit: {
        opacity: 0,
        transition: { duration: durationPresets.fast },
    },
};

export const modalContent: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.95,
        y: 10,
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: springPresets.smooth,
    },
    exit: {
        opacity: 0,
        scale: 0.97,
        y: 5,
        transition: { duration: durationPresets.fast },
    },
};

export const bottomSheetContent: Variants = {
    hidden: {
        y: "100%",
    },
    visible: {
        y: 0,
        transition: springPresets.smooth,
    },
    exit: {
        y: "100%",
        transition: { duration: durationPresets.normal, ease: easingPresets.accelerate },
    },
};

// ============================================================================
// FADE & SLIDE VARIANTS
// Common reveal patterns
// ============================================================================

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: durationPresets.normal },
    },
};

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: springPresets.smooth,
    },
};

export const fadeInDown: Variants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: springPresets.smooth,
    },
};

export const fadeInScale: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: springPresets.bouncy,
    },
};

// ============================================================================
// TAB/NAV INDICATOR
// For bottom nav, tab bars, etc.
// ============================================================================

export const navIndicatorTransition: Transition = {
    type: "spring",
    stiffness: 500,
    damping: 30,
};

// ============================================================================
// LOADING STATES
// ============================================================================

export const pulseAnimation: Variants = {
    animate: {
        opacity: [0.5, 1, 0.5],
        transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

export const shimmerAnimation = {
    animate: {
        backgroundPosition: ["200% 0", "-200% 0"],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "linear",
        },
    },
};

// ============================================================================
// SUCCESS/NOTIFICATION ANIMATIONS
// ============================================================================

export const successPop: Variants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: springPresets.bouncy,
    },
};

export const notificationSlide: Variants = {
    hidden: {
        y: -100,
        opacity: 0,
        scale: 0.9,
    },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: springPresets.smooth,
    },
    exit: {
        y: -50,
        opacity: 0,
        scale: 0.95,
        transition: { duration: durationPresets.fast },
    },
};
