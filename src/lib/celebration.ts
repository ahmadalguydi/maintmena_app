/**
 * Celebration Utility
 * Provides fun, visually satisfying celebrations for successful actions
 */
import confetti from 'canvas-confetti';

interface CelebrationOptions {
    intensity?: 'light' | 'medium' | 'heavy';
    colors?: string[];
}

const defaultColors = ['#B45309', '#D97706', '#F59E0B', '#10B981', '#3B82F6'];

/**
 * Fire confetti from both sides of the screen
 */
export const celebrateSuccess = (options: CelebrationOptions = {}) => {
    const { intensity = 'medium', colors = defaultColors } = options;

    const particleCounts = {
        light: 50,
        medium: 100,
        heavy: 200,
    };

    const count = particleCounts[intensity];

    // Left side
    confetti({
        particleCount: count / 2,
        spread: 60,
        origin: { x: 0.1, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
        shapes: ['square', 'circle'],
        scalar: 1.2,
    });

    // Right side
    confetti({
        particleCount: count / 2,
        spread: 60,
        origin: { x: 0.9, y: 0.6 },
        colors,
        startVelocity: 45,
        gravity: 0.8,
        ticks: 300,
        shapes: ['square', 'circle'],
        scalar: 1.2,
    });
};

/**
 * Burst from center - for compact celebrations
 */
export const celebrateBurst = (options: CelebrationOptions = {}) => {
    const { intensity = 'medium', colors = defaultColors } = options;

    const particleCounts = {
        light: 30,
        medium: 60,
        heavy: 100,
    };

    confetti({
        particleCount: particleCounts[intensity],
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 30,
        gravity: 1,
        ticks: 200,
        shapes: ['circle'],
    });
};

/**
 * Fireworks effect - for big wins
 */
export const celebrateFireworks = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        confetti({
            particleCount: 3,
            spread: 55,
            startVelocity: 60,
            origin: {
                x: Math.random(),
                y: Math.random() - 0.2,
            },
            colors: defaultColors,
            ticks: 200,
            gravity: 0.8,
        });
    }, 150);
};

/**
 * Stars falling - for ratings/reviews
 */
export const celebrateStars = () => {
    confetti({
        particleCount: 40,
        spread: 180,
        origin: { x: 0.5, y: 0 },
        startVelocity: 10,
        gravity: 0.5,
        ticks: 400,
        shapes: ['circle'],
        colors: ['#FBBF24', '#F59E0B', '#D97706'],
        scalar: 1.5,
    });
};

/**
 * Completion celebration - combines haptic + visual
 */
export const celebrateCompletion = async () => {
    // Import haptics dynamically to avoid circular deps
    const { haptics } = await import('./haptics');

    // Trigger haptic
    haptics.celebration();

    // Fire confetti
    celebrateSuccess({ intensity: 'medium' });
};

/**
 * Quick win celebration - subtle but satisfying
 */
export const celebrateQuickWin = async () => {
    const { haptics } = await import('./haptics');

    haptics.success();
    celebrateBurst({ intensity: 'light' });
};
