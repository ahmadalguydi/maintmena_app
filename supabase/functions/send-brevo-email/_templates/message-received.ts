export const getMessageReceivedTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { 
    senderName,
    messagePreview,
    conversationUrl = 'https://maintmena.com/messages'
  } = data;

  if (language === 'ar') {
    return {
      subject: `رسالة جديدة من ${senderName}`,
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
            .message-box { background: white; border-right: 4px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 رسالة جديدة</h1>
            </div>
            <div class="content">
              <h2>لديك رسالة جديدة من ${senderName}</h2>
              
              <div class="message-box">
                <p>${messagePreview}...</p>
              </div>

              <a href="${conversationUrl}" class="button">عرض المحادثة الكاملة</a>

              <p><em>رد سريع يساعد في بناء الثقة وإتمام الصفقات بشكل أسرع!</em></p>
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
    subject: `New Message from ${senderName}`,
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
            .message-box { background: white; border-left: 4px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Message</h1>
          </div>
          <div class="content">
            <h2>You have a new message from ${senderName}</h2>
            
            <div class="message-box">
              <p>${messagePreview}...</p>
            </div>

            <a href="${conversationUrl}" class="button">View Full Conversation</a>

            <p><em>Quick responses help build trust and close deals faster!</em></p>
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
