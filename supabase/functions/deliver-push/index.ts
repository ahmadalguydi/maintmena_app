import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import {
  getServiceSupabaseClient,
  sendPushForNotification,
} from '../_shared/push.ts';

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookPayload {
  record?: {
    id?: string;
    user_id?: string;
    title?: string;
    message?: string;
    notification_type?: string;
    content_id?: string | null;
  };
}

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret) return false;

  const headerSecret = req.headers.get('x-webhook-secret');
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : null;

  return headerSecret === secret || bearer === secret;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json() as WebhookPayload;
    const record = payload.record;

    if (
      !record?.id ||
      !record.user_id ||
      !record.title ||
      !record.message ||
      !record.notification_type
    ) {
      return new Response(JSON.stringify({ error: 'Invalid notification record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendPushForNotification(getServiceSupabaseClient(), {
      id: record.id,
      user_id: record.user_id,
      title: record.title,
      message: record.message,
      notification_type: record.notification_type,
      content_id: record.content_id ?? null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
