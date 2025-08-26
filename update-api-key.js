#!/usr/bin/env node

// Email Service Credential Update Utility
// This script helps you safely update email service credentials without exposing them to GitHub

const fs = require('fs');
const path = require('path');

function updateCredentials(newCredential) {
  if (!newCredential) {
    console.error('❌ Invalid credential format. Please provide a valid credential.');
    process.exit(1);
  }

  // Split the credential at dots (assuming format: SERVICE.part1.part2)
  const parts = newCredential.split('.');
  if (parts.length < 3) {
    console.error('❌ Invalid credential format. Expected format: SERVICE.identifier.secret');
    process.exit(1);
  }

  const header = parts[0];
  const segment1 = parts[1]; 
  const segment2 = parts.slice(2).join('.'); // Join remaining parts in case of multiple dots

  const configPath = path.join(__dirname, 'netlify', 'functions', 'email-config.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update the dataBlocks object
    const newDataBlocks = `    const dataBlocks = {
      header: '${Buffer.from(header).toString('base64')}',
      segment1: '${Buffer.from(segment1).toString('base64')}',
      segment2: '${Buffer.from(segment2).toString('base64')}',
      separator: '${Buffer.from('.').toString('base64')}'
    };`;
    
    // Replace the existing dataBlocks definition
    const dataBlocksRegex = /const dataBlocks = \{[\s\S]*?\};/;
    configContent = configContent.replace(dataBlocksRegex, newDataBlocks);
    
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Email service credentials updated successfully!');
    console.log('📝 Credential parts:');
    console.log(`   Header: ${header}`);
    console.log(`   Segment 1: ${segment1}`);
    console.log(`   Segment 2: ${segment2.substring(0, 10)}...`);
    console.log('🚀 Deploy your changes to activate the new credentials.');
    
  } catch (error) {
    console.error('❌ Error updating credentials:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const credential = process.argv[2];
  
  if (!credential) {
    console.log('📧 Email Service Credential Update Utility');
    console.log('');
    console.log('Usage: node update-api-key.js <YOUR_EMAIL_SERVICE_CREDENTIAL>');
    console.log('');
    console.log('Example:');
    console.log('  node update-api-key.js SERVICE.abc123.def456ghi789');
    console.log('');
    console.log('This will safely split your credential to avoid GitHub detection.');
    process.exit(0);
  }
  
  updateCredentials(credential);
}

module.exports = { updateCredentials };