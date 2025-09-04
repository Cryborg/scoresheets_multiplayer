import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';
import { clearSettingsCache } from '@/lib/settings';

// Type definitions (kept for future use)
// interface AppSettings {
//   siteName: string;
//   siteDescription: string;
//   maintenanceMode: boolean;
//   allowRegistration: boolean;
//   defaultTheme: 'light' | 'dark' | 'system';
//   sessionTimeout: number;
//   autoCleanupOldSessions: boolean;
// }

// Helper function to convert database value to proper type
function convertValue(value: string, type: string): string | boolean | number | unknown {
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

// Helper function to convert value to string for database storage
function convertToString(value: unknown): string {
  if (typeof value === 'boolean') {
    return value.toString();
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// GET - Fetch all settings
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and admin
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check admin status
    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Fetch all settings
    const result = await db.execute({
      sql: 'SELECT key, value, type FROM app_settings ORDER BY key',
      args: []
    });

    // Convert to object format
    const settings: Record<string, string | boolean | number | unknown> = {};
    for (const row of result.rows) {
      const key = row.key as string;
      const value = row.value as string;
      const type = row.type as string;
      settings[key] = convertValue(value, type);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and admin
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Check admin status
    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Format de données invalide' },
        { status: 400 }
      );
    }

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      // First check if setting exists and get its type
      const existingSetting = await db.execute({
        sql: 'SELECT type FROM app_settings WHERE key = ?',
        args: [key]
      });

      if (existingSetting.rows.length === 0) {
        // Skip unknown settings
        console.warn(`Unknown setting key: ${key}`);
        continue;
      }

      const stringValue = convertToString(value);

      // Update the setting
      await db.execute({
        sql: 'UPDATE app_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        args: [stringValue, key]
      });
    }

    // Clear cache after successful update
    clearSettingsCache();

    return NextResponse.json({ 
      success: true, 
      message: 'Paramètres sauvegardés avec succès' 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des paramètres' },
      { status: 500 }
    );
  }
}