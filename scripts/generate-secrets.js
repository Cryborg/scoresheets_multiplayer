#!/usr/bin/env node

/**
 * Generate secure secrets for Oh Sheet! application
 * Usage: node scripts/generate-secrets.js
 */

import { randomBytes } from 'crypto';

console.log('🔐 Generating secure secrets for Oh Sheet!');
console.log('='.repeat(50));

// Generate JWT secret (64 bytes = 128 hex characters)
const jwtSecret = randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);
console.log('');

console.log('✅ Secrets generated successfully!');
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('1. Copy these secrets to your .env file');
console.log('2. NEVER commit secrets to version control');
console.log('3. Use different secrets for development and production');
console.log('4. Rotate secrets regularly in production');
console.log('');
console.log('📝 Add to your .env file:');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('');
console.log('🔒 These secrets are cryptographically secure and meet all requirements.');