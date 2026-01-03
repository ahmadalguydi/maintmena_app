export const getContractCreatedTemplate = (language: 'en' | 'ar', data: Record<string, any>) => {
  const { 
    contractId,
    projectTitle,
    otherPartyName,
    contractUrl = `https://maintmena.com/contracts/${data.contractId}`
  } = data;

  if (language === 'ar') {
    return {
      subject: `عقد جديد جاهز للمراجعة: ${projectTitle}`,
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
            .contract-box { background: white; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fff3cd; border-right: 4px solid #B45309; padding: 15px; margin: 20px 0; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📄 عقد جديد</h1>
            </div>
            <div class="content">
              <h2>تم إنشاء عقد خدمة</h2>
              <p>تم إنشاء عقد جديد للمشروع: <strong>${projectTitle}</strong></p>
              
              <div class="contract-box">
                <h3>تفاصيل العقد:</h3>
                <p><strong>رقم العقد:</strong> ${contractId}</p>
                <p><strong>الطرف الآخر:</strong> ${otherPartyName}</p>
              </div>

              <div class="warning">
                <strong>⚠️ مطلوب إجراء:</strong> يرجى مراجعة العقد وتوقيعه لبدء العمل.
              </div>

              <a href="${contractUrl}" class="button">مراجعة وتوقيع العقد</a>

              <p><strong>ما يجب فعله:</strong></p>
              <ol>
                <li>راجع جميع بنود العقد بعناية</li>
                <li>تأكد من أن جميع التفاصيل صحيحة</li>
                <li>وقع العقد إلكترونياً</li>
                <li>انتظر توقيع الطرف الآخر</li>
              </ol>

              <p><em>بعد توقيع الطرفين، سيصبح العقد ملزماً قانونياً ويمكن بدء العمل.</em></p>
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
    subject: `New Contract Ready for Review: ${projectTitle}`,
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
            .contract-box { background: white; border: 2px solid #B45309; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #B45309; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .warning { background: #fff3cd; border-left: 4px solid #B45309; padding: 15px; margin: 20px 0; }
            .footer { background: #e9ecef; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
          </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 New Contract</h1>
          </div>
          <div class="content">
            <h2>A Service Contract Has Been Created</h2>
            <p>A new contract has been created for the project: <strong>${projectTitle}</strong></p>
            
            <div class="contract-box">
              <h3>Contract Details:</h3>
              <p><strong>Contract ID:</strong> ${contractId}</p>
              <p><strong>Other Party:</strong> ${otherPartyName}</p>
            </div>

            <div class="warning">
              <strong>⚠️ Action Required:</strong> Please review and sign the contract to start work.
            </div>

            <a href="${contractUrl}" class="button">Review & Sign Contract</a>

            <p><strong>What to do:</strong></p>
            <ol>
              <li>Review all contract terms carefully</li>
              <li>Ensure all details are correct</li>
              <li>Sign the contract electronically</li>
              <li>Wait for the other party to sign</li>
            </ol>

            <p><em>Once both parties sign, the contract becomes legally binding and work can begin.</em></p>
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
