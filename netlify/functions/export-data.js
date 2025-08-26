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
    // Basic authentication check - accept from header or query param for downloads
    const authHeader = event.headers.authorization;
    const { authorization } = event.queryStringParameters || {};
    const expectedAuth = process.env.ADMIN_PASSWORD || 'Mary&Chima0003';
    
    const providedAuth = authHeader || authorization;
    if (expectedAuth && (!providedAuth || providedAuth !== `Bearer ${expectedAuth}`)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    // Initialize Neon connection
    const sql = neon();

    // Get query parameters
    const { type = 'all' } = event.queryStringParameters || {};

    let csvData = '';
    
    if (type === 'all' || type === 'rsvps') {
      // Get RSVPs with individual guest breakdown
      const rsvps = await sql`
        SELECT 
          r.id, r.name, r.email, r.attendance, r.guest_count, 
          r.guest_names, r.dietary_requirements, r.table_number,
          r.created_at, r.updated_at,
          g.guest_name, g.dietary_needs as guest_dietary
        FROM rsvps r
        LEFT JOIN individual_guests g ON r.id = g.rsvp_id
        ORDER BY r.created_at DESC, g.guest_name
      `;
      
      csvData += 'RSVP Data\n';
      csvData += 'ID,Primary Guest,Email,Attendance,Total Guest Count,Guest Names,Dietary Requirements,Table Number,Individual Guest Name,Guest Dietary,Created Date\n';
      
      rsvps.forEach(rsvp => {
        const row = [
          rsvp.id,
          `"${rsvp.name}"`,
          rsvp.email,
          rsvp.attendance,
          rsvp.guest_count,
          `"${rsvp.guest_names || ''}"`,
          `"${rsvp.dietary_requirements || ''}"`,
          rsvp.table_number || '',
          `"${rsvp.guest_name || ''}"`,
          `"${rsvp.guest_dietary || ''}"`,
          new Date(rsvp.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
      csvData += '\n';
    }

    if (type === 'all' || type === 'songs') {
      const songs = await sql`SELECT * FROM song_requests ORDER BY created_at DESC`;
      
      csvData += 'Song Requests\n';
      csvData += 'ID,Name,Email,Song Title,Artist,Genre,Reason,Created Date\n';
      
      songs.forEach(song => {
        const row = [
          song.id,
          `"${song.name}"`,
          song.email,
          `"${song.song_title}"`,
          `"${song.artist_name}"`,
          song.genre || '',
          `"${song.reason || ''}"`,
          new Date(song.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
      csvData += '\n';
    }

    if (type === 'all' || type === 'photos') {
      const photos = await sql`SELECT * FROM photo_shares ORDER BY created_at DESC`;
      
      csvData += 'Photo Shares\n';
      csvData += 'ID,Name,Email,Photo URL,Description,Category,Created Date\n';
      
      photos.forEach(photo => {
        const row = [
          photo.id,
          `"${photo.name}"`,
          photo.email,
          photo.photo_url,
          `"${photo.description || ''}"`,
          photo.category,
          new Date(photo.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
      csvData += '\n';
    }

    if (type === 'all' || type === 'wishes') {
      const wishes = await sql`SELECT * FROM wishes ORDER BY created_at DESC`;
      
      csvData += 'Wishes\n';
      csvData += 'ID,Name,Email,Message Type,Relationship,Message,Created Date\n';
      
      wishes.forEach(wish => {
        const row = [
          wish.id,
          `"${wish.name}"`,
          wish.email,
          wish.message_type,
          `"${wish.relationship || ''}"`,
          `"${wish.message}"`,
          new Date(wish.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mary-chima-wedding-data-${new Date().toISOString().split('T')[0]}.csv"`
      },
      body: csvData,
    };

  } catch (error) {
    console.error('Export error:', error);
    
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