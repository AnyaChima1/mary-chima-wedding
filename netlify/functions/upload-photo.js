const { neon } = require('@netlify/neon');

// Enhanced logging function
const logDebug = (stage, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] UPLOAD-PHOTO DEBUG [${stage}]:`, JSON.stringify(data, null, 2));
};

const logError = (stage, error, context = {}) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] UPLOAD-PHOTO ERROR [${stage}]:`, {
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
  const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logDebug('REQUEST_START', {
    requestId,
    method: event.httpMethod,
    bodyLength: event.body?.length || 0,
    headers: {
      'content-type': event.headers?.['content-type'],
      'user-agent': event.headers?.['user-agent']?.substring(0, 50) + '...' || 'unknown'
    }
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
    // Parse request body with size checking
    let data;
    try {
      logDebug('PARSING_BODY', { requestId, bodyLength: event.body?.length });
      
      // Check request size before parsing (roughly 6MB limit for base64)
      const maxRequestSize = 6 * 1024 * 1024; // 6MB
      if (event.body && event.body.length > maxRequestSize) {
        logError('REQUEST_TOO_LARGE', new Error('Request body too large'), {
          requestId,
          actualSize: event.body.length,
          maxSize: maxRequestSize
        });
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({ 
            error: 'File too large. Please use files smaller than 5MB or try the URL sharing method.',
            requestId
          }),
        };
      }
      
      data = JSON.parse(event.body);
      logDebug('BODY_PARSED', { requestId, keys: Object.keys(data) });
    } catch (error) {
      logError('JSON_PARSE_ERROR', error, { requestId, body: event.body?.substring(0, 200) });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body', requestId }),
      };
    }

    // Validate required fields for file upload
    const { name, email, file_data, filename, file_type } = data;
    if (!name || !email || !file_data || !filename || !file_type) {
      console.error('Missing required fields:', {
        hasName: !!name,
        hasEmail: !!email, 
        hasFileData: !!file_data,
        hasFilename: !!filename,
        hasFileType: !!file_type,
        receivedKeys: Object.keys(data)
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: name, email, file_data, filename, and file_type are required',
          details: process.env.NODE_ENV === 'development' ? `Received keys: ${Object.keys(data).join(', ')}` : undefined
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
    let base64Data;
    try {
      if (file_data.startsWith('data:')) {
        base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
      } else {
        base64Data = file_data;
      }
      
      // Validate base64 format
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Invalid file data: base64 content is empty');
      }
      
      // Basic base64 validation
      const base64Regex = /^[A-Za-z0-9+/]*(=|==)?$/;
      if (!base64Regex.test(base64Data.replace(/\s/g, ''))) {
        throw new Error('Invalid file data: not valid base64 format');
      }
    } catch (error) {
      console.error('Base64 processing error:', {
        error: error.message,
        fileDataLength: file_data?.length || 0,
        fileDataStart: file_data?.substring(0, 100) || 'N/A'
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid file format. Please try uploading the file again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }),
      };
    }
    
    // Convert base64 to buffer to check file size (more accurate calculation)
    let fileSizeBytes;
    try {
      // Remove any whitespace from base64 string
      const cleanBase64 = base64Data.replace(/\s/g, '');
      
      // Calculate file size accounting for padding
      const padding = cleanBase64.endsWith('==') ? 2 : (cleanBase64.endsWith('=') ? 1 : 0);
      fileSizeBytes = (cleanBase64.length * 3) / 4 - padding;
      
      console.log('File size calculation:', {
        base64Length: cleanBase64.length,
        padding: padding,
        calculatedSizeBytes: fileSizeBytes,
        calculatedSizeMB: (fileSizeBytes / (1024 * 1024)).toFixed(2)
      });
    } catch (error) {
      console.error('File size calculation error:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Unable to process file. Please try again.' }),
      };
    }
    
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    
    if (fileSizeBytes > maxSizeBytes) {
      console.log('File size exceeded limit:', {
        fileSizeBytes,
        maxSizeBytes,
        fileSizeMB: (fileSizeBytes / (1024 * 1024)).toFixed(2)
      });
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ 
          error: `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit. Please compress your image or use a smaller file.`,
          details: process.env.NODE_ENV === 'development' ? `Actual size: ${fileSizeBytes} bytes` : undefined
        }),
      };
    }

    // For this implementation, we'll store the base64 data directly in the database
    // In a production environment, you'd upload to a storage service like Cloudinary, AWS S3, etc.
    // and store the resulting URL in the database
    
    // Initialize Neon connection (simplified)
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    logDebug('DATABASE_CONFIG', {
      requestId,
      hasNetlifyUrl: !!process.env.NETLIFY_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      urlLength: databaseUrl?.length
    });
    
    if (!databaseUrl) {
      logError('NO_DATABASE_URL', new Error('Database URL not found'), { requestId });
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
    } catch (dbError) {
      logError('DATABASE_CONNECTION_ERROR', dbError, { requestId });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection failed', requestId }),
      };
    }

    // Create table if it doesn't exist (simplified)
    try {
      logDebug('CREATING_TABLE', { requestId });
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
    
    // Create data URL for photo_url field (simplified approach)
    const dataUrl = `data:${file_type};base64,${base64Data}`;
    
    logDebug('INSERTING_DATA', { requestId, dataSize: base64Data.length });

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
      
      logDebug('INSERT_SUCCESS', { requestId, insertedId: result[0]?.id });
    } catch (error) {
      logError('INSERT_ERROR', error, {
        requestId, 
        errorMessage: error.message,
        errorCode: error.code,
        errorDetail: error.detail,
        dataSize: base64Data?.length
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to save photo. Please try a smaller file or use URL sharing.', 
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
        message: 'Photo uploaded successfully!',
        data: result[0],
        requestId
      }),
    };

  } catch (error) {
    logError('UPLOAD_ERROR', error, {
      requestId,
      requestSize: event.body?.length || 0,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      stage: 'main_processing'
    });

    // Provide specific error messages based on error type
    let userMessage = 'Upload failed. Please try again or use URL sharing.';
    let statusCode = 500;
    
    if (error.message.includes('Invalid JSON')) {
      userMessage = 'Invalid data format. Please try again.';
      statusCode = 400;
    } else if (error.message.includes('connection') || error.message.includes('database')) {
      userMessage = 'Database connection issue. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message.includes('timeout')) {
      userMessage = 'Upload timed out. Please try with a smaller file.';
      statusCode = 408;
    } else if (error.message.includes('file size') || error.message.includes('size exceeds')) {
      userMessage = 'File size exceeds limits. Please use a smaller file.';
      statusCode = 413;
    } else if (error.message.includes('memory') || error.message.includes('heap')) {
      userMessage = 'File too large for processing. Please use URL sharing instead.';
      statusCode = 413;
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: userMessage,
        requestId,
        details: process.env.NODE_ENV === 'development' ? {
          originalError: error.message,
          requestSize: event.body?.length || 0
        } : undefined
      }),
    };
  }
};