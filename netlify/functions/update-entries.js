const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
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

    const { type, updates } = data;
    if (!type || !updates || !Array.isArray(updates)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: type and updates array are required' 
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

    let updatedCount = 0;

    if (type === 'table_assignment') {
      // Update table assignments for RSVPs and individual guests
      for (const update of updates) {
        const { rsvp_id, table_number } = update;
        
        // Update RSVP table
        await sql`
          UPDATE rsvps 
          SET table_number = ${table_number}
          WHERE id = ${rsvp_id}
        `;
        
        // Update individual guests table
        await sql`
          UPDATE individual_guests 
          SET table_number = ${table_number}
          WHERE rsvp_id = ${rsvp_id}
        `;
        
        updatedCount++;
      }
    } else if (type === 'guest_details') {
      // Update individual guest details
      for (const update of updates) {
        const { guest_id, guest_name, dietary_needs, table_number } = update;
        
        await sql`
          UPDATE individual_guests 
          SET 
            guest_name = ${guest_name},
            dietary_needs = ${dietary_needs || ''},
            table_number = ${table_number || null}
          WHERE id = ${guest_id}
        `;
        
        updatedCount++;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully updated ${updatedCount} entries`,
        updatedCount
      }),
    };

  } catch (error) {
    console.error('Update error:', error);
    
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