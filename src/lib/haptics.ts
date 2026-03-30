/**
 * Haptic Feedback Utility
 * Provides tactile feedback for mobile devices using the Web Vibration API
 */

type HapticPattern = number | number[];

interface HapticOptions {
    enabled?: boolean;
}

class HapticFeedback {
    private isSupported: boolean;
    private isEnabled: boolean;

    constructor() {
        this.isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
        this.isEnabled = this.getStoredPreference();
    }

    private getStoredPreference(): boolean {
        try {
            return localStorage.getItem('mm_haptics_enabled') !== 'false' &&
                   localStorage.getItem('hapticFeedbackEnabled') !== 'false';
        } catch {
            return true;
        }
    }

    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        // Use preferences so the setting is durable on native
        import('./preferences').then(({ setHapticsEnabled }) => setHapticsEnabled(enabled)).catch(() => undefined);
    }

    getEnabled(): boolean {
        return this.isEnabled;
    }

    private vibrate(pattern: HapticPattern): void {
        if (!this.isSupported || !this.isEnabled) return;
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Silently fail if vibration is not available
        }
    }

    /** Light tap - card/button touch, minimal friction */
    light(): void {
        this.vibrate(8);
    }

    /** Medium tap - standard button press or selection */
    medium(): void {
        this.vibrate(22);
    }

    /** Heavy tap - significant action or confirmation */
    heavy(): void {
        this.vibrate(45);
    }

    /** Success - rising pattern, positive outcome */
    success(): void {
        this.vibrate([40, 30, 80]);
    }

    /** Error - urgent repeating, alert */
    error(): void {
        this.vibrate([80, 40, 80, 40, 80]);
    }

    /** Notification - three soft pulses, new activity */
    notification(): void {
        this.vibrate([20, 20, 20]);
    }

    /** Selection - minimal single tick, toggle/checkbox */
    selection(): void {
        this.vibrate(12);
    }

    /** Warning - symmetric pulse, caution */
    warning(): void {
        this.vibrate([40, 80, 40]);
    }

    /** Celebration - escalating joy pattern, big milestone */
    celebration(): void {
        this.vibrate([30, 20, 60, 20, 100, 20, 60]);
    }

    /** Impact - sharp physical sensation */
    impact(): void {
        this.vibrate(35);
    }
}

// Singleton instance
export const haptics = new HapticFeedback();

// Convenience hook for React components
import { useCallback } from 'react';

type NamedPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'notification' | 'selection' | 'warning' | 'celebration' | 'impact';

export const useHaptics = () => {
    const light = useCallback(() => haptics.light(), []);
    const medium = useCallback(() => haptics.medium(), []);
    const heavy = useCallback(() => haptics.heavy(), []);
    const success = useCallback(() => haptics.success(), []);
    const error = useCallback(() => haptics.error(), []);
    const notification = useCallback(() => haptics.notification(), []);
    const selection = useCallback(() => haptics.selection(), []);
    const warning = useCallback(() => haptics.warning(), []);
    const celebration = useCallback(() => haptics.celebration(), []);
    const impact = useCallback(() => haptics.impact(), []);

    // Named vibrate — call as: await vibrate('light')
    const vibrate = useCallback(async (pattern: NamedPattern) => {
        haptics[pattern]();
    }, []);

    return {
        light,
        medium,
        heavy,
        success,
        error,
        notification,
        selection,
        warning,
        celebration,
        impact,
        vibrate,
        setEnabled: haptics.setEnabled.bind(haptics),
        getEnabled: haptics.getEnabled.bind(haptics),
    };
};
