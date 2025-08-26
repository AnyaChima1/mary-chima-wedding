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

  try {
    // Check environment variables
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    const envCheck = {
      hasDatabaseUrl: !!databaseUrl,
      hasAdminPassword: !!adminPassword,
      databaseUrlLength: databaseUrl ? databaseUrl.length : 0,
      adminPasswordLength: adminPassword ? adminPassword.length : 0,
      nodeEnv: process.env.NODE_ENV || 'not set'
    };

    // Test database connection
    let dbTest = { connected: false, error: null, tableExists: false };
    
    if (databaseUrl) {
      try {
        const sql = neon(databaseUrl);
        
        // Test basic connection
        const testQuery = await sql`SELECT 1 as test`;
        dbTest.connected = testQuery.length > 0;
        
        // Check if rsvps table exists
        const tableCheck = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'rsvps'
          )
        `;
        dbTest.tableExists = tableCheck[0].exists;
        
        // If table exists, count records
        if (dbTest.tableExists) {
          const countResult = await sql`SELECT COUNT(*) as total FROM rsvps`;
          dbTest.recordCount = parseInt(countResult[0].total);
        }
        
      } catch (error) {
        dbTest.error = error.message;
      }
    }

    // Test admin auth
    let authTest = { valid: false, error: null };
    const authHeader = event.headers.authorization;
    
    if (adminPassword && authHeader) {
      const expectedAuth = `Bearer ${adminPassword}`;
      authTest.valid = authHeader === expectedAuth;
      authTest.receivedHeader = authHeader.substring(0, 20) + '...';
      authTest.expectedLength = expectedAuth.length;
    } else {
      authTest.error = !adminPassword ? 'ADMIN_PASSWORD not set' : 'No auth header provided';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        environment: envCheck,
        database: dbTest,
        authentication: authTest,
        requestInfo: {
          method: event.httpMethod,
          hasAuthHeader: !!authHeader,
          queryParams: event.queryStringParameters
        }
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};