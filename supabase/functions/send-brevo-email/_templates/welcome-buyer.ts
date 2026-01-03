export const getWelcomeBuyerTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { userName, dashboardUrl = 'https://maintmena.com/buyer-dashboard' } = data;

  if (language === 'ar') {
    return {
      subject: 'مرحباً بك في MaintMENA',
      htmlContent: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Tajawal', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; direction: rtl; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #B45309 0%, #0C2340 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مرحباً ${userName}!</h1>
              <p>نحن سعداء بانضمامك إلى منصة MaintMENA</p>
            </div>
            <div class="content">
              <img src="https://maintmena.com/images/welcome-maintmena.png" alt="Welcome to MaintMENA" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />
              <h2>ابدأ رحلتك معنا</h2>
              <p>كمشتري على منصة MaintMENA، يمكنك:</p>
              <ul>
                <li>نشر طلبات الصيانة والمشاريع</li>
                <li>استقبال عروض الأسعار من مقدمي الخدمات المؤهلين</li>
                <li>مقارنة العروض واختيار الأفضل</li>
                <li>إدارة العقود والمدفوعات بأمان</li>
              </ul>
              <a href="${dashboardUrl}" class="button">انتقل إلى لوحة التحكم</a>
              <p><strong>نصيحة:</strong> أكمل ملفك الشخصي للحصول على عروض أفضل!</p>
            </div>
            <div class="footer">
              <p>MaintMENA - منصتك للصيانة والمشاريع في الشرق الأوسط وشمال أفريقيا</p>
              <p><a href="https://maintmena.com">maintmena.com</a> | <a href="https://maintmena.com/support">الدعم الفني</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  return {
    subject: 'Welcome to MaintMENA',
    htmlContent: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #B45309 0%, #0C2340 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome ${userName}!</h1>
            <p>We're excited to have you on MaintMENA</p>
          </div>
          <div class="content">
            <img src="https://maintmena.com/images/welcome-maintmena.png" alt="Welcome to MaintMENA" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />
            <h2>Get Started</h2>
            <p>As a buyer on MaintMENA, you can:</p>
            <ul>
              <li>Post maintenance requests and projects</li>
              <li>Receive quotes from qualified service providers</li>
              <li>Compare offers and choose the best one</li>
              <li>Manage contracts and payments securely</li>
            </ul>
            <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            <p><strong>Pro tip:</strong> Complete your profile to get better quotes!</p>
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
