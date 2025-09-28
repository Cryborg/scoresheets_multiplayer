import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/database';
import { getSetting } from '@/lib/settings';
import { errorLogger } from '@/lib/errorLogger';

/**
 * Removes guest users that haven't been seen for more than 24 hours
 * Only runs once per day based on app_settings tracking
 * Respects the autoCleanupOldSessions setting
 */
export async function pruneInactiveGuestUsers(): Promise<void> {
  try {
    // Check if automatic cleanup is enabled
    const autoCleanupEnabled = await getSetting('autoCleanupOldSessions', true);
    if (!autoCleanupEnabled) {
      return; // Skip pruning if disabled
    }
    // Check when last pruning occurred
    const lastPruneResult = await db.execute({
      sql: 'SELECT value FROM app_settings WHERE key = ?',
      args: ['last_guest_prune']
    });

    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    if (lastPruneResult.rows.length > 0) {
      const lastPruneDate = lastPruneResult.rows[0].value as string;
      // Already pruned today, skip
      if (lastPruneDate === today) {
        return;
      }
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Delete guest users not seen in 24 hours
    const result = await db.execute({
      sql: `DELETE FROM users
            WHERE is_guest = 1
            AND (last_seen IS NULL OR last_seen < ?)`,
      args: [twentyFourHoursAgo]
    });

    // Update last prune date
    if (lastPruneResult.rows.length > 0) {
      await db.execute({
        sql: 'UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?',
        args: [today, now.toISOString(), 'last_guest_prune']
      });
    } else {
      await db.execute({
        sql: 'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
        args: ['last_guest_prune', today, now.toISOString()]
      });
    }

    if (result.rowsAffected && result.rowsAffected > 0) {
      errorLogger.info(`Pruned ${result.rowsAffected} inactive guest users`, 'auth');
    }
  } catch (error) {
    console.error('Error pruning inactive guest users:', error);
  }
}

/**
 * Extracts and validates the user ID from the JWT token in the request cookies
 * @param request - The incoming Next.js request
 * @returns The user ID or null if authentication fails
 */
export function getAuthenticatedUserId(request: NextRequest): number | null {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set');
      return null;
    }

    // Verify JWT signature and decode payload
    const payload = jwt.verify(token, jwtSecret) as { userId?: number; exp?: number };

    if (!payload.userId || typeof payload.userId !== 'number') {
      return null;
    }

    return payload.userId;
  } catch (error) {
    // jwt.verify throws errors for invalid signatures, expired tokens, etc.
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('JWT token expired:', error.message);
    } else {
      console.error('JWT verification error:', error);
    }
    return null;
  }
}

/**
 * Returns an unauthorized response
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}