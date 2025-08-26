const { neon } = require('@netlify/neon');

// Enhanced logging function
const logDebug = (stage, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SUBMIT-PHOTO DEBUG [${stage}]:`, JSON.stringify(data, null, 2));
};

const logError = (stage, error, context = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] SUBMIT-PHOTO ERROR [${stage}]:`, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp
  });
};

exports.handler = async (event, context) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logDebug('REQUEST_START', {
    requestId,
    method: event.httpMethod,
    headers: event.headers,
    bodyLength: event.body?.length || 0,
    queryParams: event.queryStringParameters
  });
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Request-ID': requestId
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    logDebug('PREFLIGHT_REQUEST', { requestId });
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    logDebug('INVALID_METHOD', { requestId, method: event.httpMethod });
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed', requestId }),
    };
  }

  try {
    // Parse request body
    let data;
    try {
      logDebug('PARSING_BODY', { requestId, bodyLength: event.body?.length });
      data = JSON.parse(event.body);
      logDebug('BODY_PARSED', { requestId, keys: Object.keys(data), photoUrlLength: data.photo_url?.length });
    } catch (error) {
      logError('JSON_PARSE_ERROR', error, { requestId, body: event.body?.substring(0, 200) });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body', requestId }),
      };
    }

    // Validate required fields
    const { name, email, photo_url } = data;
    logDebug('FIELD_VALIDATION', {
      requestId,
      hasName: !!name,
      hasEmail: !!email,
      hasPhotoUrl: !!photo_url,
      nameLength: name?.length,
      emailLength: email?.length,
      photoUrlLength: photo_url?.length
    });
    
    if (!name || !email || !photo_url) {
      logError('MISSING_FIELDS', new Error('Required fields missing'), {
        requestId,
        receivedFields: Object.keys(data),
        missingFields: [!name && 'name', !email && 'email', !photo_url && 'photo_url'].filter(Boolean)
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, and photo_url are required',
          requestId,
          receivedFields: Object.keys(data)
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

    // Enhanced URL validation for various photo sharing platforms
    const urlRegex = /^https?:\/\/.+/;
    if (!urlRegex.test(photo_url)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Please provide a valid URL starting with http:// or https://' }),
      };
    }

    // Additional validation for common photo sharing platforms
    const trimmedUrl = photo_url.trim();
    
    // Google Photos URL patterns
    const isGooglePhotos = trimmedUrl.includes('photos.google.com') || 
                          trimmedUrl.includes('photos.app.goo.gl') ||
                          trimmedUrl.includes('drive.google.com');
    
    // iCloud Photos URL patterns  
    const isICloudPhotos = trimmedUrl.includes('icloud.com/photos') ||
                          trimmedUrl.includes('share.icloud.com');
    
    // Dropbox URL patterns
    const isDropbox = trimmedUrl.includes('dropbox.com') ||
                     trimmedUrl.includes('db.tt');
    
    // OneDrive URL patterns
    const isOneDrive = trimmedUrl.includes('1drv.ms') ||
                      trimmedUrl.includes('onedrive.live.com');
    
    // Allow common image hosting and direct image URLs
    const isDirectImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmedUrl);
    const isImageHost = trimmedUrl.includes('imgur.com') ||
                       trimmedUrl.includes('cloudinary.com') ||
                       trimmedUrl.includes('imagekit.io') ||
                       trimmedUrl.includes('unsplash.com');
    
    // Basic domain validation - ensure it has a valid domain structure
    const domainRegex = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)*/;
    if (!domainRegex.test(trimmedUrl)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Please provide a valid photo sharing URL from Google Photos, iCloud, Dropbox, or direct image link'
        }),
      };
    }

    // Initialize Neon connection
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    logDebug('DATABASE_CONFIG', {
      requestId,
      hasNetlifyUrl: !!process.env.NETLIFY_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      urlLength: databaseUrl?.length
    });
    
    if (!databaseUrl) {
      logError('NO_DATABASE_URL', new Error('Database URL not found'), {
        requestId,
        envKeys: Object.keys(process.env).filter(key => key.includes('DATABASE'))
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured', requestId }),
      };
    }
    
    let sql;
    try {
      logDebug('INITIALIZING_NEON', { requestId });
      sql = neon(databaseUrl);
      logDebug('NEON_INITIALIZED', { requestId });
    } catch (error) {
      logError('NEON_INIT_ERROR', error, { requestId });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database initialization failed', 
          requestId,
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }),
      };
    }

    // Create table if it doesn't exist and add missing columns
    try {
      logDebug('CREATING_TABLE', { requestId });
      
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
        logDebug('COLUMNS_ADDED', { requestId });
      } catch (alterError) {
        logDebug('COLUMNS_EXIST', { requestId, error: alterError.message });
      }
      
      logDebug('TABLE_READY', { requestId });
    } catch (error) {
      logError('TABLE_CREATION_ERROR', error, { requestId });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database table setup failed', requestId }),
      };
    }

    const currentTime = new Date().toISOString();
    logDebug('INSERTING_DATA', {
      requestId,
      name,
      email,
      photoUrlLength: photo_url.length,
      description: data.description?.substring(0, 50) + '...' || 'none',
      category: data.category || 'other'
    });

    // Insert new photo share (simplified)
    let result;
    try {
      result = await sql`
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
          ${photo_url},
          ${data.description || ''},
          ${data.category || 'other'},
          ${null},
          ${null},
          ${null},
          ${currentTime},
          ${currentTime}
        )
        RETURNING id, name, photo_url, category
      `;
      logDebug('INSERT_SUCCESS', { requestId, insertedId: result[0]?.id });
    } catch (error) {
      logError('INSERT_ERROR', error, {
        requestId,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
        errorHint: error.hint
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database insert failed', 
          requestId,
          details: process.env.NODE_ENV === 'development' ? {
            message: error.message,
            code: error.code,
            detail: error.detail
          } : undefined
        }),
      };
    }

    logDebug('SUCCESS', { requestId, result: result[0] });
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Photo shared successfully!',
        data: result[0],
        requestId
      }),
    };

  } catch (error) {
    logError('UNHANDLED_ERROR', error, {
      requestId,
      stage: 'general_catch',
      url: event.headers?.['x-forwarded-for'] || 'unknown'
    });

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error. Please try again later.',
        requestId,
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : undefined
      }),
    };
  }
};