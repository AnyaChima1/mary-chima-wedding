const { neon } = require('@netlify/neon');

/**
 * Intelligent Wedding Automation System
 * Provides AI-powered features and smart automation
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
    // Basic authentication
    const authHeader = event.headers.authorization;
    const expectedAuth = process.env.ADMIN_PASSWORD || 'Mary&Chima0003';
    
    if (!authHeader || authHeader !== `Bearer ${expectedAuth}`) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' }),
      };
    }

    const sql = neon(databaseUrl);
    const { action } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'smart_reminders':
        return await handleSmartReminders(sql, headers);
      
      case 'auto_table_optimization':
        return await handleTableOptimization(sql, headers);
      
      case 'guest_analytics':
        return await handleGuestAnalytics(sql, headers);
      
      case 'dietary_insights':
        return await handleDietaryInsights(sql, headers);
      
      case 'rsvp_prediction':
        return await handleRSVPPrediction(sql, headers);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }

  } catch (error) {
    console.error('Automation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};

/**
 * Smart Reminder System
 * Automatically sends targeted reminders based on guest behavior
 */
async function handleSmartReminders(sql, headers) {
  const now = new Date();
  const weddingDate = new Date('2025-10-04');
  const daysUntilWedding = Math.ceil((weddingDate - now) / (1000 * 60 * 60 * 24));

  // Get guests who haven't RSVP'd
  const pendingGuests = await sql`
    SELECT name, email, created_at 
    FROM rsvps 
    WHERE attendance IS NULL
    AND created_at < NOW() - INTERVAL '3 days'
  `;

  // Get guests attending but no dietary info
  const incompleteDietary = await sql`
    SELECT r.name, r.email 
    FROM rsvps r
    LEFT JOIN individual_guests ig ON r.id = ig.rsvp_id
    WHERE r.attendance = 'yes'
    AND (r.dietary_requirements IS NULL OR r.dietary_requirements = '')
    AND (ig.dietary_needs IS NULL OR ig.dietary_needs = '')
    GROUP BY r.id, r.name, r.email
  `;

  // Get unassigned attending guests
  const unassignedGuests = await sql`
    SELECT r.name, r.email, COUNT(ig.id) as guest_count
    FROM rsvps r
    LEFT JOIN individual_guests ig ON r.id = ig.rsvp_id
    WHERE r.attendance = 'yes'
    AND (r.table_number IS NULL AND ig.table_number IS NULL)
    GROUP BY r.id, r.name, r.email
  `;

  const insights = {
    pending_rsvps: pendingGuests.length,
    incomplete_dietary: incompleteDietary.length,
    unassigned_guests: unassignedGuests.length,
    days_until_wedding: daysUntilWedding,
    recommended_actions: []
  };

  // Generate smart recommendations
  if (daysUntilWedding <= 14 && pendingGuests.length > 0) {
    insights.recommended_actions.push({
      type: 'urgent_reminder',
      priority: 'high',
      message: `Send final RSVP reminder to ${pendingGuests.length} guests`,
      action: 'send_rsvp_reminder'
    });
  }

  if (daysUntilWedding <= 21 && incompleteDietary.length > 0) {
    insights.recommended_actions.push({
      type: 'dietary_reminder',
      priority: 'medium',
      message: `Request dietary information from ${incompleteDietary.length} attending guests`,
      action: 'send_dietary_reminder'
    });
  }

  if (daysUntilWedding <= 30 && unassignedGuests.length > 0) {
    insights.recommended_actions.push({
      type: 'table_assignment',
      priority: 'medium',
      message: `Assign tables for ${unassignedGuests.length} guests`,
      action: 'auto_assign_tables'
    });
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: insights
    }),
  };
}

/**
 * Automatic Table Optimization
 * Intelligently assigns guests to tables based on relationships and preferences
 */
async function handleTableOptimization(sql, headers) {
  // Get all attending guests
  const attendingGuests = await sql`
    SELECT 
      r.id as rsvp_id,
      r.name as primary_name,
      r.email,
      ig.id as guest_id,
      ig.guest_name,
      ig.dietary_needs,
      ig.table_number,
      ig.is_primary
    FROM rsvps r
    LEFT JOIN individual_guests ig ON r.id = ig.rsvp_id
    WHERE r.attendance = 'yes'
    ORDER BY r.id, ig.is_primary DESC
  `;

  // Group guests by RSVP (families/couples should sit together)
  const guestGroups = {};
  attendingGuests.forEach(guest => {
    if (!guestGroups[guest.rsvp_id]) {
      guestGroups[guest.rsvp_id] = [];
    }
    guestGroups[guest.rsvp_id].push(guest);
  });

  // Get current table assignments
  const currentTables = await sql`
    SELECT table_number, COUNT(*) as current_count
    FROM individual_guests
    WHERE table_number IS NOT NULL
    GROUP BY table_number
    ORDER BY table_number
  `;

  const GUESTS_PER_TABLE = 4;
  const tableAssignments = [];
  let currentTable = 1;
  let currentTableCount = 0;

  // Find highest existing table number
  if (currentTables.length > 0) {
    currentTable = Math.max(...currentTables.map(t => t.table_number)) + 1;
  }

  // Assign unassigned guest groups to tables
  Object.values(guestGroups).forEach(group => {
    const unassignedInGroup = group.filter(g => !g.table_number);
    
    if (unassignedInGroup.length > 0) {
      // Check if we need a new table
      if (currentTableCount + unassignedInGroup.length > GUESTS_PER_TABLE) {
        currentTable++;
        currentTableCount = 0;
      }

      // Assign all guests in this group to the same table
      unassignedInGroup.forEach(guest => {
        tableAssignments.push({
          guest_id: guest.guest_id,
          table_number: currentTable
        });
      });

      currentTableCount += unassignedInGroup.length;
    }
  });

  // Update database with new assignments
  if (tableAssignments.length > 0) {
    for (const assignment of tableAssignments) {
      await sql`
        UPDATE individual_guests 
        SET table_number = ${assignment.table_number}
        WHERE id = ${assignment.guest_id}
      `;
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        guests_assigned: tableAssignments.length,
        tables_used: currentTable,
        assignments: tableAssignments
      }
    }),
  };
}

