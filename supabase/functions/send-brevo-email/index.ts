import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_CONTACTS_URL = 'https://api.brevo.com/v3/contacts';
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INTERNAL_EMAIL_SECRET = Deno.env.get('INTERNAL_EMAIL_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': APP_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

interface EmailRequest {
  type: string;
  to_email: string;
  to_name: string;
  language: 'en' | 'ar';
  data: Record<string, any>;
}

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : '';
  const secretHeader = req.headers.get('x-internal-email-secret') ?? '';

  return (
    (!!SUPABASE_SERVICE_ROLE_KEY && bearer === SUPABASE_SERVICE_ROLE_KEY) ||
    (!!INTERNAL_EMAIL_SECRET && secretHeader === INTERNAL_EMAIL_SECRET)
  );
}

// Import templates
import { getWelcomeBuyerTemplate } from './_templates/welcome-buyer.ts';
import { getWelcomeSellerTemplate } from './_templates/welcome-seller.ts';
import { getMessageReceivedTemplate } from './_templates/message-received.ts';

const getEmailTemplate = (type: string, language: 'en' | 'ar', data: Record<string, any>) => {
  switch (type) {
    case 'welcome_buyer':
      return getWelcomeBuyerTemplate(language, data);
    case 'welcome_seller':
      return getWelcomeSellerTemplate(language, data);
    case 'message_received':
      return getMessageReceivedTemplate(language, data);
    case 'quote_received':
    case 'contract_created':
    case 'trial_expiring':
      throw new Error(`${type} email is not part of the active request dispatch flow`);
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

// Function to sync contact with Brevo
const syncContactWithBrevo = async (
  email: string,
  name: string,
  data: Record<string, any>
) => {
  try {
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ');

    const contactPayload = {
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName || '',
        USER_TYPE: data.userType || 'unknown',
        LANGUAGE: data.language || 'en',
        SIGNUP_DATE: new Date().toISOString().split('T')[0],
      },
      updateEnabled: true,
    };

    const response = await fetch(BREVO_CONTACTS_URL, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo contact sync error:', errorText);
    }
  } catch (error) {
    console.error('Error syncing contact with Brevo:', error);
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!isAuthorizedInternal(req)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { type, to_email, to_name, language = 'en', data } = body as EmailRequest;

    // Validate inputs
    if (!type || !to_email || !to_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const { subject, htmlContent } = getEmailTemplate(type, language, data);

    // Send via Brevo API
    const brevoResponse = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'MaintMENA',
          email: 'noreply@maintmena.com'
        },
        to: [
          {
            email: to_email,
            name: to_name
          }
        ],
        subject,
        htmlContent,
        tags: [type.includes('welcome') || type === 'message_received' ? 'transactional' : 'marketing']
      })
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('Brevo API error:', errorText);
      throw new Error(`Brevo API error: ${brevoResponse.status} - ${errorText}`);
    }

    const result = await brevoResponse.json();

    // Sync contact with Brevo
    syncContactWithBrevo(to_email, to_name, { ...data, language });

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-brevo-email function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send email. Please try again.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
