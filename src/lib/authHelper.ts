import { NextRequest } from 'next/server';
import { getAuthenticatedUserId } from './auth';
import { db } from './database';

/**
 * Get user ID from request - supports both authenticated users and guests
 * Creates guest user in database if needed
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  // First try to get authenticated user ID
  const authenticatedUserId = getAuthenticatedUserId(request);
  if (authenticatedUserId) {
    return authenticatedUserId;
  }

  // Check for guest ID in headers
  const guestIdHeader = request.headers.get('x-guest-id');
  if (guestIdHeader) {
    const guestId = parseInt(guestIdHeader, 10);
    if (!isNaN(guestId) && guestId >= 9000000) {
      // Valid guest ID - ensure user exists in database
      await ensureGuestUserExists(guestId);
      return guestId;
    }
  }

  return null;
}

/**
 * Ensure guest user exists in database
 */
async function ensureGuestUserExists(guestId: number): Promise<void> {
  const existingUser = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [guestId]
  });

  if (existingUser.rows.length === 0) {
    // Create guest user
    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, is_admin, is_guest, created_at)
            VALUES (?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)`,
      args: [
        guestId,
        `Guest_${guestId}`,
        `guest_${guestId}@temporary.local`,
        'NO_PASSWORD_GUEST_USER'
      ]
    });
    console.log('[Guest] Created guest user:', guestId);
  }
}

/**
 * Check if a user ID is a guest
 */
export function isGuestId(userId: number): boolean {
  return userId >= 9000000;
}