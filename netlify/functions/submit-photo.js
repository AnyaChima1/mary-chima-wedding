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
    const { name, email, photo_url } = data;
    if (!name || !email || !photo_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, and photo_url are required' 
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

    // Validate URL format
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(photo_url)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a valid URL starting with http:// or https://' }),
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

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS photo_shares (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        photo_url TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'other',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const currentTime = new Date().toISOString();

    // Insert new photo share
    const result = await sql`
      INSERT INTO photo_shares (
        name, 
        email, 
        photo_url, 
        description, 
        category,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${email},
        ${photo_url},
        ${data.description || ''},
        ${data.category || 'other'},
        ${currentTime},
        ${currentTime}
      )
      RETURNING id, name, photo_url, category
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Photo shared successfully!',
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