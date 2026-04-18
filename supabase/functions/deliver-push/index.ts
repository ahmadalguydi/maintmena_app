/**
 * deliver-push  —  Supabase Edge Function
 *
 * Triggered by a Supabase Database Webhook on INSERT to public.notifications.
 * Fans out push notifications to all registered devices for the recipient user.
 *
 * Uses FCM HTTP v1 API (OAuth2 service-account — replaces deprecated legacy key).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Environment ───────────────────────────────────────────────────────────────

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FCM_SA_JSON           = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')  ?? '';
const VAPID_PRIVATE_KEY     = Deno.env.get('VAPID_PRIVATE_KEY')         ?? '';
const VAPID_PUBLIC_KEY      = Deno.env.get('VAPID_PUBLIC_KEY')          ?? '';
const VAPID_SUBJECT         = Deno.env.get('VAPID_SUBJECT')             ?? 'mailto:dev@maintmena.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── FCM HTTP v1 — OAuth2 service-account token ───────────────────────────────

interface ServiceAccount {
  project_id:   string;
  client_email: string;
  private_key:  string;
}

function b64url(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function buildJwt(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  })));

  const signingInput = `${header}.${payload}`;

  const pem = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyDer = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${b64url(sig)}`;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const jwt = await buildJwt(sa);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[deliver-push] OAuth2 token exchange failed: ${text}`);
  }

  const json = await res.json() as { access_token: string };
  return json.access_token;
}

async function sendFcmV1(
  deviceToken: string,
  accessToken: string,
  projectId:   string,
  title:       string,
  body:        string,
  url:         string,
): Promise<void> {
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: { url, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      android: {
        priority: 'high',
        notification: {
          sound:        'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          channel_id:   'maintmena_default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound:   'default',
            badge:   1,
            'content-available': 1,
          },
        },
        headers: { 'apns-priority': '10' },
      },
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 404 || res.status === 410) {
      throw new Error(`STALE_TOKEN:${res.status}`);
    }
    console.error('[deliver-push] FCM v1 error:', res.status, text);
  }
}

// ── Web Push (VAPID) ─────────────────────────────────────────────────────────

async function sendWebPush(
  subscriptionJson: string,
  title: string,
  body:  string,
  url:   string,
): Promise<void> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) return;

  try {
    const sub = JSON.parse(subscriptionJson) as any;
    if (!sub?.endpoint) return;

    const webPush = await import('https://esm.sh/web-push@3.6.7');
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    await webPush.sendNotification(sub, JSON.stringify({ title, body, url, icon: '/icon-192.png' }));
  } catch (err) {
    const msg = String(err);
    if (msg.includes('410') || msg.includes('404')) throw new Error(`STALE_TOKEN:${msg}`);
    console.error('[deliver-push] web push error:', err);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      record?: {
        user_id?:           string;
        title?:             string;
        message?:           string;
        notification_type?: string;
        content_id?:        string;
      };
    };

    const record = body.record;
    const userId = record?.user_id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'no user_id in record' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let sa: ServiceAccount | null = null;
    let accessToken = '';

    if (FCM_SA_JSON) {
      try {
        sa = JSON.parse(FCM_SA_JSON) as ServiceAccount;
        accessToken = await getAccessToken(sa);
      } catch (err) {
        console.error('[deliver-push] Failed to obtain FCM access token:', err);
      }
    }

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Look up user's platform tokens and profile type
    const [tokensResponse, profileResponse] = await Promise.all([
      client.from('push_tokens').select('token, platform').eq('user_id', userId),
      client.from('profiles').select('user_type').eq('id', userId).single()
    ]);
    
    const tokens = tokensResponse.data;
    const tokensError = tokensResponse.error;
    
    const userType = profileResponse.data?.user_type === 'seller' ? 'seller' : 'buyer';

    if (tokensError) {
      console.error('[deliver-push] token lookup error:', tokensError);
      return new Response(JSON.stringify({ sent: 0, error: tokensError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Build deep-link URL ────────────────────────────────────────────────
    const type = record?.notification_type ?? '';
    const id   = record?.content_id;

    let deepLink = userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';

    // Same routing as `getNotificationTarget` client-side
    if (type === 'new_message') {
      deepLink = userType === 'buyer' ? '/app/buyer/messages' : '/app/seller/messages';
    } else if (type === 'job_dispatched' || type === 'quote_revision_requested') {
      deepLink = '/app/seller/home';
    } else if (type === 'booking_response') {
      deepLink = userType === 'buyer' ? '/app/buyer/home' : '/app/seller/home';
    } else if (type === 'warranty_nudge' || type === 'auto_close') {
      deepLink = userType === 'buyer' ? '/app/buyer/activity' : '/app/seller/home';
    } else if (type === 'review_received') {
      deepLink = '/app/seller/reviews';
    } else if (type === 'earnings_milestone') {
      deepLink = '/app/seller/earnings';
    } else if (type === 'profile_incomplete_reminder') {
      deepLink = '/app/seller/profile/edit';
    } else if (type === 'scheduled_job_reminder') {
      deepLink = userType === 'seller'
        ? (id ? `/app/seller/job/${id}` : '/app/seller/home')
        : (id ? `/app/buyer/request/${id}` : '/app/buyer/home');
    } else if (type === 'first_job_completed') {
      deepLink = userType === 'seller'
        ? (id ? `/app/seller/job/${id}` : '/app/seller/home')
        : '/app/buyer/activity';
    } else if (type === 'review_prompt_reminder') {
      deepLink = id ? `/app/buyer/request/${id}` : '/app/buyer/activity';
    } else if (id) {
      deepLink = userType === 'buyer' ? `/app/buyer/request/${id}` : `/app/seller/job/${id}`;
    }

    const pushTitle = record?.title   || 'MaintMENA';
    const pushBody  = record?.message || 'You have a new update.';

    let sent = 0;
    const staleTokens: string[] = [];

    await Promise.all(
      (tokens as { token: string; platform: string }[]).map(async ({ token, platform }) => {
        try {
          if (platform === 'web') {
            await sendWebPush(token, pushTitle, pushBody, deepLink);
            sent++;
          } else if (sa && accessToken) {
            await sendFcmV1(token, accessToken, sa.project_id, pushTitle, pushBody, deepLink);
            sent++;
          }
        } catch (err) {
          if (String(err).includes('STALE_TOKEN')) {
            staleTokens.push(token);
          }
        }
      }),
    );

    if (staleTokens.length > 0) {
      await client.from('push_tokens').delete().eq('user_id', userId).in('token', staleTokens);
    }

    return new Response(JSON.stringify({ sent, stale_removed: staleTokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[deliver-push] unhandled error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
