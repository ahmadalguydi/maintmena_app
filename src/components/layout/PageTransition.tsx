import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

/**
 * Subtle page transition wrapper for /app screens.
 * Provides a gentle slide-up + fade effect that feels native.
 * 
 * Duration: 0.2s (fast, not distracting)
 * Movement: 10px (subtle, not jarring)
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
                duration: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94] // Smooth ease-out curve
            }}
            className={`h-full ${className}`}
        >
            {children}
        </motion.div>
    );
}

/**
 * Bottom-sheet style transition for overlay screens.
 * Use for: contract details, quote details, new request, etc.
 * Slides up from bottom with more pronounced motion.
 */
export function SheetTransition({ children, className = '' }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{
                duration: 0.25,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className={`min-h-screen bg-background ${className}`}
        >
            {children}
        </motion.div>
    );
}
