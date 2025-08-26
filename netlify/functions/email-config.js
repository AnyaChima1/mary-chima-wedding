// Email configuration for wedding notification system
// This file contains sensitive configuration that should be kept secure

module.exports = {
  // SendGrid configuration
  sendgrid: {
    // Active API key - update this when keys are rotated
    apiKey: process.env.SENDGRID_API_KEY || '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',
    
    // Verified sender information
    fromEmail: 'info@maryandchima.love',
    fromName: 'Mary & Chima Wedding',
    
    // Email template settings
    websiteUrl: 'https://maryandchima.love',
    
    // API endpoint
    apiUrl: 'https://api.sendgrid.com/v3/mail/send'
  },
  
  // Backup email configurations (for future use)
  backup: {
    // Could add Postmark, Mailgun, or other services here
    // postmark: { ... },
    // mailgun: { ... }
  },
  
  // Email template defaults
  templates: {
    defaultSubject: 'Wedding Update from Mary & Chima',
    defaultSignature: '💕 With love, Mary & Chima'
  }
};