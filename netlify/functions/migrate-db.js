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

  const migrationId = `migration_${Date.now()}`;
  console.log(`[${migrationId}] Starting database migration`);

  try {
    // Get database URL
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'No database URL configured',
          migrationId
        })
      };
    }

    console.log(`[${migrationId}] Connecting to database`);
    const sql = neon(databaseUrl);

    // Test connection
    await sql`SELECT 1`;
    console.log(`[${migrationId}] Database connection successful`);

    // Check current table structure
    console.log(`[${migrationId}] Checking current table structure`);
    const currentColumns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'photo_shares'
      ORDER BY ordinal_position
    `;
    
    console.log(`[${migrationId}] Current columns:`, currentColumns);

    // Add missing columns one by one with error handling
    const columnsToAdd = [
      { name: 'file_data', type: 'TEXT' },
      { name: 'filename', type: 'VARCHAR(500)' },
      { name: 'file_type', type: 'VARCHAR(100)' }
    ];

    const results = [];
    
    for (const column of columnsToAdd) {
      try {
        console.log(`[${migrationId}] Adding column ${column.name}`);
        await sql`ALTER TABLE photo_shares ADD COLUMN IF NOT EXISTS ${sql(column.name)} ${sql.unsafe(column.type)}`;
        results.push({ column: column.name, status: 'added', error: null });
        console.log(`[${migrationId}] ✅ Column ${column.name} added successfully`);
      } catch (error) {
        results.push({ column: column.name, status: 'failed', error: error.message });
        console.log(`[${migrationId}] ⚠️ Column ${column.name} failed:`, error.message);
      }
    }

    // Check final table structure
    console.log(`[${migrationId}] Checking final table structure`);
    const finalColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'photo_shares'
      ORDER BY ordinal_position
    `;
    
    console.log(`[${migrationId}] Final table structure:`, finalColumns);

    // Test insert to verify everything works
    const testTime = new Date().toISOString();
    console.log(`[${migrationId}] Testing insert with all columns`);
    
    try {
      const testInsert = await sql`
        INSERT INTO photo_shares (
          name, email, photo_url, description, category,
          file_data, filename, file_type, created_at, updated_at
        ) VALUES (
          ${'Migration Test'},
          ${'migration@test.com'},
          ${'https://example.com/test.jpg'},
          ${'Migration test record'},
          ${'test'},
          ${null},
          ${null},  
          ${null},
          ${testTime},
          ${testTime}
        )
        RETURNING id
      `;
      
      console.log(`[${migrationId}] ✅ Test insert successful, ID:`, testInsert[0].id);
      
      // Clean up test record
      await sql`DELETE FROM photo_shares WHERE id = ${testInsert[0].id}`;
      console.log(`[${migrationId}] Test record cleaned up`);
      
    } catch (insertError) {
      console.log(`[${migrationId}] ❌ Test insert failed:`, insertError.message);
      results.push({ column: 'test_insert', status: 'failed', error: insertError.message });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        migrationId,
        results: {
          columnOperations: results,
          currentColumns: currentColumns,
          finalColumns: finalColumns
        }
      })
    };

  } catch (error) {
    console.error(`[${migrationId}] Migration failed:`, {
      message: error.message,
      stack: error.stack,
      code: error.code
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        migrationId,
        details: {
          message: error.message,
          code: error.code
        }
      })
    };
  }
};