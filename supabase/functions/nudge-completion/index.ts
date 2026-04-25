import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { insertNotificationAndSendPush } from '../_shared/push.ts';

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PendingRequest {
  id: string;
  buyer_id: string;
  nudge_count: number | null;
  seller_completion_date: string | null;
}

function isAuthorized(req: Request): boolean {
  const secret = Deno.env.get('NUDGE_COMPLETION_SECRET');
  if (!secret) return false;

  const headerSecret = req.headers.get('x-cron-secret');
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
    return new Response(JSON.stringify({ error: 'Unauthorized cron request' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: pendingRequests, error } = await supabase
      .from('maintenance_requests')
      .select('id, buyer_id, nudge_count, seller_completion_date')
      .eq('seller_marked_complete', true)
      .eq('buyer_marked_complete', false)
      .eq('auto_closed', false)
      .not('seller_completion_date', 'is', null);

    if (error) throw error;

    const nudgeSequence = [
      { hours: 1, message: 'Please confirm the completed job to activate your warranty.' },
      { hours: 6, message: 'Your warranty is waiting for job confirmation.' },
      { hours: 24, message: 'Confirm completion to keep your warranty protection active.' },
      { hours: 72, message: 'Final reminders are active for this completed job.' },
      { hours: 168, message: 'This completed job will be closed soon without buyer confirmation.' },
    ];

    let nudgesSent = 0;
    let jobsAutoClosed = 0;

    for (const request of (pendingRequests ?? []) as PendingRequest[]) {
      if (!request.seller_completion_date) continue;

      const completedAt = new Date(request.seller_completion_date);
      const hoursSinceComplete = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
      const currentNudgeIndex = request.nudge_count ?? 0;

      if (hoursSinceComplete >= 168) {
        await supabase
          .from('maintenance_requests')
          .update({
            auto_closed: true,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        await insertNotificationAndSendPush(supabase, {
          user_id: request.buyer_id,
          title: 'Job closed',
          message: 'This job was closed automatically after the confirmation window ended.',
          notification_type: 'auto_close',
          content_id: request.id,
        });

        jobsAutoClosed += 1;
        continue;
      }

      const nextNudge = nudgeSequence[currentNudgeIndex];
      if (nextNudge && hoursSinceComplete >= nextNudge.hours) {
        await insertNotificationAndSendPush(supabase, {
          user_id: request.buyer_id,
          title: 'Confirm completed job',
          message: nextNudge.message,
          notification_type: 'warranty_nudge',
          content_id: request.id,
        });

        await supabase
          .from('maintenance_requests')
          .update({
            nudge_count: currentNudgeIndex + 1,
            last_nudge_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        nudgesSent += 1;
      }
    }

    return new Response(
      JSON.stringify({ success: true, nudgesSent, jobsAutoClosed }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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
