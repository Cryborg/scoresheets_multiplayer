/**
 * Environment variables validation - SERVER-SIDE ONLY
 * ⚠️ WARNING: This file should NEVER be imported in client-side code!
 * Ensures all required secrets are present and valid
 */

// Fail fast if running in browser environment
if (typeof window !== 'undefined') {
  throw new Error('env-validation.ts should never be imported on client-side! Use server-only environment variables.');
}

interface EnvConfig {
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  RESEND_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
}

/**
 * Validate that a secret meets minimum security requirements
 */
function validateSecret(secret: string, name: string): void {
  if (!secret) {
    throw new Error(`${name} is required`);
  }
  
  if (secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters long`);
  }
  
  // Check for common insecure patterns
  const insecurePatterns = [
    'fallback',
    'default',
    'secret',
    'password',
    '123456',
    'test',
    'dev'
  ];
  
  const lowerSecret = secret.toLowerCase();
  if (insecurePatterns.some(pattern => lowerSecret.includes(pattern))) {
    throw new Error(`${name} contains insecure patterns. Use a cryptographically secure random string.`);
  }
}

/**
 * Validate database configuration based on environment
 */
function validateDatabaseConfig(config: EnvConfig): void {
  const isProduction = config.NODE_ENV === 'production';
  
  if (isProduction) {
    if (!config.TURSO_DATABASE_URL) {
      throw new Error('TURSO_DATABASE_URL is required in production');
    }
    
    if (!config.TURSO_AUTH_TOKEN) {
      throw new Error('TURSO_AUTH_TOKEN is required in production');
    }
    
    // Validate Turso URL format
    if (!config.TURSO_DATABASE_URL.startsWith('libsql://')) {
      throw new Error('TURSO_DATABASE_URL must start with libsql://');
    }
  } else {
    // In development, allow local SQLite
    if (config.TURSO_DATABASE_URL && !config.TURSO_DATABASE_URL.startsWith('file:') && !config.TURSO_DATABASE_URL.startsWith('libsql://')) {
      throw new Error('TURSO_DATABASE_URL must start with file: (local) or libsql:// (remote)');
    }
  }
}

/**
 * Validate and parse environment variables
 * Throws error if any required variable is missing or invalid
 */
export function validateEnvironment(): EnvConfig {
  const config: EnvConfig = {
    JWT_SECRET: process.env.JWT_SECRET || '',
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
  
  // Only validate JWT secret in production
  if (config.NODE_ENV === 'production') {
    validateSecret(config.JWT_SECRET, 'JWT_SECRET');
  }
  
  // In test, allow fallback but warn
  if (!config.JWT_SECRET) {
    config.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long';
    console.warn('⚠️ Using test JWT secret. This should only happen in test environment.');
  }
  
  // Validate database configuration
  validateDatabaseConfig(config);
  
  // Validate app URL in production - optional for now
  if (config.NODE_ENV === 'production' && config.NEXT_PUBLIC_APP_URL) {
    if (!config.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production');
    }
  }
  
  return config;
}

/**
 * Get validated environment configuration
 * Cache the result after first validation
 */
let cachedConfig: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (!cachedConfig) {
    try {
      cachedConfig = validateEnvironment();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Environment variables validated successfully');
      }
    } catch (error) {
      console.error('❌ Environment validation failed:', error instanceof Error ? error.message : error);
      
      if (process.env.NODE_ENV === 'production') {
        // In production, fail hard
        process.exit(1);
      } else {
        // In development, log and continue (but warn)
        console.warn('⚠️ Continuing in development mode with validation errors');
        throw error;
      }
    }
  }
  
  return cachedConfig;
}