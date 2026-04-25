import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authorizeClientNotification,
  getServiceSupabaseClient,
  insertNotificationAndSendPush,
} from '../_shared/push.ts';

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REQUEST_NOTIFICATION_TYPES = new Set([
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

const DEFAULT_NOTIFICATION_COPY: Record<string, { title: string; message: string }> = {
  job_accepted: {
    title: 'Provider assigned',
    message: 'A provider accepted your request and added an estimated price.',
  },
  job_status_updated: {
    title: 'Request update',
    message: 'There is a new update on your request.',
  },
  seller_on_way: {
    title: 'Provider on the way',
    message: 'Your provider is heading to your location.',
  },
  seller_arrived: {
    title: 'Provider arrived',
    message: 'Your provider has arrived at the job location.',
  },
  price_approval_needed: {
    title: 'Price approval needed',
    message: 'Please review the estimated price before work continues.',
  },
  job_halted: {
    title: 'Request paused',
    message: 'Work is paused until the next update is confirmed.',
  },
  job_resolution_progress: {
    title: 'Work in progress',
    message: 'Your provider is working on the request.',
  },
  job_resolved: {
    title: 'Issue resolved',
    message: 'The provider marked the issue as resolved.',
  },
  job_completed: {
    title: 'Request completed',
    message: 'Your request has been completed.',
  },
  job_cancelled: {
    title: 'Request cancelled',
    message: 'Your request has been cancelled.',
  },
  review_prompt_reminder: {
    title: 'Rate your provider',
    message: 'Share a quick review for the completed request.',
  },
  warranty_nudge: {
    title: 'Warranty check-in',
    message: 'Tell us if your completed request still needs attention.',
  },
  auto_close: {
    title: 'Request closed',
    message: 'Your request was closed automatically.',
  },
};

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

  try {
    const authHeader = req.headers.get('Authorization');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!authHeader || !anonKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const userId =
      typeof body.user_id === 'string'
        ? body.user_id
        : typeof body.userId === 'string'
          ? body.userId
          : null;
    const notificationType =
      typeof body.notification_type === 'string'
        ? body.notification_type.trim()
        : typeof body.type === 'string'
          ? body.type.trim()
          : '';
    const defaultCopy = DEFAULT_NOTIFICATION_COPY[notificationType];
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : defaultCopy?.title ?? '';
    const message =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim()
        : defaultCopy?.message ?? '';
    const contentId =
      typeof body.content_id === 'string'
        ? body.content_id
        : typeof body.contentId === 'string'
          ? body.contentId
          : null;

    if (!userId || !title || !message || !notificationType || !REQUEST_NOTIFICATION_TYPES.has(notificationType)) {
      return new Response(JSON.stringify({ error: 'Invalid notification payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (title.length > 120 || message.length > 500) {
      return new Response(JSON.stringify({ error: 'Notification text is too long' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = getServiceSupabaseClient();
    const authorized = await authorizeClientNotification(serviceClient, user.id, {
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
      content_id: contentId,
    });

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await insertNotificationAndSendPush(serviceClient, {
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
      content_id: contentId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unexpected error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
