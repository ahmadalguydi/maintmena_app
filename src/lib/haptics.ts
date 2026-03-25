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
        if (typeof localStorage === 'undefined') return true;
        return localStorage.getItem('hapticFeedbackEnabled') !== 'false';
    }

    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hapticFeedbackEnabled', String(enabled));
        }
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

    /**
     * Light tap - for card/button touches
     */
    light(): void {
        this.vibrate(10);
    }

    /**
     * Medium tap - for button presses and selections
     */
    medium(): void {
        this.vibrate(25);
    }

    /**
     * Heavy tap - for important actions
     */
    heavy(): void {
        this.vibrate(50);
    }

    /**
     * Success pattern - for successful operations (job complete, quote accepted)
     */
    success(): void {
        this.vibrate([50, 50, 100]);
    }

    /**
     * Error pattern - for errors and issues
     */
    error(): void {
        this.vibrate([100, 50, 100, 50, 100]);
    }

    /**
     * Notification pattern - for new quotes, messages, etc.
     */
    notification(): void {
        this.vibrate([30, 30, 30]);
    }

    /**
     * Selection pattern - for toggle switches, checkboxes
     */
    selection(): void {
        this.vibrate(15);
    }

    /**
     * Warning pattern - for important warnings
     */
    warning(): void {
        this.vibrate([50, 100, 50]);
    }

    /**
     * Celebration pattern - for big wins like job completion
     */
    celebration(): void {
        this.vibrate([50, 30, 100, 30, 150]);
    }
}

// Singleton instance
export const haptics = new HapticFeedback();

// Convenience hook for React components
import { useCallback } from 'react';

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
        setEnabled: haptics.setEnabled.bind(haptics),
        getEnabled: haptics.getEnabled.bind(haptics),
    };
};
