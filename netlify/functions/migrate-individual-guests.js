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

    console.log('Starting individual guests migration...');

    // Create individual guests table if it doesn't exist
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

    // Get all RSVPs
    const rsvps = await sql`
      SELECT id, name, guest_names, dietary_requirements
      FROM rsvps
      WHERE attendance = 'yes'
      ORDER BY id
    `;

    console.log(`Found ${rsvps.length} RSVPs to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const rsvp of rsvps) {
      // Check if individual guests already exist for this RSVP
      const existingGuests = await sql`
        SELECT COUNT(*) as count 
        FROM individual_guests 
        WHERE rsvp_id = ${rsvp.id}
      `;

      if (existingGuests[0].count > 0) {
        console.log(`Skipping RSVP ${rsvp.id} - individual guests already exist`);
        skippedCount++;
        continue;
      }

      // Create individual guest records
      await createIndividualGuests(sql, rsvp.id, rsvp.name, rsvp.guest_names, rsvp.dietary_requirements);
      migratedCount++;
      console.log(`Migrated RSVP ${rsvp.id}: ${rsvp.name}`);
    }

    // Get final statistics
    const finalStats = await sql`
      SELECT 
        COUNT(*) as total_individuals,
        COUNT(*) FILTER (WHERE is_primary = true) as primary_guests,
        COUNT(*) FILTER (WHERE is_primary = false) as additional_guests
      FROM individual_guests
    `;

    console.log('Migration completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Individual guests migration completed successfully',
        statistics: {
          rsvps_processed: rsvps.length,
          rsvps_migrated: migratedCount,
          rsvps_skipped: skippedCount,
          total_individual_guests: parseInt(finalStats[0].total_individuals),
          primary_guests: parseInt(finalStats[0].primary_guests),
          additional_guests: parseInt(finalStats[0].additional_guests)
        }
      }),
    };

  } catch (error) {
    console.error('Migration error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};

// Helper function to create individual guest records (same as in submit-rsvp.js)
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