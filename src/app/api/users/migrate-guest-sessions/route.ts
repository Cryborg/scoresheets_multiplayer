import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getAuthenticatedUserId, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID
    const authenticatedUserId = getAuthenticatedUserId(request);
    
    if (!authenticatedUserId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { guestId, sessionIds } = body;

    if (!guestId || !sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    // Verify guest ID is valid
    if (guestId < 9000000) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    // Start transaction-like operations
    let migratedCount = 0;
    const errors: string[] = [];

    for (const sessionId of sessionIds) {
      try {
        // Update session host if guest was the host
        await db.execute({
          sql: `UPDATE sessions 
                SET host_user_id = ? 
                WHERE id = ? AND host_user_id = ?`,
          args: [authenticatedUserId, sessionId, guestId]
        });

        // Update players table - transfer ownership of guest players
        await db.execute({
          sql: `UPDATE players 
                SET user_id = ? 
                WHERE session_id = ? AND user_id = ?`,
          args: [authenticatedUserId, sessionId, guestId]
        });

        // Update session events
        await db.execute({
          sql: `UPDATE session_events 
                SET user_id = ? 
                WHERE session_id = ? AND user_id = ?`,
          args: [authenticatedUserId, sessionId, guestId]
        });

        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate session ${sessionId}:`, error);
        errors.push(`Session ${sessionId} migration failed`);
      }
    }

    // Mark user as having migrated guest sessions
    await db.execute({
      sql: `UPDATE users 
            SET guest_sessions_migrated = 1 
            WHERE id = ?`,
      args: [authenticatedUserId]
    });

    // Optional: Delete the guest user if all sessions were migrated
    if (migratedCount === sessionIds.length) {
      // Check if guest has any remaining sessions
      const remainingSessions = await db.execute({
        sql: `SELECT COUNT(*) as count 
              FROM sessions 
              WHERE host_user_id = ?`,
        args: [guestId]
      });

      const row = remainingSessions.rows[0] as { count?: number };
      const count = row.count || 0;
      
      if (count === 0) {
        // Safe to delete guest user
        await db.execute({
          sql: `DELETE FROM users WHERE id = ? AND is_guest = 1`,
          args: [guestId]
        });
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      errors,
      message: `Successfully migrated ${migratedCount} sessions`
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}