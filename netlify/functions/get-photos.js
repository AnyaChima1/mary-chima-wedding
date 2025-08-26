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
    // Check if this is an admin request (with auth) or public gallery request
    const authHeader = event.headers.authorization;
    const expectedAuth = process.env.ADMIN_PASSWORD || 'Mary&Chima0003';
    const isAdminRequest = authHeader && authHeader === `Bearer ${expectedAuth}`;
    
    // For public gallery access, allow without authentication
    // For admin features, require authentication
    const { admin_only } = event.queryStringParameters || {};
    
    if (admin_only === 'true' && !isAdminRequest) {
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
    const { category, limit = '50', offset = '0' } = event.queryStringParameters || {};

    let query;
    let countQuery;

    if (category && category !== 'all') {
      // Filter by category
      query = sql`
        SELECT 
          id, name, email, photo_url, description, category,
          created_at, updated_at
        FROM photo_shares 
        WHERE category = ${category}
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM photo_shares WHERE category = ${category}`;
    } else {
      // Get all photos
      query = sql`
        SELECT 
          id, name, email, photo_url, description, category,
          created_at, updated_at
        FROM photo_shares 
        ORDER BY created_at DESC 
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      
      countQuery = sql`SELECT COUNT(*) as total FROM photo_shares`;
    }

    const [photos, countResult] = await Promise.all([query, countQuery]);

    // Get summary statistics by category
    const categoryStats = await sql`
      SELECT 
        category,
        COUNT(*) as count
      FROM photo_shares 
      GROUP BY category
      ORDER BY count DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: photos,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + photos.length < parseInt(countResult[0].total)
        },
        statistics: {
          total_photos: parseInt(countResult[0].total),
          category_breakdown: categoryStats
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