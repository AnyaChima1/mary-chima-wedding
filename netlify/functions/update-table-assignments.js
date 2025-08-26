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

    // Validate required fields
    const { assignments } = data;
    if (!assignments || !Array.isArray(assignments)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing or invalid assignments array. Expected format: [{ guest_id: number, table_number: number }]' 
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

    console.log(`Processing ${assignments.length} table assignments...`);

    let updatedCount = 0;
    let errors = [];

    for (const assignment of assignments) {
      const { guest_id, table_number } = assignment;
      
      if (!guest_id || typeof guest_id !== 'number') {
        errors.push(`Invalid guest_id: ${guest_id}`);
        continue;
      }

      try {
        // Update individual guest table assignment
        const result = await sql`
          UPDATE individual_guests 
          SET table_number = ${table_number || null}
          WHERE id = ${guest_id}
        `;

        if (result.length > 0) {
          updatedCount++;
          console.log(`Updated guest ${guest_id} to table ${table_number || 'unassigned'}`);
        } else {
          errors.push(`Guest ${guest_id} not found`);
        }
      } catch (error) {
        console.error(`Error updating guest ${guest_id}:`, error);
        errors.push(`Failed to update guest ${guest_id}: ${error.message}`);
      }
    }

    // Also update the main RSVP table for primary guests
    try {
      for (const assignment of assignments) {
        const { guest_id, table_number } = assignment;
        
        // Check if this is a primary guest and update the RSVP table as well
        const primaryCheck = await sql`
          SELECT rsvp_id FROM individual_guests 
          WHERE id = ${guest_id} AND is_primary = true
        `;
        
        if (primaryCheck.length > 0) {
          await sql`
            UPDATE rsvps 
            SET table_number = ${table_number || null}
            WHERE id = ${primaryCheck[0].rsvp_id}
          `;
          console.log(`Updated RSVP ${primaryCheck[0].rsvp_id} table assignment`);
        }
      }
    } catch (error) {
      console.error('Error updating RSVP table assignments:', error);
      // Don't fail the entire operation for this
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully updated ${updatedCount} guest table assignments`,
        updated_count: updatedCount,
        total_requested: assignments.length,
        errors: errors.length > 0 ? errors : undefined
      }),
    };

  } catch (error) {
    console.error('Table assignment error:', error);
    
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