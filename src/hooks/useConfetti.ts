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
            disableForReducedMotion: true,
        });

        // Second burst for extra celebration
        setTimeout(() => {
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.6, x: 0.3 },
                colors: ['#89430d', '#d4a574', '#fbbf24'],
                disableForReducedMotion: true,
            });
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.6, x: 0.7 },
                colors: ['#89430d', '#d4a574', '#fbbf24'],
                disableForReducedMotion: true,
            });
        }, 200);
    }, []);

    return { fire };
};
