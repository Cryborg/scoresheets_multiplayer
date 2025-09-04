// Edge Runtime compatible settings utilities
// This file doesn't import database.ts to avoid Node.js dependencies

import { createClient } from '@libsql/client';

// Edge-compatible database client (production only)
function getEdgeClient() {
  if (process.env.NODE_ENV !== 'production') {
    // In development, we can't use Edge Runtime with local SQLite
    // Return null and handle gracefully
    return null;
  }
  
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

// Helper function to convert database value to proper type
function convertValue(value: string, type: string): unknown {
  switch (type) {
    case 'boolean':
      return value === 'true';
    case 'number':
      return parseInt(value, 10);
    case 'json':
      return JSON.parse(value);
    default:
      return value;
  }
}

// Get a specific setting value (Edge Runtime compatible)
export async function getSettingEdge(key: string, defaultValue: unknown = null): Promise<unknown> {
  try {
    const client = getEdgeClient();
    
    if (!client) {
      // In development, return default values
      const devDefaults: Record<string, unknown> = {
        maintenanceMode: false,
        allowRegistration: true,
        sessionTimeout: 3600,
        siteName: 'Oh Sheet!',
        siteDescription: 'Score like a pro',
        defaultTheme: 'system',
        autoCleanupOldSessions: true
      };
      return devDefaults[key] ?? defaultValue;
    }

    // Fetch from database
    const result = await client.execute({
      sql: 'SELECT value, type FROM app_settings WHERE key = ?',
      args: [key]
    });

    if (result.rows.length === 0) {
      return defaultValue;
    }

    const row = result.rows[0];
    return convertValue(row.value as string, row.type as string);
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

// Specific helper for maintenance mode
export async function isMaintenanceModeEdge(): Promise<boolean> {
  return await getSettingEdge('maintenanceMode', false);
}