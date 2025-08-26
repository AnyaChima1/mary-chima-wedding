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
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured' }),
      };
    }
    
    const sql = neon(databaseUrl);

    // Get all attending guests with their table assignments
    const tableData = await sql`
      SELECT 
        r.id as rsvp_id,
        r.name as primary_guest,
        r.email,
        r.table_number as rsvp_table,
        g.id as guest_id,
        g.guest_name,
        g.dietary_needs,
        g.table_number as guest_table,
        g.is_primary,
        COALESCE(g.table_number, r.table_number) as assigned_table
      FROM rsvps r
      LEFT JOIN individual_guests g ON r.id = g.rsvp_id
      WHERE r.attendance = 'yes'
      ORDER BY assigned_table NULLS LAST, r.name, g.is_primary DESC
    `;

    // Group by table number
    const tableGroups = {};
    const unassigned = [];

    tableData.forEach(guest => {
      const tableNum = guest.assigned_table;
      
      if (tableNum) {
        if (!tableGroups[tableNum]) {
          tableGroups[tableNum] = {
            table_number: tableNum,
            guests: [],
            total_guests: 0,
            dietary_requirements: []
          };
        }
        
        tableGroups[tableNum].guests.push({
          guest_id: guest.guest_id,
          rsvp_id: guest.rsvp_id,
          name: guest.guest_name,
          email: guest.is_primary ? guest.email : null,
          dietary_needs: guest.dietary_needs,
          is_primary: guest.is_primary
        });
        
        tableGroups[tableNum].total_guests++;
        
        if (guest.dietary_needs) {
          tableGroups[tableNum].dietary_requirements.push(guest.dietary_needs);
        }
      } else {
        unassigned.push({
          guest_id: guest.guest_id,
          rsvp_id: guest.rsvp_id,
          name: guest.guest_name,
          email: guest.is_primary ? guest.email : null,
          dietary_needs: guest.dietary_needs,
          is_primary: guest.is_primary
        });
      }
    });

    // Get statistics
    const totalTables = Object.keys(tableGroups).length;
    const totalAssigned = Object.values(tableGroups).reduce((sum, table) => sum + table.total_guests, 0);
    const totalUnassigned = unassigned.length;

    // Calculate table utilization (assuming 8-10 guests per table)
    const tableUtilization = Object.entries(tableGroups).map(([tableNum, table]) => ({
      table_number: parseInt(tableNum),
      current_guests: table.total_guests,
      recommended_capacity: 8,
      utilization_percentage: Math.round((table.total_guests / 8) * 100)
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          tables: Object.values(tableGroups),
          unassigned_guests: unassigned,
          statistics: {
            total_tables: totalTables,
            total_assigned: totalAssigned,
            total_unassigned: totalUnassigned,
            table_utilization: tableUtilization
          }
        }
      }),
    };

  } catch (error) {
    console.error('Table management error:', error);
    
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