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
    // Enhanced authentication check with debugging
    const authHeader = event.headers.authorization;
    const expectedAuth = process.env.ADMIN_PASSWORD; // Set this in Netlify env vars
    
    console.log('GET-RSVPS AUTH CHECK:', {
      hasAuthHeader: !!authHeader,
      hasExpectedAuth: !!expectedAuth,
      authHeaderLength: authHeader ? authHeader.length : 0,
      expectedAuthLength: expectedAuth ? expectedAuth.length : 0
    });
    
    if (expectedAuth && (!authHeader || authHeader !== `Bearer ${expectedAuth}`)) {
      console.log('AUTH FAILURE:', {
        expectedPrefix: 'Bearer ',
        receivedAuth: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
        expectedAuth: expectedAuth ? 'Bearer ' + expectedAuth.substring(0, 10) + '...' : 'none'
      });
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          debug: process.env.NODE_ENV === 'development' ? {
            hasAuthHeader: !!authHeader,
            hasExpectedAuth: !!expectedAuth
          } : undefined
        }),
      };
    }

    // Initialize Neon connection with debugging
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    console.log('DATABASE CONNECTION:', {
      hasNetlifyUrl: !!process.env.NETLIFY_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      finalUrlLength: databaseUrl ? databaseUrl.length : 0
    });
    
    if (!databaseUrl) {
      console.error('NO DATABASE URL FOUND');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured' }),
      };
    }
    
    const sql = neon(databaseUrl);

    // Get query parameters for filtering
    const { attendance, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query;
    let countQuery;

    if (attendance && (attendance === 'yes' || attendance === 'no')) {
      // Filter by attendance
      query = sql`
        SELECT 
          id, name, email, attendance, guest_count, 
          guest_names, dietary_requirements, phone, table_number,
          created_at, updated_at
        FROM rsvps 
        WHERE attendance = ${attendance}
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM rsvps WHERE attendance = ${attendance}`;
    } else {
      // Get all RSVPs
      query = sql`
        SELECT 
          id, name, email, attendance, guest_count,
          guest_names, dietary_requirements, phone, table_number,
          created_at, updated_at
        FROM rsvps 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM rsvps`;
    }

    console.log('EXECUTING QUERIES:', {
      hasQuery: !!query,
      hasCountQuery: !!countQuery,
      attendance: attendance || 'all'
    });
    
    const [rsvps, countResult] = await Promise.all([query, countQuery]);
    
    console.log('QUERY RESULTS:', {
      rsvpCount: rsvps.length,
      totalCount: countResult[0]?.total
    });

    // Get summary statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_responses,
        COUNT(*) FILTER (WHERE attendance = 'yes') as attending,
        COUNT(*) FILTER (WHERE attendance = 'no') as not_attending,
        SUM(guest_count) FILTER (WHERE attendance = 'yes') as total_guests
      FROM rsvps
    `;
    
    console.log('STATISTICS:', stats[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: rsvps,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + rsvps.length < parseInt(countResult[0].total)
        },
        statistics: stats[0]
      }),
    };

  } catch (error) {
    console.error('GET-RSVPS ERROR:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
    
    // Determine error type for better user feedback
    let errorMessage = 'Internal server error. Please try again later.';
    if (error.message?.includes('relation "rsvps" does not exist')) {
      errorMessage = 'Database table not found. Please run database migration first.';
    } else if (error.message?.includes('connect')) {
      errorMessage = 'Database connection failed. Please check configuration.';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          type: error.constructor.name
        } : undefined
      }),
    };
  }
};