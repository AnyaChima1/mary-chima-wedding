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

    // Get query parameters
    const { message_type, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query;
    let countQuery;

    if (message_type && message_type !== 'all') {
      // Filter by message type
      query = sql`
        SELECT 
          id, name, email, message, message_type, relationship,
          created_at, updated_at
        FROM wishes 
        WHERE message_type = ${message_type}
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM wishes WHERE message_type = ${message_type}`;
    } else {
      // Get all wishes
      query = sql`
        SELECT 
          id, name, email, message, message_type, relationship,
          created_at, updated_at
        FROM wishes 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM wishes`;
    }

    const [wishes, countResult] = await Promise.all([query, countQuery]);

    // Get summary statistics by message type
    const typeStats = await sql`
      SELECT 
        message_type,
        COUNT(*) as count
      FROM wishes 
      GROUP BY message_type
      ORDER BY count DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: wishes,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + wishes.length < parseInt(countResult[0].total)
        },
        statistics: {
          total_wishes: parseInt(countResult[0].total),
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