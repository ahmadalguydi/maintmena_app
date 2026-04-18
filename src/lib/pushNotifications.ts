import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  getNotificationPresentation,
  getNotificationTarget,
  type NotificationLanguage,
  type NotificationUserType,
} from '@/lib/notifications';

type PushPlatform = 'ios' | 'android' | 'web' | 'median';

interface PushTokenRecord {
  platform: PushPlatform;
  token: string;
}

interface MedianOnesignalInfo {
  userId?: string;
  pushTokenHash?: string;
}

interface MedianWindow {
  median?: {
    onesignal?: {
      onesignalInfo: (opts: { callbackFunction: (info: MedianOnesignalInfo) => void }) => void;
    };
  };
}

interface NativePushPayload {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

interface PushRegistrationOptions {
  force?: boolean;
  userType?: NotificationUserType;
  onNavigate?: (url: string) => void;
}

const ANDROID_CHANNEL_ID = 'maintmena_general';
const ANDROID_CHANNEL_NAME = 'MaintMENA Updates';
const PUSH_TOKEN_STORAGE_KEY = 'mm_push_token';
const PUSH_PLATFORM_STORAGE_KEY = 'mm_push_platform';
const PUSH_BRIDGE_LANGUAGE_KEY = 'preferredLanguage';

let activeUserId: string | null = null;
let activeUserType: NotificationUserType = 'buyer';
let navigateHandler: ((url: string) => void) | null = null;
let nativeListenersBound = false;
let nativeRegistrationInFlight:
  | {
      resolve: (value: boolean) => void;
      reject: (reason?: unknown) => void;
      timeoutId: number;
    }
  | null = null;

function getPreferredLanguage(): NotificationLanguage {
  const value =
    localStorage.getItem(PUSH_BRIDGE_LANGUAGE_KEY) || localStorage.getItem('currentLanguage') || 'ar';
  return value === 'en' ? 'en' : 'ar';
}

function persistCurrentToken(token: PushTokenRecord): void {
  localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token.token);
  localStorage.setItem(PUSH_PLATFORM_STORAGE_KEY, token.platform);
}

function clearPersistedToken(): void {
  localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  localStorage.removeItem(PUSH_PLATFORM_STORAGE_KEY);
}

function getPersistedToken(): PushTokenRecord | null {
  const token = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  const platform = localStorage.getItem(PUSH_PLATFORM_STORAGE_KEY) as PushPlatform | null;
  if (!token || !platform) return null;
  return { token, platform };
}

async function savePushToken(userId: string, token: PushTokenRecord): Promise<void> {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      platform: token.platform,
      token: token.token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  if (error) {
    throw error;
  }

  persistCurrentToken(token);
}

async function deletePushToken(): Promise<void> {
  const current = getPersistedToken();
  if (!current) return;

  await supabase.from('push_tokens').delete().eq('token', current.token);
  clearPersistedToken();
}

function toUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = window.atob(base64);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function resolveNotificationUrl(payload: NativePushPayload): string | null {
  const data = payload.data || {};
  const explicitUrl = typeof data.url === 'string' ? data.url : null;
  if (explicitUrl) return explicitUrl;

  const notificationType =
    typeof data.notificationType === 'string'
      ? data.notificationType
      : typeof data.notification_type === 'string'
        ? data.notification_type
        : null;
  const contentId =
    typeof data.contentId === 'string'
      ? data.contentId
      : typeof data.content_id === 'string'
        ? data.content_id
        : null;

  if (!notificationType) return null;

  return getNotificationTarget(
    {
      notification_type: notificationType,
      content_id: contentId,
    },
    activeUserType,
  );
}

function presentForegroundNotification(payload: NativePushPayload): void {
  const language = getPreferredLanguage();
  const data = payload.data || {};
  const notificationType =
    typeof data.notificationType === 'string'
      ? data.notificationType
      : typeof data.notification_type === 'string'
        ? data.notification_type
        : 'system';

  const presentation = getNotificationPresentation(
    {
      notification_type: notificationType,
      title: payload.title || (typeof data.title === 'string' ? data.title : null),
      message: payload.body || (typeof data.body === 'string' ? data.body : null),
    },
    language,
  );

  toast.info(`${presentation.icon} ${presentation.title}`, {
    description: presentation.message,
    duration: 5000,
  });
}

async function ensureAndroidChannel(): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (Capacitor.getPlatform() !== 'android') return;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  await PushNotifications.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: ANDROID_CHANNEL_NAME,
    description: 'Important job and message updates from MaintMENA',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
  });
}

