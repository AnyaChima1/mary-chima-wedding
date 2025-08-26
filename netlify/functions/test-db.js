const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const testId = `test_${Date.now()}`;
  console.log(`[${testId}] Starting database test`);

  try {
    // Check environment variables
    const netlifyUrl = process.env.NETLIFY_DATABASE_URL;
    const databaseUrl = process.env.DATABASE_URL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    console.log(`[${testId}] Environment check:`, {
      hasNetlifyUrl: !!netlifyUrl,
      hasDatabaseUrl: !!databaseUrl,
      hasAdminPassword: !!adminPassword,
      netlifyUrlLength: netlifyUrl?.length || 0,
      databaseUrlLength: databaseUrl?.length || 0,
      netlifyUrlStart: netlifyUrl?.substring(0, 30) + '...' || 'N/A',
      databaseUrlStart: databaseUrl?.substring(0, 30) + '...' || 'N/A'
    });

    const connectionUrl = netlifyUrl || databaseUrl;
    if (!connectionUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No database URL configured',
          testId,
          envVars: Object.keys(process.env).filter(key => key.includes('DATABASE'))
        })
      };
    }

    // Initialize Neon
    console.log(`[${testId}] Initializing Neon connection`);
    const sql = neon(connectionUrl);

    // Test basic connection
    console.log(`[${testId}] Testing basic connection`);
    const connectionTest = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log(`[${testId}] Connection successful:`, connectionTest[0]);

    // Check if photo_shares table exists and create/update it
    console.log(`[${testId}] Checking and updating photo_shares table`);
    
    // Create base table
    await sql`
      CREATE TABLE IF NOT EXISTS photo_shares (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        photo_url TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'other',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    // Add missing columns if they don't exist
    try {
      await sql`ALTER TABLE photo_shares ADD COLUMN IF NOT EXISTS file_data TEXT`;
      await sql`ALTER TABLE photo_shares ADD COLUMN IF NOT EXISTS filename VARCHAR(500)`;
      await sql`ALTER TABLE photo_shares ADD COLUMN IF NOT EXISTS file_type VARCHAR(100)`;
      console.log(`[${testId}] Missing columns added successfully`);
    } catch (alterError) {
      console.log(`[${testId}] Columns already exist or alter failed:`, alterError.message);
    }
    
    // Check final table structure
    const tableCheck = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'photo_shares'
      ORDER BY ordinal_position
    `;
    console.log(`[${testId}] Updated table structure:`, tableCheck);

    // Try to insert a test URL record (like submit-photo)
    console.log(`[${testId}] Testing URL insert`);
    const urlInsert = await sql`
      INSERT INTO photo_shares (
        name, email, photo_url, description, category,
        file_data, filename, file_type, created_at, updated_at
      ) VALUES (
        ${'Test User URL'},
        ${'test-url@example.com'},
        ${'https://example.com/test.jpg'},
        ${'Test URL description'},
        ${'test'},
        ${null},
        ${null},
        ${null},
        ${new Date().toISOString()},
        ${new Date().toISOString()}
      )
      RETURNING id, name, photo_url
    `;
    console.log(`[${testId}] URL insert successful:`, urlInsert[0]);

    // Try to insert a test file record (like upload-photo)
    console.log(`[${testId}] Testing file insert`);
    const fileInsert = await sql`
      INSERT INTO photo_shares (
        name, email, photo_url, description, category,
        file_data, filename, file_type, created_at, updated_at
      ) VALUES (
        ${'Test User File'},
        ${'test-file@example.com'},
        ${'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...'},
        ${'Test file description'},
        ${'test'},
        ${'/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDX4AAAA'},
        ${'test_image.jpg'},
        ${'image/jpeg'},
        ${new Date().toISOString()},
        ${new Date().toISOString()}
      )
      RETURNING id, name, filename
    `;
    console.log(`[${testId}] File insert successful:`, fileInsert[0]);

    // Count total records
    const countResult = await sql`SELECT COUNT(*) as total FROM photo_shares`;
    console.log(`[${testId}] Total records:`, countResult[0]);

    // Clean up test records
    await sql`DELETE FROM photo_shares WHERE email IN ('test-url@example.com', 'test-file@example.com')`;
    console.log(`[${testId}] Test records cleaned up`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        testId,
        results: {
          connection: connectionTest[0],
          tableStructure: tableCheck,
          urlInsert: urlInsert[0],
          fileInsert: fileInsert[0],
          totalRecords: countResult[0]
        }
      })
    };

  } catch (error) {
    console.error(`[${testId}] Database test failed:`, {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database test failed',
        testId,
        details: {
          message: error.message,
          code: error.code,
          detail: error.detail,
          hint: error.hint
        }
      })
    };
  }
};