/**
 * pushNotifications.ts — Cross-platform push notification registration
 *
 * Supports three environments:
 *   1. Capacitor native (iOS / Android) — via @capacitor/push-notifications
 *   2. Median (WebView wrapper) — via window.median JS bridge
 *   3. Web Push (browser native) — via Notification API + service worker
 *
 * Called once per session from usePushNotifications.ts after login.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PushToken {
  platform: 'ios' | 'android' | 'web' | 'median';
  token: string;
}

// ── Token persistence ─────────────────────────────────────────────────────────

async function savePushToken(userId: string, token: PushToken): Promise<void> {
  try {
    await (supabase as any)
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          platform: token.platform,
          token: token.token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' },
      );
  } catch {
    /* Non-critical — registration still succeeded locally */
  }
}

// ── Capacitor ─────────────────────────────────────────────────────────────────

async function tryCapacitorRegistration(userId: string): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;

    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return false;

    await PushNotifications.register();

    // Wait for token (max 10 s)
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('token timeout')), 10_000);

      PushNotifications.addListener('registration', async (tokenData) => {
        window.clearTimeout(timeout);
        const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
        await savePushToken(userId, { platform, token: tokenData.value });
        resolve();
      });

      PushNotifications.addListener('registrationError', () => {
        window.clearTimeout(timeout);
        reject(new Error('registration error'));
      });
    });

    return true;
  } catch {
    return false;
  }
}

// ── Median JS bridge ─────────────────────────────────────────────────────────

async function tryMedianRegistration(userId: string): Promise<boolean> {
  try {
    const win = window as any;
    if (typeof win.median === 'undefined') return false;

    const token: string | undefined = await new Promise((resolve) => {
      win.median.onesignal.onesignalInfo({ callbackFunction: (info: any) => {
        resolve(info?.userId ?? info?.pushTokenHash ?? undefined);
      }});
      // Fallback timeout
      window.setTimeout(() => resolve(undefined), 3000);
    });

    if (!token) return false;
    await savePushToken(userId, { platform: 'median', token });
    return true;
  } catch {
    return false;
  }
}

// ── Web Push (browser Notification API) ───────────────────────────────────────

async function tryWebPushRegistration(userId: string): Promise<boolean> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Proceed only if we have a VAPID key configured
    const vapidKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (!vapidKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    const token = JSON.stringify(subscription.toJSON());
    await savePushToken(userId, { platform: 'web', token });
    return true;
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt push notification registration using the best available method.
 * Order: Capacitor → Median → Web Push
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!userId) return;

  try {
    if (await tryCapacitorRegistration(userId)) return;
    if (await tryMedianRegistration(userId)) return;
    await tryWebPushRegistration(userId);
  } catch {
    /* Silently ignore — push is non-critical */
  }
}
