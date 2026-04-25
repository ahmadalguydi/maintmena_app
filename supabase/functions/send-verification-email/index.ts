import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'https://maintmena.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate secure random token
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normalizeLanguage = (value: unknown): 'en' | 'ar' =>
  value === 'ar' ? 'ar' : 'en';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    console.log('send-verification-email: Starting request processing');
    
    const { userId, email, language = 'en' } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedLanguage = normalizeLanguage(language);
    console.log('send-verification-email: Received request for email:', normalizedEmail, 'language:', normalizedLanguage);

    // Input validation
    if (!normalizedEmail || normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      console.error('send-verification-email: Invalid email address');
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if Brevo API key is configured
    if (!BREVO_API_KEY) {
      console.error('send-verification-email: BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let finalUserId = typeof userId === 'string' && userId.length > 0 ? userId : '';

    if (finalUserId) {
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(finalUserId);

      if (userError || !user || user.email?.toLowerCase() !== normalizedEmail) {
        console.error('send-verification-email: User/email mismatch');
        return new Response(
          JSON.stringify({ error: 'Invalid verification request' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
    } else {
      // Resend case. Keep the external response generic to avoid account enumeration.
      console.log('send-verification-email: Looking up user by email');
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.error('send-verification-email: Error listing users:', userError);
        throw new Error('Failed to look up user');
      }
      
      const foundUser = users?.find(u => u.email?.toLowerCase() === normalizedEmail);
      
      if (!foundUser) {
        console.log('send-verification-email: No matching user for resend request');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
      
      finalUserId = foundUser.id;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, user_type')
      .eq('id', finalUserId)
      .single();

    const finalFullName = profile?.full_name || 'User';
    const safeFullName = escapeHtml(finalFullName.slice(0, 100));

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing unverified tokens for this user
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', finalUserId)
      .is('verified_at', null);

    // Store new token in database
    const { error: tokenError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: finalUserId,
        token: token,
        expires_at: expiresAt.toISOString()
      });

    if (tokenError) {
      console.error('send-verification-email: Error storing token:', tokenError);
      throw new Error('Failed to create verification token');
    }

    // Build verification URL
    const functionUrl = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co');
    const verificationUrl = `${functionUrl}/verify-email?token=${token}&lang=${normalizedLanguage}`;
    console.log('send-verification-email: Verification URL generated');

    // Prepare email content based on language
    const emailContent = normalizedLanguage === 'ar' ? {
      subject: 'تحقق من بريدك الإلكتروني - MaintMENA',
      htmlContent: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Tajawal', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #B45309 0%, #92400e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #B45309; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; margin-top: 20px; border-radius: 8px; }
            .note { background: #fff3cd; border-right: 4px solid #B45309; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>تحقق من بريدك الإلكتروني</h1>
            </div>
            <div class="content">
              <p>مرحباً ${safeFullName}،</p>
              <p>شكراً لتسجيلك في MaintMENA! لتفعيل حسابك، يرجى التحقق من عنوان بريدك الإلكتروني بالنقر على الزر أدناه:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">تحقق من البريد الإلكتروني</a>
              </div>
              <div class="note">
                <p><strong>⏱️ مهم:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.</p>
              </div>
              <p>إذا لم تقم بإنشاء حساب على MaintMENA، يرجى تجاهل هذا البريد.</p>
              <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                إذا لم يعمل الزر، يمكنك نسخ هذا الرابط ولصقه في متصفحك:<br>
                <a href="${verificationUrl}" style="color: #B45309;">${verificationUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>MaintMENA - منصتك للصيانة والمشاريع في الشرق الأوسط وشمال أفريقيا</p>
              <p><a href="https://maintmena.com">maintmena.com</a> | <a href="https://maintmena.com/support">الدعم الفني</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    } : {
      subject: 'Verify Your Email - MaintMENA',
      htmlContent: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #B45309 0%, #92400e 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #B45309; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; margin-top: 20px; border-radius: 8px; }
            .note { background: #fff3cd; border-left: 4px solid #B45309; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Hi ${safeFullName},</p>
              <p>Thank you for signing up for MaintMENA! To activate your account, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email</a>
              </div>
              <div class="note">
                <p><strong>⏱️ Important:</strong> This link is valid for 24 hours only.</p>
              </div>
              <p>If you didn't create an account on MaintMENA, please ignore this email.</p>
              <p style="margin-top: 30px; font-size: 12px; color: #6c757d;">
                If the button doesn't work, you can copy and paste this link into your browser:<br>
                <a href="${verificationUrl}" style="color: #B45309;">${verificationUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>MaintMENA - Your MENA Maintenance & Projects Platform</p>
              <p><a href="https://maintmena.com">maintmena.com</a> | <a href="https://maintmena.com/support">Support</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email via Brevo
    console.log('send-verification-email: Sending email via Brevo');
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
        to: [{
          email: normalizedEmail,
          name: finalFullName
        }],
        subject: emailContent.subject,
        htmlContent: emailContent.htmlContent,
        tags: ['email_verification', 'transactional']
      })
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('send-verification-email: Brevo API error:', brevoResponse.status, errorText);
      throw new Error(`Failed to send email: ${brevoResponse.status}`);
    }

    const result = await brevoResponse.json();
    console.log('send-verification-email: Email sent successfully:', result.messageId);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('send-verification-email: Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
