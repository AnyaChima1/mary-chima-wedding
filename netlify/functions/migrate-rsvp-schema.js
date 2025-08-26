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
    // Authentication check - allow access if ADMIN_PASSWORD not set (for debugging)
    const authHeader = event.headers.authorization;
    const expectedAuth = process.env.ADMIN_PASSWORD;
    
    if (expectedAuth && (!authHeader || authHeader !== `Bearer ${expectedAuth}`)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          hint: !expectedAuth ? 'ADMIN_PASSWORD environment variable not set' : 'Invalid authorization'
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
    
    const migrations = [];
    
    try {
      // Migration 1: Add phone column if it doesn't exist
      await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`;
      migrations.push({ 
        id: 1, 
        description: 'Add phone column to rsvps table',
        status: 'success'
      });
    } catch (error) {
      migrations.push({ 
        id: 1, 
        description: 'Add phone column to rsvps table',
        status: 'error',
        error: error.message
      });
    }
    
    try {
      // Migration 1.5: Add table_number column if it doesn't exist
      await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS table_number INTEGER`;
      migrations.push({ 
        id: 1.5, 
        description: 'Add table_number column to rsvps table',
        status: 'success'
      });
    } catch (error) {
      migrations.push({ 
        id: 1.5, 
        description: 'Add table_number column to rsvps table',
        status: 'error',
        error: error.message
      });
    }
    
    try {
      // Migration 1.6: Add notification_sent column if it doesn't exist
      await sql`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT FALSE`;
      migrations.push({ 
        id: 1.6, 
        description: 'Add notification_sent column to rsvps table',
        status: 'success'
      });
    } catch (error) {
      migrations.push({ 
        id: 1.6, 
        description: 'Add notification_sent column to rsvps table',
        status: 'error',
        error: error.message
      });
    }
    
    try {
      // Migration 2: Ensure rsvps table exists with correct schema
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
      migrations.push({ 
        id: 2, 
        description: 'Ensure rsvps table exists with correct schema',
        status: 'success'
      });
    } catch (error) {
      migrations.push({ 
        id: 2, 
        description: 'Ensure rsvps table exists with correct schema',
        status: 'error',
        error: error.message
      });
    }
    
    try {
      // Migration 3: Ensure individual_guests table exists
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
      migrations.push({ 
        id: 3, 
        description: 'Ensure individual_guests table exists',
        status: 'success'
      });
    } catch (error) {
      migrations.push({ 
        id: 3, 
        description: 'Ensure individual_guests table exists',
        status: 'error',
        error: error.message
      });
    }
    
    // Test the final schema by running a simple query
    let testResult = { success: false, error: null };
    try {
      const testQuery = await sql`
        SELECT id, name, email, attendance, guest_count, 
               guest_names, dietary_requirements, phone, table_number,
               created_at, updated_at
        FROM rsvps LIMIT 1
      `;
      testResult.success = true;
      testResult.message = 'Schema test passed';
    } catch (error) {
      testResult.error = error.message;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database migration completed',
        migrations,
        schemaTest: testResult,
        timestamp: new Date().toISOString()
      }),
    };

  } catch (error) {
    console.error('Migration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
      }),
    };
  }
};