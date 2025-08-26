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
    const { name, email, attendance } = data;
    if (!name || !email || !attendance) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, and attendance are required' 
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
    const sql = neon(); // automatically uses NETLIFY_DATABASE_URL

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        attendance VARCHAR(10) NOT NULL CHECK (attendance IN ('yes', 'no')),
        guest_count INTEGER DEFAULT 1,
        guest_names TEXT,
        dietary_requirements TEXT,
        special_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Check if RSVP already exists
    const existingRsvp = await sql`
      SELECT id, name, attendance FROM rsvps WHERE email = ${email}
    `;

    let result;
    const currentTime = new Date().toISOString();

    if (existingRsvp.length > 0) {
      // Update existing RSVP
      result = await sql`
        UPDATE rsvps 
        SET 
          name = ${name},
          attendance = ${attendance},
          guest_count = ${data.guest_count || 1},
          guest_names = ${data.guest_names || ''},
          dietary_requirements = ${data.dietary || ''},
          updated_at = ${currentTime}
        WHERE email = ${email}
        RETURNING id, name, email, attendance
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'RSVP updated successfully!',
          data: result[0],
          updated: true
        }),
      };
    } else {
      // Insert new RSVP
      result = await sql`
        INSERT INTO rsvps (
          name, 
          email, 
          attendance, 
          guest_count, 
          guest_names, 
          dietary_requirements, 
          created_at,
          updated_at
        ) VALUES (
          ${name},
          ${email},
          ${attendance},
          ${data.guest_count || 1},
          ${data.guest_names || ''},
          ${data.dietary || ''},
          ${currentTime},
          ${currentTime}
        )
        RETURNING id, name, email, attendance
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'RSVP submitted successfully!',
          data: result[0],
          updated: false
        }),
      };
    }

  } catch (error) {
    console.error('Database error:', error);

    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'An RSVP with this email already exists. Please use a different email or update your existing RSVP.',
        }),
      };
    }

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