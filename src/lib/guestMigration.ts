/**
 * Guest session migration utilities
 * Handles transferring guest sessions to newly created accounts
 */

import { getGuestSessions, clearGuestData, getGuestId } from './guestAuth';

export interface MigrationResult {
  success: boolean;
  migratedSessions: number;
  errors: string[];
}

/**
 * Migrate guest sessions to authenticated user account
 * Called after successful account creation/login
 */
export async function migrateGuestSessions(authToken: string): Promise<MigrationResult> {
  const guestSessions = getGuestSessions();
  const guestId = getGuestId();
  const errors: string[] = [];
  let migratedCount = 0;

  if (guestSessions.length === 0) {
    return {
      success: true,
      migratedSessions: 0,
      errors: []
    };
  }

  try {
    // Call migration API endpoint
    const response = await fetch('/api/users/migrate-guest-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        guestId,
        sessionIds: guestSessions.map(s => s.sessionId)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      errors.push(error.message || 'Migration failed');
      return {
        success: false,
        migratedSessions: 0,
        errors
      };
    }

    const result = await response.json();
    migratedCount = result.migratedCount || 0;

    // Clear guest data after successful migration
    if (migratedCount > 0) {
      clearGuestData();
    }

    return {
      success: true,
      migratedSessions: migratedCount,
      errors: []
    };
  } catch (error) {
    console.error('Migration error:', error);
    errors.push('Network error during migration');
    return {
      success: false,
      migratedSessions: 0,
      errors
    };
  }
}

/**
 * Check if current user has guest sessions to migrate
 */
export function hasGuestSessionsToMigrate(): boolean {
  const sessions = getGuestSessions();
  return sessions.length > 0;
}

/**
 * Get summary of guest sessions for display
 */
export function getGuestSessionsSummary() {
  const sessions = getGuestSessions();
  
  if (sessions.length === 0) {
    return null;
  }

  const hostSessions = sessions.filter(s => s.role === 'host');
  const playerSessions = sessions.filter(s => s.role === 'player');

  return {
    total: sessions.length,
    asHost: hostSessions.length,
    asPlayer: playerSessions.length,
    games: [...new Set(sessions.map(s => s.gameName))],
    oldestSession: sessions.reduce((oldest, s) => 
      new Date(s.createdAt) < new Date(oldest.createdAt) ? s : oldest
    ),
    newestSession: sessions.reduce((newest, s) => 
      new Date(s.createdAt) > new Date(newest.createdAt) ? s : newest
    )
  };
}