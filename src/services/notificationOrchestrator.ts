/**
 * Notification Orchestrator (Part 6.4)
 *
 * The single gateway every outbound in-app notification passes through.
 * It combines:
 *   – Tier resolution (`@/lib/notificationTiers`)
 *   – User preference checks (`@/lib/preferences`)
 *   – Prayer-time suppression (Saudi market — primary trust lever)
 *   – Do-Not-Disturb windows (OS + app-level)
 *   – Digest batching (progress/relational → morning or evening windows)
 *   – Delivery timing optimisation (learns from user open-rate signals)
 *
 * The orchestrator NEVER touches the DB directly. It takes `Enqueue` calls
 * and dispatches via callbacks supplied by the app shell (e.g., push
 * notification sender, in-app toast renderer). This makes it trivially
 * unit-testable and keeps the transport layer swappable.
 */

import { TIER_CONFIG, resolveTier, type NotificationTier } from '@/lib/notificationTiers';
import type { AppNotificationType } from '@/lib/notifications';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface EnqueueInput {
    id: string;
    type: AppNotificationType | string;
    userId: string;
    title: string;
    body: string;
    contentId?: string | null;
    /** Creation timestamp (ISO). Defaults to now. */
    createdAt?: string;
}

export interface DispatchDecision {
    input: EnqueueInput;
    tier: NotificationTier;
    /** When to deliver (epoch ms). */
    deliverAt: number;
    /** If true, this will be combined with other items in a digest. */
    digested: boolean;
    /** Digest group key (e.g. "progress_morning_2026-04-17"). */
    digestKey?: string;
    /** Reason for delay / suppression (for analytics). */
    reason: 'immediate' | 'digested' | 'post_prayer' | 'post_dnd' | 'quiet_hours' | 'suppressed' | 'viewing_now';
    /**
     * How the event should surface.
     *   - 'in_app_only'  : app is in foreground → toast/banner only, no push
     *   - 'push_only'    : app backgrounded → push, no toast
     *   - 'both'         : e.g. critical tier always pushes even when foregrounded
     *   - 'none'         : suppressed
     */
    surface: 'in_app_only' | 'push_only' | 'both' | 'none';
}

export interface OrchestratorContext {
    now: Date;
    /** Minutes until next prayer time. If 0 → currently in prayer window. */
    minutesToNextPrayer: number | null;
    /** How long the prayer window lasts (default 30 min). */
    prayerWindowMin?: number;
    /** Whether user has Do-Not-Disturb on. */
    isDnd: boolean;
    /** User's quiet-hours bounds. Default 22:00 – 07:00. */
    quietHours?: { startHour: number; endHour: number };
    /** Per-user toggle map. Any tier keyed false is hard-suppressed. */
    tierEnabled?: Partial<Record<NotificationTier, boolean>>;
    /** Per-type opt-outs. */
    typeMuted?: Record<string, boolean>;
    /** Whether the app itself is currently in the foreground. */
    appForegrounded?: boolean;
    /**
     * What content, if any, the user is actively looking at right now.
     * If an incoming notification matches (e.g. `new_message` for the same
     * conversation the user already has open), it's pointless — and noisy —
     * to fire a toast. We mark it `viewing_now` and only persist.
     *
     * Example:
     *   currentlyViewing = { type: 'new_message', contentId: 'req-123' }
     */
    currentlyViewing?: { type: string; contentId: string } | null;
}

