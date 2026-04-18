/**
 * Notification Tier System (Part 4.2)
 *
 * Every notification has a *tier* that defines its character — how loud it is,
 * what haptic fires, what visual accent it carries, and whether it can be
 * suppressed during prayer or Do Not Disturb.
 *
 * The orchestrator (`services/notificationOrchestrator.ts`) consults this file
 * before deciding when and how to deliver each notification.
 *
 *   CRITICAL    → action is time-bound and safety-adjacent
 *   ACTIONABLE  → action is expected but not life-or-death
 *   PROGRESS    → status update, no action required
 *   RELATIONAL  → warmth, recognition, community
 *
 * Philosophy:
 *   "Every notification is a tax on trust.
 *    Charge only when you deliver value worth the tax."
 */

import type { AppNotificationType } from './notifications';

export type NotificationTier = 'critical' | 'actionable' | 'progress' | 'relational';

export interface TierConfig {
    tier: NotificationTier;
    /** Named haptic pattern — must be one of the ones in `@/lib/haptics`. */
    haptic: 'heavy' | 'medium' | 'light' | 'notification' | 'success' | 'selection' | 'celebration';
    /** Whether the app should sound in-foreground (plays gentle tone). */
    sound: boolean;
    /** HSL hex accent shown on the notification spine & icon tint. */
    accent: string;
    /** Suppress during prayer times? */
    suppressDuringPrayer: boolean;
    /** Suppress during Do Not Disturb? */
    suppressDuringDnd: boolean;
    /** Can this notification be batched into a digest? */
    batchable: boolean;
    /** Maximum delivery delay allowed before this must fire (seconds). */
    maxDelaySec: number;
    /** Display label — shown as the subtle "pill" above title. */
    label: { en: string; ar: string };
}

export const TIER_CONFIG: Record<NotificationTier, TierConfig> = {
    critical: {
        tier: 'critical',
        haptic: 'heavy',
        sound: true,
        // Warm amber-red — demands, but not panic
        accent: '#C2410C',
        suppressDuringPrayer: false, // critical always delivers
        suppressDuringDnd: false,
        batchable: false,
        maxDelaySec: 5,
        label: { en: 'Action needed', ar: 'يحتاج تصرّف' },
    },
    actionable: {
        tier: 'actionable',
        haptic: 'medium',
        sound: true,
        // Saudi green — positive commitment color
        accent: '#047857',
        suppressDuringPrayer: true,
        suppressDuringDnd: true,
        batchable: false,
        maxDelaySec: 120,
        label: { en: 'Your move', ar: 'الخيار لك' },
    },
    progress: {
        tier: 'progress',
        haptic: 'light',
        sound: false,
        // Cool slate — calm, informational
        accent: '#475569',
        suppressDuringPrayer: true,
        suppressDuringDnd: true,
        batchable: true,
        maxDelaySec: 900, // up to 15 min batch window
        label: { en: 'Update', ar: 'تحديث' },
    },
    relational: {
        tier: 'relational',
        haptic: 'notification',
        sound: false,
        // Warm gold — human warmth, recognition
        accent: '#B45309',
        suppressDuringPrayer: true,
        suppressDuringDnd: true,
        batchable: true,
        maxDelaySec: 3600, // up to 1 hour — morning/evening windows
        label: { en: 'For you', ar: 'لك' },
    },
};

/**
 * Canonical mapping from existing `notification_type` → tier.
 * When a new `AppNotificationType` is added, add it here.
 * Unknown types default to `progress`.
 */
export const NOTIFICATION_TIER_MAP: Record<AppNotificationType, NotificationTier> = {
    // CRITICAL — needs attention now
    price_approval_needed: 'critical',
    job_halted: 'critical',
    seller_arrived: 'critical',

    // ACTIONABLE — user's next move
    job_dispatched: 'actionable',
    new_message: 'actionable',
    job_completed: 'actionable',
    review_prompt_reminder: 'actionable',
    scheduled_job_reminder: 'actionable',

    // PROGRESS — FYI
    job_accepted: 'progress',
    job_status_updated: 'progress',
    seller_on_way: 'progress',
    job_resolution_progress: 'progress',
    job_resolved: 'progress',
    job_cancelled: 'progress',

    // RELATIONAL — warmth, recognition
    review_received: 'relational',
    earnings_milestone: 'relational',
    first_job_completed: 'relational',
    profile_incomplete_reminder: 'relational',
};

/** Small helper to resolve a tier from a type safely. */
export function resolveTier(type: string): NotificationTier {
    return (NOTIFICATION_TIER_MAP as Record<string, NotificationTier>)[type] ?? 'progress';
}

/** Convenience accessor. */
export function getTierConfig(type: string): TierConfig {
    return TIER_CONFIG[resolveTier(type)];
}
