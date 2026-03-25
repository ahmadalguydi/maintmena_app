import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NudgeJob {
  id: string;
  buyer_id: string;
  seller_id: string;
  service_category: string | null;
  nudge_count: number;
  completed_at: string | null;
  seller_marked_complete: boolean;
  buyer_marked_complete: boolean;
  type: 'booking' | 'request';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting nudge-completion job...');

    // Get bookings where seller marked complete but buyer hasn't
    const { data: pendingBookings, error: bookingError } = await supabase
      .from('booking_requests')
      .select('id, buyer_id, seller_id, service_category, nudge_count, completed_at, seller_marked_complete, buyer_marked_complete, seller_completion_date')
      .eq('seller_marked_complete', true)
      .eq('buyer_marked_complete', false)
      .eq('auto_closed', false)
      .not('seller_completion_date', 'is', null);

    if (bookingError) {
      console.error('Error fetching bookings:', bookingError);
      throw bookingError;
    }

    // Get maintenance requests where seller marked complete but buyer hasn't
    const { data: pendingRequests, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('id, buyer_id, assigned_seller_id, category, nudge_count, seller_marked_complete, buyer_marked_complete, seller_completion_date')
      .eq('seller_marked_complete', true)
      .eq('buyer_marked_complete', false)
      .eq('auto_closed', false)
      .not('seller_completion_date', 'is', null);

    if (requestError) {
      console.error('Error fetching requests:', requestError);
      throw requestError;
    }

    const nudgeSequence = [
      { hours: 1, message_en: 'Activate your warranty now!', message_ar: 'فعّل ضمانك الآن!' },
      { hours: 6, message_en: 'Your warranty is waiting...', message_ar: 'ضمانك في الانتظار...' },
      { hours: 24, message_en: 'Job still unconfirmed. Confirm to protect your work.', message_ar: 'العمل لم يُؤكد بعد. أكّد لحماية عملك.' },
      { hours: 72, message_en: 'Final reminder: Confirm your job completion', message_ar: 'تذكير أخير: أكّد إتمام عملك' },
      { hours: 168, message_en: 'Auto-closing soon without warranty', message_ar: 'سيُغلق تلقائياً قريباً بدون ضمان' }
    ];

    let nudgesSent = 0;
    let jobsAutoClosed = 0;

    // Process bookings
    for (const booking of pendingBookings || []) {
      const completedAt = new Date(booking.seller_completion_date);
      const hoursSinceComplete = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
      const currentNudgeIndex = booking.nudge_count || 0;

      // Check if should auto-close (after 7 days / 168 hours)
      if (hoursSinceComplete >= 168) {
        await supabase
          .from('booking_requests')
          .update({ 
            auto_closed: true,
            status: 'unconfirmed_no_warranty'
          })
          .eq('id', booking.id);

        // Create notification
        await supabase.from('notifications').insert({
          user_id: booking.buyer_id,
          title: 'Job Auto-Closed',
          message: 'Your job was auto-closed without warranty activation due to no confirmation.',
          notification_type: 'auto_close',
          content_id: booking.id
        });

        jobsAutoClosed++;
        continue;
      }

      // Check if time for next nudge
      if (currentNudgeIndex < nudgeSequence.length) {
        const nextNudge = nudgeSequence[currentNudgeIndex];
        if (hoursSinceComplete >= nextNudge.hours) {
          // Send nudge notification
          await supabase.from('notifications').insert({
            user_id: booking.buyer_id,
            title: 'Confirm Work Complete',
            message: nextNudge.message_en,
            notification_type: 'warranty_nudge',
            content_id: booking.id
          });

          // Update nudge count
          await supabase
            .from('booking_requests')
            .update({ 
              nudge_count: currentNudgeIndex + 1,
              last_nudge_at: new Date().toISOString()
            })
            .eq('id', booking.id);

          nudgesSent++;
        }
      }
    }

    // Process maintenance requests (similar logic)
    for (const request of pendingRequests || []) {
      const completedAt = new Date(request.seller_completion_date);
      const hoursSinceComplete = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
      const currentNudgeIndex = request.nudge_count || 0;

      if (hoursSinceComplete >= 168) {
        await supabase
          .from('maintenance_requests')
          .update({ 
            auto_closed: true,
            status: 'unconfirmed_no_warranty'
          })
          .eq('id', request.id);

        await supabase.from('notifications').insert({
          user_id: request.buyer_id,
          title: 'Job Auto-Closed',
          message: 'Your job was auto-closed without warranty activation due to no confirmation.',
          notification_type: 'auto_close',
          content_id: request.id
        });

        jobsAutoClosed++;
        continue;
      }

      if (currentNudgeIndex < nudgeSequence.length) {
        const nextNudge = nudgeSequence[currentNudgeIndex];
        if (hoursSinceComplete >= nextNudge.hours) {
          await supabase.from('notifications').insert({
            user_id: request.buyer_id,
            title: 'Confirm Work Complete',
            message: nextNudge.message_en,
            notification_type: 'warranty_nudge',
            content_id: request.id
          });

          await supabase
            .from('maintenance_requests')
            .update({ 
              nudge_count: currentNudgeIndex + 1,
              last_nudge_at: new Date().toISOString()
            })
            .eq('id', request.id);

          nudgesSent++;
        }
      }
    }

    console.log(`Nudge job complete. Nudges sent: ${nudgesSent}, Jobs auto-closed: ${jobsAutoClosed}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        nudgesSent, 
        jobsAutoClosed 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Nudge completion error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
