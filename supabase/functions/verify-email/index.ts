import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://owvzutteoguscbymypyl.lovableproject.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const language = url.searchParams.get('lang') || 'en';

    if (!token || typeof token !== 'string' || token.length < 10) {
      return redirectToLogin('invalid', language);
    }

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Look up token
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('verified_at', null)
      .single();

    if (tokenError || !tokenData) {
      return redirectToLogin('invalid', language);
    }

    // Check if token expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return redirectToLogin('expired', language);
    }

    // Get user details
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(tokenData.user_id);

    if (userError || !user) {
      return redirectToLogin('invalid', language);
    }

    // Update user email_confirmed_at using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (updateError) {
      throw new Error('Failed to verify email');
    }

    // Mark token as verified
    await supabase
      .from('email_verification_tokens')
      .update({ verified_at: new Date().toISOString() })
      .eq('token', token);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, user_type')
      .eq('id', tokenData.user_id)
      .single();

    // Send welcome email via existing send-brevo-email function
    if (profile) {
      const emailType = profile.user_type === 'seller' ? 'welcome_seller' : 'welcome_buyer';
      const dashboardUrl = profile.user_type === 'seller' 
        ? 'https://maintmena.com/seller-dashboard'
        : 'https://maintmena.com/buyer-dashboard';

      try {
        await supabase.functions.invoke('send-brevo-email', {
          body: {
            type: emailType,
            to_email: user.email,
            to_name: profile.full_name,
            language: language,
            data: {
              userName: profile.full_name,
              dashboardUrl: dashboardUrl
            }
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    // Redirect to login
    return redirectToLogin('success', language);

  } catch (error: any) {
    console.error('Error in verify-email function:', error);
    return new Response('Verification failed', { status: 500, headers: corsHeaders });
  }
});

function redirectToLogin(status: string, language: string) {
  const baseUrl = 'https://owvzutteoguscbymypyl.lovableproject.com';
  const redirectUrl = `${baseUrl}/app/onboarding/login?verified=${status}&lang=${language}`;
  
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      'Location': redirectUrl
    }
  });
}
