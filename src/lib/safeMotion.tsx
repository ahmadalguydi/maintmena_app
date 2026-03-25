import { motion, MotionProps } from 'framer-motion';
import { forwardRef, ComponentProps } from 'react';

/**
 * SafeMotion - A wrapper around framer-motion that prevents the "invisible content" bug.
 * 
 * The Problem:
 * - motion.div starts with `initial={{ opacity: 0 }}` 
 * - Animation gets interrupted (tab switch, heavy JS, React Strict Mode double-render)
 * - Element stays stuck at opacity 0 forever
 * 
 * The Solution:
 * - Use CSS as the fallback via `style={{ opacity: 1 }}` on the element
 * - Animation still runs, but if it fails, content is visible
 * - Add `initial={false}` after first mount to prevent re-animation on data refetch
 */

// Safe fade-in variants with CSS fallbacks
export const safeFadeIn = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 }
};

export const safeFadeInNoMove = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 }
};

// A wrapper component that ensures visibility even if animation fails
export const SafeMotionDiv = forwardRef<
    HTMLDivElement,
    ComponentProps<typeof motion.div> & { fallbackVisible?: boolean }
>(({ fallbackVisible = true, style, ...props }, ref) => {
    return (
        <motion.div
            ref={ref}
            style={{
                // CSS fallback: if animation never completes, at least show content
                ...(fallbackVisible && { opacity: 1 }),
                ...style
            }}
            {...props}
        />
    );
});

SafeMotionDiv.displayName = 'SafeMotionDiv';

// Hook to disable re-animation on data refetch
import { useRef, useEffect, useState } from 'react';

export const useSkipInitialAnimation = () => {
    const hasMounted = useRef(false);
    const [skipInitial, setSkipInitial] = useState(false);

    useEffect(() => {
        if (hasMounted.current) {
            setSkipInitial(true);
        }
        hasMounted.current = true;
    }, []);

    return skipInitial;
};

/**
 * Usage Example:
 * 
 * const skipAnimation = useSkipInitialAnimation();
 * 
 * <motion.div
 *   initial={skipAnimation ? false : { opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * >
 *   Content
 * </motion.div>
 */
