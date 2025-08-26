const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
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
    
    console.log('DELETE AUTH CHECK:', {
      hasAuthHeader: !!authHeader,
      hasExpectedAuth: !!expectedAuth,
      authHeaderLength: authHeader ? authHeader.length : 0
    });
    
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

    const { type, ids } = data;
    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: type and ids array are required' 
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

    let deletedCount = 0;
    const tableName = getTableName(type);
    
    if (!tableName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid type specified' }),
      };
    }

    console.log('DELETE REQUEST:', {
      type,
      tableName,
      idsToDelete: ids,
      requestId: Date.now()
    });

    // Delete entries using proper SQL template literals
    try {
      if (tableName === 'rsvps') {
        // Delete individual guests first (due to foreign key constraint)
        await sql`DELETE FROM individual_guests WHERE rsvp_id = ANY(${ids})`;
        
        // Then delete RSVPs
        const result = await sql`DELETE FROM rsvps WHERE id = ANY(${ids})`;
        deletedCount = result.count;
      } else if (tableName === 'song_requests') {
        const result = await sql`DELETE FROM song_requests WHERE id = ANY(${ids})`;
        deletedCount = result.count;
      } else if (tableName === 'photo_shares') {
        const result = await sql`DELETE FROM photo_shares WHERE id = ANY(${ids})`;
        deletedCount = result.count;
      } else if (tableName === 'wishes') {
        const result = await sql`DELETE FROM wishes WHERE id = ANY(${ids})`;
        deletedCount = result.count;
      }
      
      console.log('DELETE SUCCESS:', {
        tableName,
        deletedCount,
        requestedCount: ids.length
      });
      
    } catch (deleteError) {
      console.error('DELETE OPERATION ERROR:', {
        tableName,
        error: deleteError.message,
        ids
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to delete entries from database',
          details: process.env.NODE_ENV === 'development' ? deleteError.message : undefined
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully deleted ${deletedCount} ${type} entries`,
        deletedCount
      }),
    };

  } catch (error) {
    console.error('DELETE FUNCTION ERROR:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      code: error.code,
      requestData: { type: data?.type, idsCount: data?.ids?.length },
      timestamp: new Date().toISOString()
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error during delete operation.',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          type: error.constructor.name
        } : undefined
      }),
    };
  }
};

function getTableName(type) {
  const tableMap = {
    'rsvps': 'rsvps',
    'songs': 'song_requests',
    'photos': 'photo_shares',
    'wishes': 'wishes'
  };
  return tableMap[type];
}