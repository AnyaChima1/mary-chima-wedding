const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Basic authentication check
    const authHeader = event.headers.authorization;
    const expectedAuth = process.env.ADMIN_PASSWORD || 'Mary&Chima0003';
    
    if (expectedAuth && (!authHeader || authHeader !== `Bearer ${expectedAuth}`)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { recipient_ids, message, subject, notification_type } = data;
    if (!recipient_ids || !Array.isArray(recipient_ids) || !message || !subject) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: recipient_ids, message, and subject are required' 
        }),
      };
    }

    // Initialize Neon connection
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured' }),
      };
    }
    
    const sql = neon(databaseUrl);

    // Create notifications table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        rsvp_id INTEGER REFERENCES rsvps(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        notification_type VARCHAR(100) DEFAULT 'general',
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'pending'
      )
    `;

    // Get recipient details
    const recipients = await sql`
      SELECT id, name, email FROM rsvps 
      WHERE id = ANY(${recipient_ids}) AND attendance = 'yes'
    `;

    // Store notification records and send actual emails
    let sentCount = 0;
    let emailErrors = [];
    let emailMethod = 'Not determined';
    
    for (const recipient of recipients) {
      try {
        // Store notification record in database
        await sql`
          INSERT INTO notifications (rsvp_id, email, subject, message, notification_type, status)
          VALUES (${recipient.id}, ${recipient.email}, ${subject}, ${message}, ${notification_type || 'general'}, 'sending')
        `;
        
        // Send actual email using direct SendGrid API (fallback for free Netlify plans)
        // Try Netlify Email Integration first, fall back to direct API if not configured
        const useNetlifyEmails = process.env.NETLIFY_EMAILS_SECRET && process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
        
        if (useNetlifyEmails) {
          // Use Netlify Email Integration
          const emailResponse = await fetch(`${process.env.URL}/.netlify/functions/emails/notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'netlify-emails-secret': process.env.NETLIFY_EMAILS_SECRET
            },
            body: JSON.stringify({
              from: process.env.WEDDING_EMAIL_FROM || 'info@maryandchima.love',
              to: recipient.email,
              subject: subject,
              parameters: {
                subject: subject,
                message: message.replace(/\n/g, '<br>'),
                website_url: process.env.URL || 'https://maryandchima.love',
                recipient_name: recipient.name
              }
            })
          });
          
          if (emailResponse.ok) {
            emailMethod = 'Netlify Email Integration';
          } else {
            throw new Error(`Netlify Email API error: ${await emailResponse.text()}`);
          }
        } else {
          // Use direct SendGrid API (no environment variables needed)
          emailMethod = 'Direct SendGrid API';
          const sendGridApiKey = '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';
          const fromEmail = 'info@maryandchima.love';
          const fromName = 'Mary & Chima Wedding';
          const websiteUrl = 'https://maryandchima.love';
          
          // Create HTML email content
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family: Georgia, serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
        <div style="background: linear-gradient(135deg, #c8a951, #b8954a); color: white; text-align: center; padding: 30px 20px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">Mary & Chima's Wedding</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">An Important Update</p>
        </div>
        <div style="padding: 30px 20px;">
            <h2 style="color: #c8a951; font-size: 22px; margin: 0 0 20px 0;">${subject}</h2>
            <div style="font-size: 16px; line-height: 1.7; color: #555; margin-bottom: 25px;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${websiteUrl}" style="display: inline-block; background: #c8a951; color: white; text-decoration: none; padding: 12px 30px; border-radius: 25px; font-weight: bold;">Visit Wedding Website</a>
            </div>
        </div>
        <div style="background: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 14px; color: #666;">
                This message was sent from Mary & Chima's Wedding Website.<br>
                If you have any questions, please reply to this email.
            </p>
            <div style="margin-top: 15px; font-size: 12px; color: #999;">
                <p style="margin: 5px 0;">💕 With love, Mary & Chima</p>
            </div>
        </div>
    </div>
</body>
</html>`;

          // Send email via SendGrid API
          const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sendGridApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: recipient.email, name: recipient.name }],
                subject: subject
              }],
              from: { email: fromEmail, name: fromName },
              content: [
                { type: 'text/plain', value: message },
                { type: 'text/html', value: htmlContent }
              ]
            })
          });
          
          if (emailResponse.ok || emailResponse.status === 202) {
            // Update notification status to sent
            await sql`
              UPDATE notifications 
              SET status = 'sent', sent_at = NOW()
              WHERE rsvp_id = ${recipient.id} AND subject = ${subject} AND status = 'sending'
            `;
            
            // Mark RSVP as notified
            await sql`
              UPDATE rsvps 
              SET notification_sent = true
              WHERE id = ${recipient.id}
            `;
            
            sentCount++;
          } else {
            const emailError = await emailResponse.text();
            emailErrors.push(`${recipient.name} (${recipient.email}): ${emailError}`);
            
            // Update notification status to failed
            await sql`
              UPDATE notifications 
              SET status = 'failed', sent_at = NOW()
              WHERE rsvp_id = ${recipient.id} AND subject = ${subject} AND status = 'sending'
            `;
          }
        }
        
      } catch (emailError) {
        console.error(`Email error for ${recipient.email}:`, emailError);
        emailErrors.push(`${recipient.name} (${recipient.email}): ${emailError.message}`);
        
        // Update notification status to failed
        try {
          await sql`
            UPDATE notifications 
            SET status = 'failed', sent_at = NOW()
            WHERE rsvp_id = ${recipient.id} AND subject = ${subject} AND status = 'sending'
          `;
        } catch (updateError) {
          console.error('Error updating notification status:', updateError);
        }
      }
    }
    
    // Prepare response
    const response = {
      success: sentCount > 0,
      method: emailMethod,
      message: sentCount === recipients.length 
        ? `All ${sentCount} notifications sent successfully via ${emailMethod}!`
        : `${sentCount} of ${recipients.length} notifications sent successfully via ${emailMethod}`,
      sentCount,
      totalRecipients: recipients.length,
      recipients: recipients.map(r => ({ id: r.id, name: r.name, email: r.email })),
      errors: emailErrors.length > 0 ? emailErrors : undefined
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('Notification error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};