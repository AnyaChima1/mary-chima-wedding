const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
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
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        notification_type VARCHAR(50) DEFAULT 'general',
        recipient_count INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'sent',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Get query parameters
    const { limit = '50', offset = '0' } = event.queryStringParameters || {};

    // Get all notifications
    const notifications = await sql`
      SELECT 
        id, subject, message, notification_type, recipient_count,
        sent_count, failed_count, status, created_at
      FROM notifications 
      ORDER BY created_at DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    // Get count
    const countResult = await sql`SELECT COUNT(*) as total FROM notifications`;

    // Get summary statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_notifications,
        SUM(recipient_count) as total_recipients,
        SUM(sent_count) as total_sent,
        SUM(failed_count) as total_failed
      FROM notifications
    `;

    // Get notification type breakdown
    const typeStats = await sql`
      SELECT 
        notification_type,
        COUNT(*) as count
      FROM notifications 
      GROUP BY notification_type
      ORDER BY count DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: notifications,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + notifications.length < parseInt(countResult[0].total)
        },
        statistics: {
          total_notifications: parseInt(stats[0].total_notifications || 0),
          total_recipients: parseInt(stats[0].total_recipients || 0),
          total_sent: parseInt(stats[0].total_sent || 0),
          total_failed: parseInt(stats[0].total_failed || 0),
          type_breakdown: typeStats
        }
      }),
    };

  } catch (error) {
    console.error('Database error:', error);
    
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