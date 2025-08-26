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
    const sql = neon();

    // Get query parameters
    const { limit = '50', offset = '0' } = event.queryStringParameters || {};

    // Get all song requests
    const songs = await sql`
      SELECT 
        id, name, email, song_title, artist_name, genre, reason,
        created_at, updated_at
      FROM song_requests 
      ORDER BY created_at DESC 
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    // Get count
    const countResult = await sql`SELECT COUNT(*) as total FROM song_requests`;

    // Get summary statistics by genre
    const genreStats = await sql`
      SELECT 
        genre,
        COUNT(*) as count
      FROM song_requests 
      WHERE genre IS NOT NULL AND genre != ''
      GROUP BY genre
      ORDER BY count DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: songs,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + songs.length < parseInt(countResult[0].total)
        },
        statistics: {
          total_songs: parseInt(countResult[0].total),
          genre_breakdown: genreStats
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