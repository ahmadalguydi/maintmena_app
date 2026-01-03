import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { contentType, batchSize = 10 } = await req.json();
    let processed = 0;
    let errors = 0;

    if (contentType === 'requests' || !contentType) {
      // Fetch requests missing translations
      const { data: requests, error: fetchError } = await supabaseClient
        .from('maintenance_requests')
        .select('id, title, description, original_language, title_ar, title_en, description_ar, description_en')
        .or('title_ar.is.null,title_en.is.null,description_ar.is.null,description_en.is.null')
        .limit(batchSize);

      if (fetchError) throw fetchError;

      for (const req of requests || []) {
        const sourceLang = req.original_language || 'en';
        const updates: any = {};

        try {
          // Translate title
          if (!req.title_ar) {
            const { data: arData } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: req.title, sourceLang, targetLang: 'ar', context: 'maintenance request title' }
            });
            if (arData?.translatedText) updates.title_ar = arData.translatedText;
          }

          if (!req.title_en) {
            const { data: enData } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: req.title, sourceLang, targetLang: 'en', context: 'maintenance request title' }
            });
            if (enData?.translatedText) updates.title_en = enData.translatedText;
          }

          // Translate description
          if (!req.description_ar) {
            const { data: arData } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: req.description, sourceLang, targetLang: 'ar', context: 'maintenance request description' }
            });
            if (arData?.translatedText) updates.description_ar = arData.translatedText;
          }

          if (!req.description_en) {
            const { data: enData } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: req.description, sourceLang, targetLang: 'en', context: 'maintenance request description' }
            });
            if (enData?.translatedText) updates.description_en = enData.translatedText;
          }

          if (Object.keys(updates).length > 0) {
            await supabaseClient
              .from('maintenance_requests')
              .update(updates)
              .eq('id', req.id);
            processed++;
          }

          // Rate limit protection
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error translating request ${req.id}:`, err);
          errors++;
        }
      }
    }

    if (contentType === 'profiles' || !contentType) {
      // Fetch profiles missing translations
      const { data: profiles, error: fetchError } = await supabaseClient
        .from('profiles')
        .select('id, full_name, company_name, bio, company_description, original_language, full_name_ar, full_name_en, company_name_ar, company_name_en, bio_ar, bio_en, company_description_ar, company_description_en')
        .eq('user_type', 'seller')
        .or('full_name_ar.is.null,full_name_en.is.null,company_name_ar.is.null,company_name_en.is.null,bio_ar.is.null,bio_en.is.null')
        .limit(batchSize);

      if (fetchError) throw fetchError;

      for (const profile of profiles || []) {
        const sourceLang = profile.original_language || 'en';
        const updates: any = {};

        try {
          if (profile.full_name && !profile.full_name_ar) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.full_name, sourceLang, targetLang: 'ar', context: 'person name' }
            });
            if (data?.translatedText) updates.full_name_ar = data.translatedText;
          }

          if (profile.full_name && !profile.full_name_en) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.full_name, sourceLang, targetLang: 'en', context: 'person name' }
            });
            if (data?.translatedText) updates.full_name_en = data.translatedText;
          }

          if (profile.company_name && !profile.company_name_ar) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.company_name, sourceLang, targetLang: 'ar', context: 'company name' }
            });
            if (data?.translatedText) updates.company_name_ar = data.translatedText;
          }

          if (profile.company_name && !profile.company_name_en) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.company_name, sourceLang, targetLang: 'en', context: 'company name' }
            });
            if (data?.translatedText) updates.company_name_en = data.translatedText;
          }

          if (profile.bio && !profile.bio_ar) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.bio, sourceLang, targetLang: 'ar', context: 'professional bio' }
            });
            if (data?.translatedText) updates.bio_ar = data.translatedText;
          }

          if (profile.bio && !profile.bio_en) {
            const { data } = await supabaseClient.functions.invoke('translate-content', {
              body: { text: profile.bio, sourceLang, targetLang: 'en', context: 'professional bio' }
            });
            if (data?.translatedText) updates.bio_en = data.translatedText;
          }

          if (Object.keys(updates).length > 0) {
            await supabaseClient
              .from('profiles')
              .update(updates)
              .eq('id', profile.id);
            processed++;
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error translating profile ${profile.id}:`, err);
          errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed, 
        errors,
        message: `Processed ${processed} items with ${errors} errors` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});