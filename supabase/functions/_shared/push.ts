import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface NotificationInsert {
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  content_id?: string | null;
}

interface NotificationRow extends NotificationInsert {
  id: string;
}

interface PushTokenRow {
  token: string;
  platform: string;
}

interface MaintenanceRequestAuthorizationRow {
  buyer_id: string;
  assigned_seller_id: string | null;
}

interface WebPushSubscriptionToken {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    auth?: string;
    p256dh?: string;
  };
}

interface WebPushClient {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void;
  sendNotification: (
    subscription: WebPushSubscriptionToken,
    payload?: string,
    options?: { TTL?: number },
  ) => Promise<unknown>;
}

const FIREBASE_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const FIREBASE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DEFAULT_NOTIFICATION_CHANNEL_ID = 'maintmena_general';

let accessTokenCache: { token: string; expiresAt: number } | null = null;
let webPushClientPromise: Promise<WebPushClient | null> | null = null;

export function getServiceSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function base64UrlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

async function importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );
}

async function getFirebaseAccessToken(): Promise<string | null> {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
  const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const jwtClaims = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: FIREBASE_SCOPE,
      aud: FIREBASE_TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsignedToken = `${jwtHeader}.${jwtClaims}`;

  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signature))}`;

  const response = await fetch(FIREBASE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const tokenPayload = await response.json();
  const accessToken = typeof tokenPayload.access_token === 'string' ? tokenPayload.access_token : null;
  const expiresIn = typeof tokenPayload.expires_in === 'number' ? tokenPayload.expires_in : 3600;

  if (!accessToken) {
    return null;
  }

  accessTokenCache = {
    token: accessToken,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  };

  return accessToken;
}

function isPushEnabled(notificationSettings: Record<string, unknown> | null | undefined): boolean {
  if (!notificationSettings) return true;

  const explicit = notificationSettings.push_enabled;
  if (typeof explicit === 'boolean') return explicit;

  const legacy = notificationSettings.push;
  if (typeof legacy === 'boolean') return legacy;

  return true;
}

async function getUserType(serviceClient: ReturnType<typeof getServiceSupabaseClient>, userId: string) {
  const { data } = await serviceClient
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  return data?.user_type === 'seller' ? 'seller' : 'buyer';
}

function getNotificationTarget(notification: NotificationInsert, userType: 'buyer' | 'seller'): string {
  const type = notification.notification_type;
  const id = notification.content_id;

  if (type === 'new_message') {
    return id ? `/app/messages/thread?request=${id}` : userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages';
  }
  if (type === 'job_dispatched') return '/app/seller/home';
  if (type === 'warranty_nudge' || type === 'auto_close') {
    return userType === 'buyer' ? '/app/buyer/activity' : '/app/seller/home';
  }
  if (type === 'review_received') return '/app/seller/reviews';
  if (type === 'earnings_milestone') return '/app/seller/earnings';
  if (type === 'profile_incomplete_reminder') return '/app/seller/profile/edit';
  if (type === 'scheduled_job_reminder') {
    return userType === 'seller'
      ? id
        ? `/app/seller/job/${id}`
        : '/app/seller/home'
      : id
        ? `/app/buyer/request/${id}`
        : '/app/buyer/home';
  }
  if (type === 'first_job_completed') {
    return userType === 'seller'
      ? id
        ? `/app/seller/job/${id}`
        : '/app/seller/home'
      : '/app/buyer/activity';
  }
  if (type === 'review_prompt_reminder') {
    return id ? `/app/buyer/request/${id}` : '/app/buyer/activity';
  }

  if (id) {
    return userType === 'buyer' ? `/app/buyer/request/${id}` : `/app/seller/job/${id}`;
  }

  return userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';
}

function shouldRemoveInvalidToken(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;

  const error = (payload as { error?: { status?: string; details?: Array<{ errorCode?: string }> } }).error;
  if (!error) return false;

  if (error.status === 'NOT_FOUND' || error.status === 'INVALID_ARGUMENT') {
    return true;
  }

  const detailCode = error.details?.find((detail) => typeof detail.errorCode === 'string')?.errorCode;
  return detailCode === 'UNREGISTERED' || detailCode === 'INVALID_ARGUMENT';
}

function parseWebPushSubscription(token: string): WebPushSubscriptionToken | null {
  try {
    const parsed = JSON.parse(token) as WebPushSubscriptionToken;
    if (!parsed?.endpoint || !parsed?.keys?.auth || !parsed?.keys?.p256dh) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function getWebPushClient(): Promise<WebPushClient | null> {
  const publicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY');
  const subject =
    Deno.env.get('WEB_PUSH_VAPID_SUBJECT') ?? 'mailto:notifications@maintmena.com';

  if (!publicKey || !privateKey) {
    return null;
  }

  if (!webPushClientPromise) {
    webPushClientPromise = import('npm:web-push@3.6.7')
      .then((module) => {
        const client = (module.default ?? module) as WebPushClient;
        client.setVapidDetails(subject, publicKey, privateKey);
        return client;
      })
      .catch(() => null);
  }

  return webPushClientPromise;
}

function isInvalidWebPushError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const statusCode = (error as { statusCode?: number }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

export async function authorizeClientNotification(
  serviceClient: ReturnType<typeof getServiceSupabaseClient>,
  actorUserId: string,
  notification: NotificationInsert,
): Promise<boolean> {
  if (!notification.content_id || !notification.user_id || notification.user_id === actorUserId) {
    return false;
  }

  const requestNotificationTypes = new Set([
    'job_accepted',
    'job_status_updated',
    'seller_on_way',
    'seller_arrived',
    'price_approval_needed',
    'job_halted',
    'job_resolution_progress',
    'job_resolved',
    'job_completed',
    'job_cancelled',
    'review_prompt_reminder',
    'warranty_nudge',
    'auto_close',
  ]);

  if (!requestNotificationTypes.has(notification.notification_type)) {
    return false;
  }

  const { data } = await serviceClient
    .from('maintenance_requests')
    .select('buyer_id, assigned_seller_id')
    .eq('id', notification.content_id)
    .maybeSingle<MaintenanceRequestAuthorizationRow>();

  if (!data?.buyer_id || !data.assigned_seller_id) return false;

  const actorIsBuyer = data.buyer_id === actorUserId;
  const actorIsSeller = data.assigned_seller_id === actorUserId;
  const recipientIsBuyer = data.buyer_id === notification.user_id;
  const recipientIsSeller = data.assigned_seller_id === notification.user_id;

  if (actorIsSeller && recipientIsBuyer) return true;
  if (actorIsBuyer && recipientIsSeller) {
    return notification.notification_type === 'job_cancelled' || notification.notification_type === 'job_halted';
  }

  return false;
}

export async function sendPushForNotification(
  serviceClient: ReturnType<typeof getServiceSupabaseClient>,
  notification: NotificationRow,
): Promise<{ sent: number; skipped: number }> {
  const { data: preferenceRow } = await serviceClient
    .from('user_preferences')
    .select('notification_settings')
    .eq('user_id', notification.user_id)
    .maybeSingle();

  if (!isPushEnabled((preferenceRow?.notification_settings as Record<string, unknown> | null | undefined))) {
    return { sent: 0, skipped: 1 };
  }

  const { data: tokens } = await serviceClient
    .from('push_tokens')
    .select('token, platform')
    .eq('user_id', notification.user_id);

  if (!tokens?.length) {
    return { sent: 0, skipped: 1 };
  }

  const nativeTokens = (tokens as PushTokenRow[]).filter(
    (token) => token.platform === 'android' || token.platform === 'ios',
  );
  const webTokens = (tokens as PushTokenRow[]).filter((token) => token.platform === 'web');
  const unsupportedTokenCount = tokens.length - nativeTokens.length - webTokens.length;

  const accessToken = nativeTokens.length ? await getFirebaseAccessToken() : null;
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  const webPushClient = webTokens.length ? await getWebPushClient() : null;

  const userType = await getUserType(serviceClient, notification.user_id);
  const targetUrl = getNotificationTarget(notification, userType);
  let sent = 0;
  let skipped = unsupportedTokenCount;

  if (accessToken && projectId) {
    for (const token of nativeTokens) {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: token.token,
              notification: {
                title: notification.title,
                body: notification.message,
              },
              data: {
                notificationId: notification.id,
                notificationType: notification.notification_type,
                contentId: notification.content_id ?? '',
                url: targetUrl,
                title: notification.title,
                body: notification.message,
              },
              android: {
                priority: 'HIGH',
                notification: {
                  channel_id: DEFAULT_NOTIFICATION_CHANNEL_ID,
                  icon: 'ic_notification',
                  color: '#D2691E',
                },
              },
              apns: {
                payload: {
                  aps: {
                    sound: 'default',
                  },
                },
              },
            },
          }),
        },
      );

      if (response.ok) {
        sent += 1;
        continue;
      }

      skipped += 1;

      const errorPayload = await response
        .json()
        .catch(() => ({}));

      if (shouldRemoveInvalidToken(errorPayload)) {
        await serviceClient.from('push_tokens').delete().eq('token', token.token);
      }
    }
  } else {
    skipped += nativeTokens.length;
  }

  if (webPushClient) {
    for (const token of webTokens) {
      const subscription = parseWebPushSubscription(token.token);
      if (!subscription) {
        skipped += 1;
        await serviceClient.from('push_tokens').delete().eq('token', token.token);
        continue;
      }

      try {
        await webPushClient.sendNotification(
          subscription,
          JSON.stringify({
            title: notification.title,
            body: notification.message,
            url: targetUrl,
            notificationId: notification.id,
            notificationType: notification.notification_type,
            contentId: notification.content_id ?? '',
            tag: `maintmena-${notification.id}`,
          }),
          { TTL: 60 },
        );
        sent += 1;
      } catch (error) {
        skipped += 1;
        if (isInvalidWebPushError(error)) {
          await serviceClient.from('push_tokens').delete().eq('token', token.token);
        }
      }
    }
  } else {
    skipped += webTokens.length;
  }

  return { sent, skipped };
}

export async function insertNotificationAndSendPush(
  serviceClient: ReturnType<typeof getServiceSupabaseClient>,
  notification: NotificationInsert,
  options: { deliverPush?: boolean } = {},
): Promise<{ duplicate: boolean; notificationId: string | null; sent: number; skipped: number }> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  let query = serviceClient
    .from('notifications')
    .select('id')
    .eq('user_id', notification.user_id)
    .eq('notification_type', notification.notification_type)
    .gte('created_at', fiveMinutesAgo);

  if (notification.content_id) {
    query = query.eq('content_id', notification.content_id);
  } else {
    query = query.is('content_id', null);
  }

  const { data: existing } = await query.maybeSingle();
  if (existing?.id) {
    return {
      duplicate: true,
      notificationId: existing.id,
      sent: 0,
      skipped: 0,
    };
  }

  const { data, error } = await serviceClient
    .from('notifications')
    .insert({
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      notification_type: notification.notification_type,
      content_id: notification.content_id ?? null,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw error ?? new Error('Failed to insert notification');
  }

  const delivery = options.deliverPush
    ? await sendPushForNotification(serviceClient, {
      ...notification,
      content_id: notification.content_id ?? null,
      id: data.id,
    })
    : { sent: 0, skipped: 0 };

  return {
    duplicate: false,
    notificationId: data.id,
    sent: delivery.sent,
    skipped: delivery.skipped,
  };
}