/**
 * Guest Analytics and Insights
 */
async function handleGuestAnalytics(sql, headers) {
  const analytics = await Promise.all([
    // RSVP trends over time
    sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as rsvps,
        SUM(CASE WHEN attendance = 'yes' THEN 1 ELSE 0 END) as attending
      FROM rsvps 
      GROUP BY DATE(created_at)
      ORDER BY date
    `,
    
    // Response time analysis
    sql`
      SELECT 
        AVG(EXTRACT(DAY FROM (updated_at - created_at))) as avg_response_days,
        MIN(EXTRACT(DAY FROM (updated_at - created_at))) as fastest_response,
        MAX(EXTRACT(DAY FROM (updated_at - created_at))) as slowest_response
      FROM rsvps 
      WHERE attendance IS NOT NULL
    `,
    
    // Dietary requirements summary
    sql`
      SELECT 
        dietary_needs,
        COUNT(*) as count
      FROM individual_guests 
      WHERE dietary_needs IS NOT NULL AND dietary_needs != ''
      GROUP BY dietary_needs
      ORDER BY count DESC
    `,
    
    // Guest count distribution
    sql`
      SELECT 
        guest_count,
        COUNT(*) as rsvp_count,
        SUM(guest_count) as total_guests
      FROM rsvps 
      WHERE attendance = 'yes'
      GROUP BY guest_count
      ORDER BY guest_count
    `
  ]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        rsvp_trends: analytics[0],
        response_times: analytics[1][0],
        dietary_summary: analytics[2],
        guest_distribution: analytics[3]
      }
    }),
  };
}

/**
 * Smart Dietary Insights
 */
async function handleDietaryInsights(sql, headers) {
  const dietaryData = await sql`
    SELECT 
      ig.dietary_needs,
      ig.table_number,
      COUNT(*) as count
    FROM individual_guests ig
    WHERE ig.dietary_needs IS NOT NULL 
    AND ig.dietary_needs != ''
    GROUP BY ig.dietary_needs, ig.table_number
    ORDER BY count DESC
  `;

  // Analyze dietary requirements by table
  const tableAnalysis = {};
  const overallStats = {};

  dietaryData.forEach(item => {
    // Overall statistics
    if (!overallStats[item.dietary_needs]) {
      overallStats[item.dietary_needs] = 0;
    }
    overallStats[item.dietary_needs] += item.count;

    // Table-specific analysis
    if (item.table_number) {
      if (!tableAnalysis[item.table_number]) {
        tableAnalysis[item.table_number] = {};
      }
      tableAnalysis[item.table_number][item.dietary_needs] = item.count;
    }
  });

  // Generate catering recommendations
  const recommendations = [];
  
  Object.entries(overallStats).forEach(([requirement, count]) => {
    const percentage = (count / 50) * 100; // Assuming 50 total guests
    
    if (percentage > 20) {
      recommendations.push({
        type: 'high_priority',
        requirement,
        count,
        percentage: Math.round(percentage),
        suggestion: `Consider making ${requirement} options prominent in the menu`
      });
    } else if (percentage > 10) {
      recommendations.push({
        type: 'medium_priority',
        requirement,
        count,
        percentage: Math.round(percentage),
        suggestion: `Ensure ${requirement} options are clearly labeled`
      });
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        overall_stats: overallStats,
        table_breakdown: tableAnalysis,
        recommendations
      }
    }),
  };
}

/**
 * RSVP Prediction Algorithm
 */
async function handleRSVPPrediction(sql, headers) {
  const historicalData = await sql`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as invitations_sent,
      SUM(CASE WHEN attendance = 'yes' THEN 1 ELSE 0 END) as responses_yes,
      SUM(CASE WHEN attendance = 'no' THEN 1 ELSE 0 END) as responses_no,
      SUM(CASE WHEN attendance IS NULL THEN 1 ELSE 0 END) as pending
    FROM rsvps 
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const totalInvited = await sql`SELECT COUNT(*) as total FROM rsvps`;
  const totalResponded = await sql`SELECT COUNT(*) as total FROM rsvps WHERE attendance IS NOT NULL`;
  const totalAttending = await sql`SELECT COUNT(*) as total FROM rsvps WHERE attendance = 'yes'`;

  const responseRate = totalResponded[0].total / totalInvited[0].total;
  const attendanceRate = totalAttending[0].total / totalResponded[0].total;
  
  // Simple prediction based on current trends
  const predictedFinalAttendance = Math.round(totalInvited[0].total * responseRate * attendanceRate);
  const expectedResponseRate = Math.min(responseRate + 0.1, 0.95); // Assume 95% max response rate
  const predictedFinalResponses = Math.round(totalInvited[0].total * expectedResponseRate);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      data: {
        current_stats: {
          total_invited: totalInvited[0].total,
          total_responded: totalResponded[0].total,
          total_attending: totalAttending[0].total,
          response_rate: Math.round(responseRate * 100),
          attendance_rate: Math.round(attendanceRate * 100)
        },
        predictions: {
          predicted_final_responses: predictedFinalResponses,
          predicted_final_attendance: predictedFinalAttendance,
          expected_response_rate: Math.round(expectedResponseRate * 100)
        },
        historical_trends: historicalData
      }
    }),
  };
}