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

    // Get query parameters for filtering
    const { filter_type, table_number, limit = '100', offset = '0' } = event.queryStringParameters || {};

    let query;
    let countQuery;

    if (filter_type === 'primary') {
      // Filter primary guests only
      query = sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        WHERE ig.is_primary = true
        ORDER BY ig.guest_name ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      countQuery = sql`SELECT COUNT(*) as total FROM individual_guests WHERE is_primary = true`;
    } else if (filter_type === 'additional') {
      // Filter additional guests only
      query = sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        WHERE ig.is_primary = false
        ORDER BY ig.guest_name ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      countQuery = sql`SELECT COUNT(*) as total FROM individual_guests WHERE is_primary = false`;
    } else if (filter_type === 'dietary') {
      // Filter guests with dietary requirements
      query = sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        WHERE ig.dietary_needs IS NOT NULL AND ig.dietary_needs != ''
        ORDER BY ig.guest_name ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      countQuery = sql`SELECT COUNT(*) as total FROM individual_guests WHERE dietary_needs IS NOT NULL AND dietary_needs != ''`;
    } else if (table_number) {
      // Filter by table number
      query = sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        WHERE ig.table_number = ${parseInt(table_number)}
        ORDER BY ig.guest_name ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      countQuery = sql`SELECT COUNT(*) as total FROM individual_guests WHERE table_number = ${parseInt(table_number)}`;
    } else {
      // Get all individual guests
      query = sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        ORDER BY ig.guest_name ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;
      countQuery = sql`SELECT COUNT(*) as total FROM individual_guests`;
    }

    const [guests, countResult] = await Promise.all([query, countQuery]);

    // Get summary statistics
    const stats = await sql`
      SELECT 
        COUNT(*) as total_individuals,
        COUNT(*) FILTER (WHERE is_primary = true) as primary_guests,
        COUNT(*) FILTER (WHERE is_primary = false) as additional_guests,
        COUNT(*) FILTER (WHERE dietary_needs IS NOT NULL AND dietary_needs != '') as dietary_requirements,
        COUNT(*) FILTER (WHERE table_number IS NOT NULL) as assigned_guests,
        COUNT(*) FILTER (WHERE table_number IS NULL) as unassigned_guests
      FROM individual_guests
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: guests,
        pagination: {
          total: parseInt(countResult[0].total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + guests.length < parseInt(countResult[0].total)
        },
        statistics: stats[0]
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