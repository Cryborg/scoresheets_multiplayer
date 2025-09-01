import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/authHelper';
import { db } from '@/lib/database';

interface LeaveSessionParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: LeaveSessionParams) {
  try {
    const { sessionId } = await context.params;
    // Everyone gets an ID (authenticated or guest)
    const currentUserId = await getUserId(request);

    // Check if session exists
    const sessionResult = await db.execute({
      sql: 'SELECT id, host_user_id, status FROM sessions WHERE id = ?',
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    // Check if user has players in session
    const playerResult = await db.execute({
      sql: `SELECT p.id, p.name as player_name 
            FROM players p 
            JOIN session_player sp ON p.id = sp.player_id 
            WHERE sp.session_id = ? AND p.user_id = ?`,
      args: [sessionId, currentUserId]
    });

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vous n\'êtes pas dans cette session' }, { status: 400 });
    }

    // Check if this is a local session BEFORE removing players
    const allUsersInSessionResult = await db.execute({
      sql: `SELECT DISTINCT p.user_id 
            FROM players p 
            JOIN session_player sp ON p.id = sp.player_id 
            WHERE sp.session_id = ? AND p.user_id IS NOT NULL`,
      args: [sessionId]
    });

    const isLocalSession = allUsersInSessionResult.rows.length <= 1;

    // For local sessions, don't actually remove players - just record the leave event
    // For real multiplayer sessions, remove the players
    if (!isLocalSession) {
      // Remove all players belonging to this user from the session
      // First get the player IDs to delete from session_player
      const playerIds = playerResult.rows.map(row => row.id);
      
      // Delete from session_player pivot table
      if (playerIds.length > 0) {
        const placeholders = playerIds.map(() => '?').join(',');
        await db.execute({
          sql: `DELETE FROM session_player WHERE session_id = ? AND player_id IN (${placeholders})`,
          args: [sessionId, ...playerIds]
        });
        
        // Optionally delete players from players table if they're not used elsewhere
        // For now, keep them for historical data
      }

      // Update session player count
      await db.execute({
        sql: 'UPDATE sessions SET current_players = current_players - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [playerResult.rows.length, sessionId]
      });
    } else {
      console.log(`[LEAVE] Local session ${sessionId} - not removing players, user can return`);
    }

    // For non-local sessions, handle host transfer and cancellation
    if (!isLocalSession && Number(session.host_user_id) === currentUserId) {
      const remainingPlayersResult = await db.execute({
        sql: `SELECT p.user_id 
              FROM players p 
              JOIN session_player sp ON p.id = sp.player_id 
              WHERE sp.session_id = ? AND p.user_id IS NOT NULL 
              LIMIT 1`,
        args: [sessionId]
      });

      if (remainingPlayersResult.rows.length > 0) {
        const newHostId = remainingPlayersResult.rows[0].user_id;
        await db.execute({
          sql: 'UPDATE sessions SET host_user_id = ? WHERE id = ?',
          args: [newHostId, sessionId]
        });
      } else {
        // Real multiplayer session with no players left - cancel it
        await db.execute({
          sql: 'UPDATE sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: ['cancelled', sessionId]
        });
      }
    }
    
    // For local sessions, just log that user "left" but session remains intact
    if (isLocalSession) {
      console.log(`[LEAVE] Local session ${sessionId} - user ${currentUserId} disconnected but can return anytime`);
    }

    // Add leave event
    await db.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'player_left', ?)
      `,
      args: [
        sessionId,
        currentUserId,
        JSON.stringify({
          playersRemoved: playerResult.rows.map(row => ({ id: row.id, name: row.player_name }))
        })
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Vous avez quitté la session avec succès'
    });

  } catch (error) {
    console.error('Leave session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la sortie de session' },
      { status: 500 }
    );
  }
}