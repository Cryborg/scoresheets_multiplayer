import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

interface LeaveSessionParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: LeaveSessionParams) {
  try {
    const { sessionId } = await context.params;
    const currentUserId = getAuthenticatedUserId(request);

    if (!currentUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check if session exists
    const sessionResult = await db.execute({
      sql: 'SELECT id, host_user_id, status FROM game_sessions WHERE id = ?',
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    // Check if user has players in session
    const playerResult = await db.execute({
      sql: 'SELECT id, player_name FROM players WHERE session_id = ? AND user_id = ?',
      args: [sessionId, currentUserId]
    });

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vous n\'êtes pas dans cette session' }, { status: 400 });
    }

    // Remove all players belonging to this user from the session
    await db.execute({
      sql: 'DELETE FROM players WHERE session_id = ? AND user_id = ?',
      args: [sessionId, currentUserId]
    });

    // Update session player count
    await db.execute({
      sql: 'UPDATE game_sessions SET current_players = current_players - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [playerResult.rows.length, sessionId]
    });

    // If user was the host and there are other players, transfer host to first remaining player
    if (Number(session.host_user_id) === currentUserId) {
      const remainingPlayersResult = await db.execute({
        sql: 'SELECT user_id FROM players WHERE session_id = ? AND user_id IS NOT NULL LIMIT 1',
        args: [sessionId]
      });

      if (remainingPlayersResult.rows.length > 0) {
        const newHostId = remainingPlayersResult.rows[0].user_id;
        await db.execute({
          sql: 'UPDATE game_sessions SET host_user_id = ? WHERE id = ?',
          args: [newHostId, sessionId]
        });
      } else {
        // No players left, cancel the session
        await db.execute({
          sql: 'UPDATE game_sessions SET status = ?, ended_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: ['cancelled', sessionId]
        });
      }
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