async function bindNativeListeners(): Promise<void> {
  if (nativeListenersBound) return;

  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { PushNotifications } = await import('@capacitor/push-notifications');
  nativeListenersBound = true;

  await PushNotifications.addListener('registration', async (token: { value: string }) => {
    try {
      if (!activeUserId) {
        throw new Error('No active user for push token save');
      }

      const platform: PushPlatform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
      await savePushToken(activeUserId, { platform, token: token.value });

      if (nativeRegistrationInFlight) {
        window.clearTimeout(nativeRegistrationInFlight.timeoutId);
        nativeRegistrationInFlight.resolve(true);
        nativeRegistrationInFlight = null;
      }
    } catch (error) {
      if (nativeRegistrationInFlight) {
        window.clearTimeout(nativeRegistrationInFlight.timeoutId);
        nativeRegistrationInFlight.reject(error);
        nativeRegistrationInFlight = null;
      }
      if (import.meta.env.DEV) {
        console.warn('[push] failed to persist native token', error);
      }
    }
  });

  await PushNotifications.addListener('registrationError', (error: unknown) => {
    if (nativeRegistrationInFlight) {
      window.clearTimeout(nativeRegistrationInFlight.timeoutId);
      nativeRegistrationInFlight.reject(error);
      nativeRegistrationInFlight = null;
    }

    if (import.meta.env.DEV) {
      console.warn('[push] registration error', error);
    }
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification: NativePushPayload) => {
    presentForegroundNotification(notification);
    window.dispatchEvent(new CustomEvent('mm:push-received', { detail: notification }));
  });

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: { notification?: NativePushPayload }) => {
      const targetUrl = resolveNotificationUrl(action.notification || {});
      if (targetUrl && navigateHandler) {
        navigateHandler(targetUrl);
      }

      window.dispatchEvent(
        new CustomEvent('mm:push-opened', {
          detail: {
            url: targetUrl,
            notification: action.notification || null,
          },
        }),
      );
    },
  );
}

async function resolveNativePermission(): Promise<boolean> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const currentPermissions = await PushNotifications.checkPermissions();
  if (currentPermissions.receive === 'granted') return true;

  const requestedPermissions = await PushNotifications.requestPermissions();
  return requestedPermissions.receive === 'granted';
}

async function waitForNativeRegistration(): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    nativeRegistrationInFlight = {
      resolve,
      reject,
      timeoutId: window.setTimeout(() => {
        nativeRegistrationInFlight = null;
        reject(new Error('native push token timeout'));
      }, 10000),
    };
  });
}

async function tryCapacitorRegistration(userId: string): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return false;

  const granted = await resolveNativePermission();
  if (!granted) return false;

  await bindNativeListeners();
  await ensureAndroidChannel();

  const { PushNotifications } = await import('@capacitor/push-notifications');
  activeUserId = userId;

  await PushNotifications.register();
  return waitForNativeRegistration();
}

async function tryMedianRegistration(userId: string): Promise<boolean> {
  const win = window as MedianWindow;
  if (!win.median?.onesignal) return false;

  const token = await new Promise<string | undefined>((resolve) => {
    win.median!.onesignal!.onesignalInfo({
      callbackFunction: (info: MedianOnesignalInfo) => {
        resolve(info?.userId ?? info?.pushTokenHash ?? undefined);
      },
    });

    window.setTimeout(() => resolve(undefined), 3000);
  });

  if (!token) return false;

  await savePushToken(userId, { platform: 'median', token });
  return true;
}

async function tryWebPushRegistration(userId: string): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapidKey) return false;

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toUint8Array(vapidKey),
    }));

  await savePushToken(userId, {
    platform: 'web',
    token: JSON.stringify(subscription.toJSON()),
  });

  return true;
}

export function configurePushNotifications(options: Omit<PushRegistrationOptions, 'force'> & {
  userId: string;
}): void {
  activeUserId = options.userId;
  activeUserType = options.userType || 'buyer';
  navigateHandler = options.onNavigate || null;
  void bindNativeListeners();
  void ensureAndroidChannel();
}

export function clearPushNotificationContext(): void {
  activeUserId = null;
  navigateHandler = null;
}

export async function registerPushNotifications(
  userId: string,
  options: PushRegistrationOptions = {},
): Promise<boolean> {
  if (!userId) return false;

  activeUserId = userId;
  activeUserType = options.userType || activeUserType;
  navigateHandler = options.onNavigate || navigateHandler;

  try {
    if (await tryCapacitorRegistration(userId)) return true;
    if (await tryMedianRegistration(userId)) return true;
    return tryWebPushRegistration(userId);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[push] registration failed', error);
    }
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      await PushNotifications.unregister();
    } else if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[push] unregister failed', error);
    }
  } finally {
    await deletePushToken();
  }
}
