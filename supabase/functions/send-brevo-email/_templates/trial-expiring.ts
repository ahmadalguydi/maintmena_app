export const getTrialExpiringTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { 
    userName,
    daysLeft,
    upgradeUrl = 'https://maintmena.com/pricing'
  } = data;

  if (language === 'ar') {
    return {
      subject: `⏰ تبقى ${daysLeft} أيام على انتهاء فترة التجربة المجانية`,
      htmlContent: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Tajawal', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0C2340 0%, #B45309 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; }
            .highlight-box { background: #fff3cd; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⏰ فترة التجربة تنتهي قريباً</h1>
            </div>
            <div class="content">
              <h2>مرحباً ${userName},</h2>
              <p>فترة التجربة المجانية الخاصة بك على وشك الانتهاء.</p>
              
              <div class="highlight-box">
                <h3 style="color: #B45309; margin: 0;">تبقى ${daysLeft} أيام فقط!</h3>
              </div>

              <p><strong>لا تفوت الفرصة:</strong></p>
              <ul>
                <li>الوصول الكامل لجميع الميزات</li>
                <li>فرص حصرية للمشاريع</li>
                <li>دعم فني متميز</li>
                <li>تقارير وتحليلات متقدمة</li>
              </ul>

              <a href="${upgradeUrl}" class="button">ترقية الاشتراك الآن</a>

              <p><em>لا تدع فرصك تضيع! قم بالترقية اليوم واستمر في النجاح.</em></p>
            </div>
            <div class="footer">
              <p>MaintMENA - منصتك للصيانة والمشاريع</p>
              <p><a href="https://maintmena.com">maintmena.com</a> | <a href="https://maintmena.com/support">الدعم</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  return {
    subject: `⏰ ${daysLeft} Days Left in Your Free Trial`,
    htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0C2340 0%, #B45309 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; }
            .highlight-box { background: #fff3cd; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Trial Ending Soon</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your free trial on MaintMENA is about to end.</p>
            
            <div class="highlight-box">
              <h3 style="color: #B45309; margin: 0;">Only ${daysLeft} Days Left!</h3>
            </div>

            <p><strong>Don't miss out on:</strong></p>
            <ul>
              <li>Full access to all features</li>
              <li>Exclusive project opportunities</li>
              <li>Priority support</li>
              <li>Advanced reports and analytics</li>
            </ul>

            <a href="${upgradeUrl}" class="button">Upgrade Now</a>

            <p><em>Don't let your opportunities slip away! Upgrade today and continue your success.</em></p>
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
};
