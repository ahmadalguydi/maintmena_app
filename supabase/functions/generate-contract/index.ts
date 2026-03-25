import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://maintmena.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate input
    const body = await req.json();
    const { contractId } = body;
    
    if (!contractId || typeof contractId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid contract ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating contract for:', contractId.substring(0, 8) + '...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch contract and related data
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // 2. Fetch binding terms
    const { data: bindingTerms } = await supabase
      .from('binding_terms')
      .select('*')
      .eq('contract_id', contractId)
      .single();

    // 3. Fetch source data (quote/booking/request)
    let sourceData: any = {};
    let totalAmount = 0;

    if (contract.quote_id) {
      const { data: quote } = await supabase
        .from('quote_submissions')
        .select('*, maintenance_requests(*)')
        .eq('id', contract.quote_id)
        .single();
      sourceData = quote;
      totalAmount = quote?.price || 0;
    } else if (contract.booking_id) {
      const { data: booking } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('id', contract.booking_id)
        .single();
      sourceData = booking;
      totalAmount = booking?.final_amount || 0;
    }

    // 4. Fetch buyer and seller profiles
    const { data: buyer } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', contract.buyer_id)
      .single();

    const { data: seller } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', contract.seller_id)
      .single();

    // 5. Fetch applicable clauses
    const { data: clauses } = await supabase
      .from('contract_clauses')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    // 6. Build merge variables
    const paymentSchedule = bindingTerms?.payment_schedule || { deposit: 30, progress: 40, completion: 30 };
    const vatAmount = totalAmount * 0.15;
    const totalWithVat = totalAmount + vatAmount;

    const variables: Record<string, any> = {
      contract_date: new Date().toLocaleDateString('en-GB'),
      start_date: bindingTerms?.start_date || 'TBD',
      completion_date: bindingTerms?.completion_date || 'TBD',
      
      // Parties
      seller_name: seller?.full_name || '',
      seller_company: seller?.company_name || '',
      seller_license: seller?.certifications?.[0] || 'N/A',
      seller_address: 'Saudi Arabia',
      buyer_name: buyer?.full_name || '',
      buyer_company: buyer?.company_name || 'Individual',
      buyer_address: sourceData?.location_city || 'Saudi Arabia',
      
      // Project
      project_title: sourceData?.maintenance_requests?.title || sourceData?.service_category || '',
      service_category: sourceData?.category || sourceData?.service_category || '',
      project_description: sourceData?.maintenance_requests?.description || sourceData?.job_description || '',
      work_location: sourceData?.location || sourceData?.location_city || '',
      
      // Financial
      total_amount: totalAmount.toFixed(2),
      vat_amount: vatAmount.toFixed(2),
      total_with_vat: totalWithVat.toFixed(2),
      deposit_pct: paymentSchedule.deposit,
      deposit_amount: (totalAmount * paymentSchedule.deposit / 100).toFixed(2),
      progress_pct: paymentSchedule.progress,
      progress_amount: (totalAmount * paymentSchedule.progress / 100).toFixed(2),
      final_pct: paymentSchedule.completion,
      final_amount: (totalAmount * paymentSchedule.completion / 100).toFixed(2),
      
      // Timeline
      access_hours: bindingTerms?.access_hours || '8 AM - 5 PM',
      warranty_days: bindingTerms?.warranty_days || 90,
      
      // Optional
      use_deposit_escrow: bindingTerms?.use_deposit_escrow || false
    };

    // 7. Filter clauses based on conditions
    const applicableClauses = clauses?.filter(clause => {
      if (!clause.conditions || Object.keys(clause.conditions).length === 0) return true;
      
      const { requires } = clause.conditions as any;
      if (requires === 'use_deposit_escrow' && !bindingTerms?.use_deposit_escrow) return false;
      
      return true;
    }) || [];

    // 8. Render bilingual HTML with simple template replacement
    const renderTemplate = (template: string, vars: Record<string, any>): string => {
      let result = template;
      Object.keys(vars).forEach(key => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, String(vars[key] || ''));
      });
      return result;
    };

    let htmlEn = '<div class="contract-content space-y-6">';
    let htmlAr = '<div class="contract-content space-y-6" dir="rtl">';

    for (const clause of applicableClauses) {
      const contentEn = renderTemplate(clause.content_en, variables);
      const contentAr = renderTemplate(clause.content_ar, variables);
      
      htmlEn += `
        <section class="clause border-b border-rule pb-4">
          <h2 class="text-xl font-bold text-ink mb-3">${clause.title_en}</h2>
          <div class="prose max-w-none text-ink whitespace-pre-wrap">${contentEn}</div>
        </section>
      `;
      
      htmlAr += `
        <section class="clause border-b border-rule pb-4">
          <h2 class="text-xl font-bold text-ink mb-3">${clause.title_ar}</h2>
          <div class="prose max-w-none text-ink whitespace-pre-wrap">${contentAr}</div>
        </section>
      `;
    }

    htmlEn += '</div>';
    htmlAr += '</div>';

    // 9. Combine based on language_mode
    let finalHtml = '';
    if (contract.language_mode === 'dual') {
      finalHtml = `
        <div class="contract-bilingual grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="english-version border-r border-rule pr-8">${htmlEn}</div>
          <div class="arabic-version pl-8">${htmlAr}</div>
        </div>
      `;
    } else if (contract.language_mode === 'english_only') {
      finalHtml = htmlEn;
    } else {
      finalHtml = htmlAr;
    }

    // 10. Generate content hash
    const encoder = new TextEncoder();
    const data = encoder.encode(finalHtml);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 11. Save version
    await supabase.from('contract_versions').insert({
      contract_id: contractId,
      version: contract.version,
      html_snapshot: finalHtml,
      binding_terms_snapshot: bindingTerms,
      content_hash: contentHash,
      changed_by: contract.buyer_id
    });

    // 12. Update contract
    await supabase
      .from('contracts')
      .update({
        html_snapshot: finalHtml,
        content_hash: contentHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    console.log('Contract generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        html: finalHtml,
        contentHash 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating contract:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate contract. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
