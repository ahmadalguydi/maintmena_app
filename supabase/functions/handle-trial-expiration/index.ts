import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const internalSecret = Deno.env.get('INTERNAL_TRIAL_EXPIRATION_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trial-expiration-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const isAuthorizedInternalRequest = (req: Request): boolean => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  const secretHeader = req.headers.get('x-internal-trial-expiration-secret') ?? '';

  return Boolean(
    (serviceRoleKey && bearerToken === serviceRoleKey) ||
    (internalSecret && secretHeader === internalSecret),
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!isAuthorizedInternalRequest(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Call the database function to handle trial expirations
    const { error } = await supabaseClient.rpc('handle_trial_expiration');

    if (error) {
      console.error('Error handling trial expiration:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Trial expirations processed successfully' }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
