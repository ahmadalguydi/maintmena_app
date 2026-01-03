export const getQuoteReceivedTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { 
    requestTitle, 
    sellerName, 
    quotePrice, 
    quoteDuration,
    quoteUrl = 'https://maintmena.com/manage-quotes'
  } = data;

  if (language === 'ar') {
    return {
      subject: `عرض سعر جديد لطلبك: ${requestTitle}`,
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
            .quote-box { background: white; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 عرض سعر جديد!</h1>
            </div>
            <div class="content">
              <h2>استلمت عرض سعر جديد</h2>
              <p>تلقيت عرض سعر جديد لطلبك: <strong>${requestTitle}</strong></p>
              
              <div class="quote-box">
                <h3>تفاصيل العرض:</h3>
                <p><strong>مقدم الخدمة:</strong> ${sellerName}</p>
                ${quotePrice ? `<p><strong>السعر:</strong> ${quotePrice}</p>` : ''}
                ${quoteDuration ? `<p><strong>المدة المتوقعة:</strong> ${quoteDuration}</p>` : ''}
              </div>

              <a href="${quoteUrl}" class="button">عرض التفاصيل الكاملة</a>

              <p><strong>الخطوات التالية:</strong></p>
              <ul>
                <li>راجع تفاصيل العرض</li>
                <li>قارن مع العروض الأخرى</li>
                <li>تواصل مع مقدم الخدمة إذا كان لديك أسئلة</li>
                <li>اقبل العرض الأنسب لك</li>
              </ul>
            </div>
            <div class="footer">
              <p>MaintMENA - منصتك للصيانة والمشاريع</p>
              <p><a href="https://maintmena.com">maintmena.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  return {
    subject: `New Quote for Your Request: ${requestTitle}`,
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
            .quote-box { background: white; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Quote Received!</h1>
          </div>
          <div class="content">
            <h2>You've Received a New Quote</h2>
            <p>A new quote has been submitted for your request: <strong>${requestTitle}</strong></p>
            
            <div class="quote-box">
              <h3>Quote Details:</h3>
              <p><strong>Service Provider:</strong> ${sellerName}</p>
              ${quotePrice ? `<p><strong>Price:</strong> ${quotePrice}</p>` : ''}
              ${quoteDuration ? `<p><strong>Estimated Duration:</strong> ${quoteDuration}</p>` : ''}
            </div>

            <a href="${quoteUrl}" class="button">View Full Details</a>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the quote details</li>
              <li>Compare with other quotes</li>
              <li>Message the provider if you have questions</li>
              <li>Accept the best offer for your needs</li>
            </ul>
          </div>
          <div class="footer">
            <p>MaintMENA - Your MENA Maintenance & Projects Platform</p>
            <p><a href="https://maintmena.com">maintmena.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};
