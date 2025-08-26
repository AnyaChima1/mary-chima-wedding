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
      CREATE TABLE IF NOT EXISTS rsvps (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        attendance VARCHAR(10) NOT NULL CHECK (attendance IN ('yes', 'no')),
        guest_count INTEGER DEFAULT 1,
        guest_names TEXT,
        dietary_requirements TEXT,
        phone VARCHAR(20),
        table_number INTEGER,
        notification_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Add phone column if it doesn't exist (for existing tables)
    try {
      await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`;
    } catch (error) {
      // Column might already exist, ignore error
      console.log('Phone column might already exist:', error.message);
    }

    // Create individual guests table
    await sql`
      CREATE TABLE IF NOT EXISTS individual_guests (
        id SERIAL PRIMARY KEY,
        rsvp_id INTEGER REFERENCES rsvps(id) ON DELETE CASCADE,
        guest_name VARCHAR(255) NOT NULL,
        dietary_needs TEXT,
        table_number INTEGER,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
          phone = ${data.phone || ''},
          updated_at = ${currentTime}
        WHERE email = ${email}
        RETURNING id, name, email, attendance
      `;

      const rsvpId = result[0].id;

      // Delete existing individual guest records
      await sql`DELETE FROM individual_guests WHERE rsvp_id = ${rsvpId}`;

      // Create individual guest records
      await createIndividualGuests(sql, rsvpId, name, data.guest_names, data.dietary);

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
          phone,
          created_at,
          updated_at
        ) VALUES (
          ${name},
          ${email},
          ${attendance},
          ${data.guest_count || 1},
          ${data.guest_names || ''},
          ${data.dietary || ''},
          ${data.phone || ''},
          ${currentTime},
          ${currentTime}
        )
        RETURNING id, name, email, attendance
      `;

      const rsvpId = result[0].id;

      // Create individual guest records
      await createIndividualGuests(sql, rsvpId, name, data.guest_names, data.dietary);

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

// Helper function to create individual guest records
async function createIndividualGuests(sql, rsvpId, primaryName, guestNames, dietary) {
  // Add primary guest
  await sql`
    INSERT INTO individual_guests (rsvp_id, guest_name, dietary_needs, is_primary)
    VALUES (${rsvpId}, ${primaryName}, ${dietary || ''}, true)
  `;

  // Add additional guests if any
  if (guestNames && guestNames.trim()) {
    const guests = guestNames.split(',').map(name => name.trim()).filter(name => name);
    
    for (const guestName of guests) {
      await sql`
        INSERT INTO individual_guests (rsvp_id, guest_name, dietary_needs, is_primary)
        VALUES (${rsvpId}, ${guestName}, '', false)
      `;
    }
  }
}