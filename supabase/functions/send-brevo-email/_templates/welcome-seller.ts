export const getWelcomeSellerTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { userName, dashboardUrl = 'https://maintmena.com/seller-dashboard' } = data;

  if (language === 'ar') {
    return {
      subject: 'مرحباً بك في MaintMENA - ابدأ باستقبال المشاريع',
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
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>مرحباً ${userName}!</h1>
              <p>انضم إلى شبكة مقدمي الخدمات المحترفين</p>
            </div>
            <div class="content">
              <img src="https://maintmena.com/images/welcome-maintmena.png" alt="Welcome to MaintMENA" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />
              <h2>ابدأ بتنمية أعمالك</h2>
              <p>كمقدم خدمة على منصة MaintMENA، يمكنك:</p>
              <ul>
                <li>تصفح طلبات المشاريع والصيانة</li>
                <li>تقديم عروض الأسعار التنافسية</li>
                <li>بناء سمعتك من خلال التقييمات</li>
                <li>الحصول على دفعات آمنة وفي الوقت المحدد</li>
              </ul>
              <a href="${dashboardUrl}" class="button">تصفح الفرص المتاحة</a>
              <p><strong>نصيحة:</strong> أكمل ملفك الشخصي وأضف شهاداتك لزيادة فرصك!</p>
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
    subject: 'Welcome to MaintMENA - Start Winning Projects',
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
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome ${userName}!</h1>
            <p>Join the network of professional service providers</p>
          </div>
          <div class="content">
            <img src="https://maintmena.com/images/welcome-maintmena.png" alt="Welcome to MaintMENA" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 20px;" />
            <h2>Start Growing Your Business</h2>
            <p>As a seller on MaintMENA, you can:</p>
            <ul>
              <li>Browse maintenance and project requests</li>
              <li>Submit competitive quotes</li>
              <li>Build your reputation through reviews</li>
              <li>Receive secure and timely payments</li>
            </ul>
            <a href="${dashboardUrl}" class="button">Browse Opportunities</a>
            <p><strong>Pro tip:</strong> Complete your profile and add certifications to increase your chances!</p>
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
