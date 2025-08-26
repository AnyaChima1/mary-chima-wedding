const { neon } = require('@netlify/neon');

/**
 * QR Code Features for Wedding Site
 * Generates QR codes for various wedding features
 */
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sql = neon(databaseUrl);
    
    const { action, guestEmail } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'generate_guest_qr':
        return await generateGuestQR(sql, headers, guestEmail);
      
      case 'generate_rsvp_qr':
        return await generateRSVPQR(headers);
      
      case 'generate_photo_share_qr':
        return await generatePhotoShareQR(headers);
      
      case 'generate_wishlist_qr':
        return await generateWishlistQR(headers);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }

  } catch (error) {
    console.error('QR generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate QR code' }),
    };
  }
};

async function generateGuestQR(sql, headers, guestEmail) {
  // Find guest details
  const guest = await sql`
    SELECT id, name, email, table_number 
    FROM rsvps 
    WHERE email = ${guestEmail}
  `;

  if (guest.length === 0) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Guest not found' }),
    };
  }

  const guestInfo = guest[0];
  const qrData = {
    type: 'guest',
    name: guestInfo.name,
    email: guestInfo.email,
    table: guestInfo.table_number,
    url: `${process.env.URL || 'https://marychima.netlify.app'}?guest=${encodeURIComponent(guestEmail)}`
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      qr_data: JSON.stringify(qrData),
      display_url: qrData.url
    }),
  };
}

async function generateRSVPQR(headers) {
  const qrData = {
    type: 'rsvp',
    url: `${process.env.URL || 'https://marychima.netlify.app'}#rsvp`,
    title: 'RSVP for Mary & Chima Wedding'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      qr_data: JSON.stringify(qrData),
      display_url: qrData.url
    }),
  };
}

async function generatePhotoShareQR(headers) {
  const qrData = {
    type: 'photos',
    url: `${process.env.URL || 'https://marychima.netlify.app'}#photos`,
    title: 'Share Wedding Photos'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      qr_data: JSON.stringify(qrData),
      display_url: qrData.url
    }),
  };
}

async function generateWishlistQR(headers) {
  const qrData = {
    type: 'wishes',
    url: `${process.env.URL || 'https://marychima.netlify.app'}#wishes`,
    title: 'Wedding Wishes for Mary & Chima'
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      qr_data: JSON.stringify(qrData),
      display_url: qrData.url
    }),
  };
}