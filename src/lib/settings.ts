import { db } from '@/lib/database';

// Cache pour éviter trop de requêtes DB
let settingsCache: Record<string, unknown> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

// Helper function to convert database value to proper type
function convertValue(value: string, type: string | null): unknown {
  switch (type) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return parseInt(value, 10);
    case 'json':
      return JSON.parse(value);
    case null:
    case undefined:
      // If no type is specified, try to infer from value
      if (value === 'true' || value === 'false') {
        return value === 'true';
      }
      if (!isNaN(Number(value))) {
        return parseInt(value, 10);
      }
      return value;
    default:
      return value;
  }
}

// Get a specific setting value
export async function getSetting(key: string, defaultValue: unknown = null): Promise<unknown> {
  try {
    // Check cache first
    const now = Date.now();
    if (cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION && settingsCache[key] !== undefined) {
      return settingsCache[key];
    }

    // Fetch from database
    const result = await db.execute({
      sql: 'SELECT value, type FROM app_settings WHERE key = ?',
      args: [key]
    });

    if (result.rows.length === 0) {
      return defaultValue;
    }

    const row = result.rows[0];
    const value = convertValue(row.value as string, row.type as string);
    
    // Update cache
    settingsCache[key] = value;
    cacheTimestamp = now;
    
    return value;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

// Get all settings
export async function getAllSettings(): Promise<Record<string, unknown>> {
  try {
    // Check cache first
    const now = Date.now();
    if (cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION && Object.keys(settingsCache).length > 0) {
      return settingsCache;
    }

    // Fetch from database
    const result = await db.execute({
      sql: 'SELECT key, value, type FROM app_settings',
      args: []
    });

    const settings: Record<string, unknown> = {};
    for (const row of result.rows) {
      const key = row.key as string;
      const value = convertValue(row.value as string, row.type as string);
      settings[key] = value;
    }

    // Update cache
    settingsCache = settings;
    cacheTimestamp = now;
    
    return settings;
  } catch (error) {
    console.error('Error getting all settings:', error);
    return {};
  }
}

// Clear cache (to be called when settings are updated)
export function clearSettingsCache(): void {
  settingsCache = {};
  cacheTimestamp = 0;
}

// Specific helper functions for common settings
export async function isMaintenanceMode(): Promise<boolean> {
  return await getSetting('maintenanceMode', false);
}

export async function isRegistrationAllowed(): Promise<boolean> {
  return await getSetting('allowRegistration', true);
}

export async function getSessionTimeout(): Promise<number> {
  return await getSetting('sessionTimeout', 3600);
}

export async function getSiteName(): Promise<string> {
  return await getSetting('siteName', 'Oh Sheet!');
}

export async function getSiteDescription(): Promise<string> {
  return await getSetting('siteDescription', 'Score like a pro');
}