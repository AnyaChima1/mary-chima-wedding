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
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database connection not configured' }),
      };
    }
    
    const sql = neon(databaseUrl);

    // Get query parameters
    const { type = 'all' } = event.queryStringParameters || {};

    let csvData = '';
    
    if (type === 'guests') {
      // Export individual guests data only
      const guests = await sql`
        SELECT 
          ig.id, ig.rsvp_id, ig.guest_name, ig.dietary_needs, 
          ig.table_number, ig.is_primary, ig.created_at,
          r.name as rsvp_name, r.email as rsvp_email, r.attendance, r.phone
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        ORDER BY ig.guest_name ASC
      `;
      
      csvData += 'Individual Guests Data\n';
      csvData += 'Guest ID,Guest Name,Guest Type,RSVP Contact Name,RSVP Email,Phone,Attendance Status,Dietary Requirements,Table Assignment,RSVP ID,Date Added\n';
      
      guests.forEach(guest => {
        const row = [
          guest.id,
          `"${guest.guest_name}"`,
          guest.is_primary ? 'Primary Guest' : 'Additional Guest',
          `"${guest.rsvp_name || 'Unknown'}"`,
          guest.rsvp_email || '',
          guest.phone || '',
          guest.attendance === 'yes' ? 'Attending' : 'Not Attending',
          `"${guest.dietary_needs || 'None specified'}"`,
          guest.table_number ? `Table ${guest.table_number}` : 'Unassigned',
          guest.rsvp_id,
          new Date(guest.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
    } else if (type === 'tables') {
      // Export table assignments
      const tableData = await sql`
        SELECT 
          ig.table_number,
          ig.guest_name,
          ig.is_primary,
          ig.dietary_needs,
          r.name as rsvp_name,
          r.email as rsvp_email,
          r.phone
        FROM individual_guests ig
        LEFT JOIN rsvps r ON ig.rsvp_id = r.id
        WHERE ig.table_number IS NOT NULL
        ORDER BY ig.table_number, ig.is_primary DESC, ig.guest_name
      `;
      
      csvData += 'Table Seating Plan\n';
      csvData += 'Table Number,Guest Name,Guest Type,Dietary Requirements,RSVP Contact,Email,Phone\n';
      
      tableData.forEach(guest => {
        const row = [
          guest.table_number,
          `"${guest.guest_name}"`,
          guest.is_primary ? 'Primary' : 'Additional',
          `"${guest.dietary_needs || 'None'}"`,
          `"${guest.rsvp_name}"`,
          guest.rsvp_email || '',
          guest.phone || ''
        ].join(',');
        csvData += row + '\n';
      });
    } else if (type === 'all' || type === 'rsvps') {
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
    } else if (type === 'all' || type === 'songs') {
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
    } else if (type === 'all' || type === 'photos') {
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
    } else if (type === 'all' || type === 'wishes') {
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
    } else if (type === 'notifications') {
      // Export notifications
      const notifications = await sql`
        SELECT 
          id, subject, message, notification_type, recipient_count,
          sent_count, failed_count, status, created_at
        FROM notifications
        ORDER BY created_at DESC
      `;
      
      csvData += 'Notifications History\n';
      csvData += 'ID,Subject,Message,Type,Recipients,Sent,Failed,Status,Date\n';
      
      notifications.forEach(notification => {
        const row = [
          notification.id,
          `"${notification.subject}"`,
          `"${notification.message}"`,
          notification.notification_type,
          notification.recipient_count,
          notification.sent_count,
          notification.failed_count,
          notification.status,
          new Date(notification.created_at).toLocaleDateString()
        ].join(',');
        csvData += row + '\n';
      });
    } else {
      // Fallback for unrecognized types
      csvData = `Error: Unknown export type '${type}'. Supported types: guests, tables, rsvps, songs, photos, wishes, notifications, all`;
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