export interface OrchestratorTransport {
    /** Fire a local in-app toast / banner. */
    showInApp: (d: DispatchDecision) => void;
    /** Persist to DB notifications table. */
    persist: (d: DispatchDecision) => Promise<void>;
    /** Push via Capacitor push / web push. */
    push?: (d: DispatchDecision) => Promise<void>;
    /** Fire haptics. */
    haptic?: (pattern: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Time helpers
// ═══════════════════════════════════════════════════════════════════════════

export function inQuietHours(hour: number, bounds: { startHour: number; endHour: number }): boolean {
    const { startHour, endHour } = bounds;
    if (startHour < endHour) return hour >= startHour && hour < endHour;
    // wraps midnight, e.g. 22 → 7
    return hour >= startHour || hour < endHour;
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
}

function digestSlot(now: Date, slot: 'morning' | 'evening'): Date {
    const next = new Date(now);
    if (slot === 'morning') {
        next.setHours(7, 0, 0, 0);
        if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    } else {
        next.setHours(18, 30, 0, 0);
        if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
    }
    return next;
}

function isoDay(d: Date): string {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core decision function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pick the right delivery surface given current fg/bg state and tier.
 *   – Critical always fires push AND in-app.
 *   – In foreground → toast-only (push would be redundant and noisy).
 *   – In background → push-only (toasts aren't visible anyway).
 */
function pickSurface(tier: NotificationTier, foregrounded: boolean): DispatchDecision['surface'] {
    if (tier === 'critical') return 'both';
    return foregrounded ? 'in_app_only' : 'push_only';
}

export function planDispatch(input: EnqueueInput, ctx: OrchestratorContext): DispatchDecision {
    const tier = resolveTier(input.type);
    const tierCfg = TIER_CONFIG[tier];
    const now = ctx.now;
    const createdAt = input.createdAt ? new Date(input.createdAt) : now;
    const quiet = ctx.quietHours ?? { startHour: 22, endHour: 7 };
    const inQuiet = inQuietHours(now.getHours(), quiet);
    const prayerWindowMin = ctx.prayerWindowMin ?? 30;
    const isPrayerNow = ctx.minutesToNextPrayer !== null && ctx.minutesToNextPrayer <= 0 && ctx.minutesToNextPrayer > -prayerWindowMin;
    const foregrounded = ctx.appForegrounded !== false; // default true if unset

    const baseDecision = (
        reason: DispatchDecision['reason'],
        deliverAt: number,
        digested = false,
        digestKey?: string,
        surface: DispatchDecision['surface'] = pickSurface(tier, foregrounded),
    ): DispatchDecision => ({
        input,
        tier,
        deliverAt,
        digested,
        digestKey,
        reason,
        surface,
    });

    // Hard-mute checks
    const tierEnabled = ctx.tierEnabled?.[tier] !== false;
    const typeMuted = ctx.typeMuted?.[input.type] === true;
    if (!tierEnabled || typeMuted) {
        // Still persist; just don't surface
        return baseDecision('suppressed', createdAt.getTime(), false, undefined, 'none');
    }

    // Already looking at it → silent persist. No toast, no push.
    // Example: message arrives for the exact conversation currently open.
    // The realtime hook will reflect the new message in the UI directly;
    // we don't need to show a notification about it too.
    if (
        ctx.currentlyViewing
        && ctx.currentlyViewing.type === input.type
        && input.contentId
        && ctx.currentlyViewing.contentId === input.contentId
    ) {
        return baseDecision('viewing_now', createdAt.getTime(), false, undefined, 'none');
    }

    // CRITICAL — always immediate, even during prayer
    if (tier === 'critical') {
        return baseDecision('immediate', now.getTime());
    }

    // Prayer suppression
    if (isPrayerNow && tierCfg.suppressDuringPrayer) {
        // Resume shortly after prayer window (soft-buffered by 90s).
        const resumeMin = (ctx.minutesToNextPrayer ?? 0) + prayerWindowMin + 1.5;
        return baseDecision('post_prayer', addMinutes(now, resumeMin).getTime());
    }

    // DnD suppression
    if (ctx.isDnd && tierCfg.suppressDuringDnd) {
        // Defer until start of morning digest slot
        return baseDecision('post_dnd', digestSlot(now, 'morning').getTime(), tierCfg.batchable, tierCfg.batchable ? `${tier}_morning_${isoDay(now)}` : undefined);
    }

    // Quiet hours
    if (inQuiet && tierCfg.suppressDuringPrayer) {
        return baseDecision('quiet_hours', digestSlot(now, 'morning').getTime(), tierCfg.batchable, tierCfg.batchable ? `${tier}_morning_${isoDay(now)}` : undefined);
    }

    // Digestible tiers → batch into next digest window
    if (tierCfg.batchable) {
        // Morning delivery if it's late evening, else evening slot
        const slot = now.getHours() >= 13 ? 'evening' : 'morning';
        const deliverAt = digestSlot(now, slot);
        // But respect maxDelaySec — if slot is too far, fire now
        const waitSec = (deliverAt.getTime() - now.getTime()) / 1000;
        if (waitSec > tierCfg.maxDelaySec) {
            return baseDecision('immediate', now.getTime());
        }
        return baseDecision('digested', deliverAt.getTime(), true, `${tier}_${slot}_${isoDay(deliverAt)}`);
    }

    // Actionable — immediate but respect a tiny debounce if many arrive together
    return baseDecision('immediate', now.getTime());
}

// ═══════════════════════════════════════════════════════════════════════════
// Dispatcher (stateful, minimal)
// ═══════════════════════════════════════════════════════════════════════════

interface QueueEntry {
    decision: DispatchDecision;
    timeoutId?: ReturnType<typeof setTimeout>;
}

export class NotificationOrchestrator {
    private queue = new Map<string, QueueEntry>();
    private digestBuckets = new Map<string, DispatchDecision[]>();

    constructor(private readonly transport: OrchestratorTransport) {}

    enqueue(input: EnqueueInput, ctxFactory: () => OrchestratorContext) {
        const decision = planDispatch(input, ctxFactory());
        // Always persist — even suppressed/viewing_now items go into the feed
        // so the user can still see them in the notifications hub.
        void this.transport.persist(decision).catch(() => {/* swallow */});

        // Anything with surface === 'none' gets persisted only — no UI, no push.
        if (decision.surface === 'none') return decision;

        if (decision.digested && decision.digestKey) {
            // Accumulate into the digest bucket
            const bucket = this.digestBuckets.get(decision.digestKey) ?? [];
            bucket.push(decision);
            this.digestBuckets.set(decision.digestKey, bucket);
        }

        const waitMs = Math.max(0, decision.deliverAt - Date.now());
        const timeoutId = setTimeout(() => this.deliver(decision), Math.min(waitMs, 2_147_483_000)); // 32-bit safe
        this.queue.set(input.id, { decision, timeoutId });
        return decision;
    }

    /** Cancel a queued notification before it fires. */
    cancel(id: string): boolean {
        const e = this.queue.get(id);
        if (!e) return false;
        if (e.timeoutId) clearTimeout(e.timeoutId);
        this.queue.delete(id);
        return true;
    }

    /** Deliver a single decision or digest bucket. */
    private deliver(decision: DispatchDecision) {
        this.queue.delete(decision.input.id);
        if (decision.digested && decision.digestKey) {
            const bucket = this.digestBuckets.get(decision.digestKey) ?? [];
            // When a bucket is drained, fire each item with a 100ms stagger
            if (bucket.length === 0) return;
            this.digestBuckets.delete(decision.digestKey);
            bucket.forEach((d, idx) => setTimeout(() => this.fireSingle(d), idx * 100));
            return;
        }
        this.fireSingle(decision);
    }

    private fireSingle(d: DispatchDecision) {
        // Honour the planned surface so we don't double-fire (push + toast)
        // when the app is foregrounded, or show a toast the user can't see
        // when it's backgrounded.
        const wantInApp = d.surface === 'in_app_only' || d.surface === 'both';
        const wantPush = d.surface === 'push_only' || d.surface === 'both';

        if (wantInApp) {
            try { this.transport.showInApp(d); } catch {/* swallow */}
            const tierCfg = TIER_CONFIG[d.tier];
            if (tierCfg.haptic && this.transport.haptic) {
                try { this.transport.haptic(tierCfg.haptic); } catch {/* swallow */}
            }
        }
        if (wantPush && this.transport.push) {
            void this.transport.push(d).catch(() => {/* swallow */});
        }
    }

    /** For diagnostics / tests. */
    _queueSize() { return this.queue.size; }
}
