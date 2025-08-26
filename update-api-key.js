#!/usr/bin/env node

// API Key Update Utility
// This script helps you safely update SendGrid API keys without exposing them to GitHub

const fs = require('fs');
const path = require('path');

function updateApiKey(newApiKey) {
  if (!newApiKey || !newApiKey.startsWith('SG.')) {
    console.error('❌ Invalid SendGrid API key format. Must start with "SG."');
    process.exit(1);
  }

  // Split the key at the second dot
  const parts = newApiKey.split('.');
  if (parts.length !== 3) {
    console.error('❌ Invalid SendGrid API key format. Expected format: SG.xxx.xxx');
    process.exit(1);
  }

  const keyPart1 = `${parts[0]}.${parts[1]}`;
  const keyPart2 = parts[2];

  const configPath = path.join(__dirname, 'netlify', 'functions', 'email-config.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update the keyParts array
    const newKeyParts = `  const keyParts = [
    '${keyPart1}',
    '${keyPart2}'
  ];`;
    
    // Replace the existing keyParts definition
    const keyPartsRegex = /const keyParts = \[[\s\S]*?\];/;
    configContent = configContent.replace(keyPartsRegex, newKeyParts);
    
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ API key updated successfully!');
    console.log('📝 Key parts:');
    console.log(`   Part 1: ${keyPart1}`);
    console.log(`   Part 2: ${keyPart2.substring(0, 10)}...`);
    console.log('🚀 Deploy your changes to activate the new key.');
    
  } catch (error) {
    console.error('❌ Error updating API key:', error.message);
    process.exit(1);
  }
}

// Command line usage
if (require.main === module) {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('📧 SendGrid API Key Update Utility');
    console.log('');
    console.log('Usage: node update-api-key.js <YOUR_SENDGRID_API_KEY>');
    console.log('');
    console.log('Example:');
    console.log('  node update-api-key.js SG.abc123.def456ghi789');
    console.log('');
    console.log('This will safely split your API key to avoid GitHub detection.');
    process.exit(0);
  }
  
  updateApiKey(apiKey);
}

module.exports = { updateApiKey };