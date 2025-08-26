const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

    // Validate required fields for file upload
    const { name, email, file_data, filename, file_type } = data;
    if (!name || !email || !file_data || !filename || !file_type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, file_data, filename, and file_type are required' 
        }),
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' }),
      };
    }

    // Validate file type
    if (!file_type.startsWith('image/') && !file_type.startsWith('video/')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only image and video files are allowed' }),
      };
    }

    // Extract base64 data (remove data:image/jpeg;base64, prefix)
    const base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
    
    // Convert base64 to buffer to check file size (rough estimate)
    const fileSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    
    if (fileSizeBytes > maxSizeBytes) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'File size exceeds 10MB limit' }),
      };
    }

    // For this implementation, we'll store the base64 data directly in the database
    // In a production environment, you'd upload to a storage service like Cloudinary, AWS S3, etc.
    // and store the resulting URL in the database
    
    // Initialize Neon connection
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('Database URL not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured' }),
      };
    }
    
    console.log('Initializing Neon connection...');
    const sql = neon(databaseUrl);
    
    // Test database connection
    try {
      await sql`SELECT 1 as test`;
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection failed' }),
      };
    }

    // Create table if it doesn't exist (with support for base64 data)
    await sql`
      CREATE TABLE IF NOT EXISTS photo_shares (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        photo_url TEXT NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'other',
        file_data TEXT,
        filename VARCHAR(500),
        file_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const currentTime = new Date().toISOString();

    // For direct storage, we'll use a data URL as the photo_url
    const dataUrl = `data:${file_type};base64,${base64Data}`;

    // Insert new photo share with file data
    const result = await sql`
      INSERT INTO photo_shares (
        name, 
        email, 
        photo_url, 
        description, 
        category,
        file_data,
        filename,
        file_type,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${email},
        ${dataUrl},
        ${data.description || ''},
        ${data.category || 'other'},
        ${base64Data},
        ${filename},
        ${file_type},
        ${currentTime},
        ${currentTime}
      )
      RETURNING id, name, filename, category
    `;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Photo uploaded successfully!',
        data: result[0]
      }),
    };

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request data size:', event.body?.length || 0, 'bytes');

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