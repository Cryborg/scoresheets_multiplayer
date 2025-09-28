import { NextRequest } from 'next/server';
import { getAuthenticatedUserId } from './auth';
import { db } from './database';
import { getGuestId } from './guestAuth';

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
  const guestIdHeader = request.headers.get('X-Guest-Id');
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
  }
}

/**
 * Get user ID - ALWAYS returns a valid user ID (authenticated or guest)
 * This is the new paradigm: everyone gets an ID, auth is just a bonus
 */
export async function getUserId(request: NextRequest, providedGuestId?: number): Promise<number> {
  // First try authenticated user
  const authenticatedUserId = getAuthenticatedUserId(request);
  if (authenticatedUserId) {
    return authenticatedUserId;
  }

  // Use provided guest ID if available
  if (providedGuestId && providedGuestId >= 9000000) {
    await ensureGuestUserExists(providedGuestId);
    return providedGuestId;
  }

  // Check for existing guest ID in headers
  const guestIdHeader = request.headers.get('X-Guest-Id');
  if (guestIdHeader) {
    const guestId = parseInt(guestIdHeader, 10);
    if (!isNaN(guestId) && guestId >= 9000000) {
      await ensureGuestUserExists(guestId);
      return guestId;
    }
  }

  // Last resort: create a new guest ID server-side
  const newGuestId = generateGuestId();
  await ensureGuestUserExists(newGuestId);
  return newGuestId;
}

/**
 * Generate a new guest ID server-side
 */
function generateGuestId(): number {
  return 9000000 + Math.floor(Math.random() * 999999);
}

/**
 * Check if a user ID is a guest
 */
export function isGuestId(userId: number): boolean {
  return userId >= 9000000;
}