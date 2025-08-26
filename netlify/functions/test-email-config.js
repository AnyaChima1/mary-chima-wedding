const emailConfig = require('./email-config');

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
    console.log('Testing email configuration...');
    
    // Test the configuration
    const testResult = emailConfig.utils.testCredentials();
    console.log('Test result:', testResult);
    
    // Try to get the service token
    let credentialInfo = {
      available: false,
      source: 'none',
      length: 0,
      format: 'invalid'
    };
    
    try {
      const serviceToken = emailConfig.emailService.authToken;
      credentialInfo = {
        available: true,
        source: process.env.SENDGRID_API_KEY ? 'environment' : 'fallback',
        length: serviceToken ? serviceToken.length : 0,
        format: serviceToken && serviceToken.startsWith('SG.') ? 'valid' : 'invalid',
        prefix: serviceToken ? serviceToken.substring(0, 10) + '...' : 'none'
      };
    } catch (error) {
      credentialInfo.error = error.message;
    }
    
    // Test email service connection
    let serviceTest = {
      tested: false,
      status: 'not_tested',
      error: null
    };
    
    if (credentialInfo.available && credentialInfo.format === 'valid') {
      try {
        // Test with a minimal call to email service
        const testResponse = await fetch('https://api.sendgrid.com/v3/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${emailConfig.emailService.authToken}`,
            'Content-Type': 'application/json',
          }
        });
        
        serviceTest = {
          tested: true,
          status: testResponse.status,
          statusText: testResponse.statusText,
          success: testResponse.ok
        };
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          serviceTest.error = errorText;
        }
      } catch (error) {
        serviceTest = {
          tested: true,
          status: 'network_error',
          error: error.message
        };
      }
    }
    
    // Environment info
    const envInfo = {
      hasNetlifyDbUrl: !!process.env.NETLIFY_DATABASE_URL,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      nodeEnv: process.env.NODE_ENV || 'not_set'
    };
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      configTest: testResult,
      credentials: credentialInfo,
      serviceConnection: serviceTest,
      environment: envInfo,
      emailConfig: {
        senderEmail: emailConfig.emailService.senderEmail,
        senderName: emailConfig.emailService.senderName,
        websiteUrl: emailConfig.emailService.websiteUrl
      }
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email configuration diagnostics completed',
        diagnostics: diagnostics
      }, null, 2),
    };

  } catch (error) {
    console.error('Email config test error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Email configuration test failed',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, null, 2),
    };
  }
};