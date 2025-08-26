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

    // Store notification records (in a real app, you'd integrate with email service)
    let sentCount = 0;
    for (const recipient of recipients) {
      await sql`
        INSERT INTO notifications (rsvp_id, email, subject, message, notification_type, status)
        VALUES (${recipient.id}, ${recipient.email}, ${subject}, ${message}, ${notification_type || 'general'}, 'sent')
      `;
      
      // Mark RSVP as notified
      await sql`
        UPDATE rsvps 
        SET notification_sent = true
        WHERE id = ${recipient.id}
      `;
      
      sentCount++;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Notification sent to ${sentCount} recipients`,
        sentCount,
        recipients: recipients.map(r => ({ id: r.id, name: r.name, email: r.email }))
      }),
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