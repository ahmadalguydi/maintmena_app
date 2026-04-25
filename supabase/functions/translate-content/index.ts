import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const INTERNAL_TRANSLATION_SECRET = Deno.env.get('INTERNAL_TRANSLATION_SECRET');

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : '';
  const secretHeader = req.headers.get('x-internal-translation-secret') ?? '';

  return (
    (!!SUPABASE_SERVICE_ROLE_KEY && bearer === SUPABASE_SERVICE_ROLE_KEY) ||
    (!!INTERNAL_TRANSLATION_SECRET && secretHeader === INTERNAL_TRANSLATION_SECRET)
  );
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': APP_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-translation-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

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
    const { text, sourceLang, targetLang, context } = body;

    // Validate inputs
    if (!text || !targetLang) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, targetLang' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof text !== 'string' || text.length > 10000) {
      return new Response(
        JSON.stringify({ error: 'Invalid text input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI for translation
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text from ${sourceLang || 'auto-detect'} to ${targetLang}. 
Context: ${context || 'general content'}. 
IMPORTANT: Return ONLY the translated text, nothing else. No explanations, no notes, just the translation.
Maintain the tone and style of the original. If translating to Arabic, ensure proper grammar and natural modern Arabic suitable for home services. Avoid repetitive phrases across items. Vary sentence structure and vocabulary between similar posts for natural diversity.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Translation service error', details: errorText }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content || text;

    return new Response(
      JSON.stringify({ translatedText }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
