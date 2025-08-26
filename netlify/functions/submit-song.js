const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    // Validate required fields
    const { name, email, song_title, artist_name } = data;
    if (!name || !email || !song_title || !artist_name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, song_title, and artist_name are required' 
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Initialize Neon connection
    const sql = neon();

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS song_requests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        song_title VARCHAR(255) NOT NULL,
        artist_name VARCHAR(255) NOT NULL,
        genre VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const currentTime = new Date().toISOString();

    // Insert new song request
    const result = await sql`
      INSERT INTO song_requests (
        name, 
        email, 
        song_title, 
        artist_name, 
        genre, 
        reason,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${email},
        ${song_title},
        ${artist_name},
        ${data.genre || ''},
        ${data.reason || ''},
        ${currentTime},
        ${currentTime}
      )
      RETURNING id, name, song_title, artist_name
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Song request submitted successfully!',
        data: result[0]
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