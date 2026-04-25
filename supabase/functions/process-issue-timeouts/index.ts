// @ts-ignore - Deno runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - Deno runtime import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com'
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const internalSecret = Deno.env.get('INTERNAL_ISSUE_TIMEOUT_SECRET') ?? ''

const corsHeaders = {
    'Access-Control-Allow-Origin': appOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-issue-timeout-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const isAuthorizedInternalRequest = (req: Request): boolean => {
    const authHeader = req.headers.get('Authorization') ?? ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
    const secretHeader = req.headers.get('x-internal-issue-timeout-secret') ?? ''

    return Boolean(
        (serviceRoleKey && bearerToken === serviceRoleKey) ||
        (internalSecret && secretHeader === internalSecret),
    )
}

// @ts-ignore - Deno serve function
serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    if (!isAuthorizedInternalRequest(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    try {
        // Create Supabase client with service role for admin access
        // @ts-ignore - Deno global
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!

        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // Call the timeout processing function
        const { data, error } = await supabase.rpc('process_issue_timeouts')

        if (error) {
            console.error('Error processing timeouts:', error)
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        console.log('Timeout processing completed successfully')

        return new Response(JSON.stringify({
            success: true,
            message: 'Issue timeouts processed',
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (err) {
        console.error('Unexpected error:', err)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
