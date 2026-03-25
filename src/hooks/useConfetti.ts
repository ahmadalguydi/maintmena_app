import confetti from 'canvas-confetti';
import { useCallback } from 'react';

/**
 * Hook for firing confetti celebration animations
 * Used when a job becomes active (contract fully signed)
 */
export const useConfetti = () => {
    const fire = useCallback(() => {
        // Fire confetti from bottom-center
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.7, x: 0.5 },
            colors: ['#89430d', '#d4a574', '#fbbf24', '#f59e0b', '#78350f'],
            zIndex: 100, // Ensure it's above the modal (z-50)
            disableForReducedMotion: false, // Force animation even if reduced motion is on
        });

        // Second burst for extra celebration
        setTimeout(() => {
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.6, x: 0.3 },
                colors: ['#89430d', '#d4a574', '#fbbf24'],
                zIndex: 100,
                disableForReducedMotion: false,
            });
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.6, x: 0.7 },
                colors: ['#89430d', '#d4a574', '#fbbf24'],
                zIndex: 100,
                disableForReducedMotion: false,
            });
        }, 200);
    }, []);

    return { fire };
};
