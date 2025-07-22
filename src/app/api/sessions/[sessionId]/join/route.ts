import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { playerName } = body;

    if (!playerName || !playerName.trim()) {
      return NextResponse.json({ error: 'Nom du joueur requis' }, { status: 400 });
    }

    // Get user ID if authenticated
    const userId = getAuthenticatedUserId(request);

    // Check if session exists and is joinable
    const sessionResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.max_players,
          (SELECT COUNT(*) FROM players WHERE session_id = gs.id) as current_players
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.id = ? AND gs.status IN ('waiting', 'active')
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session introuvable ou terminée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];
    
    // Check if session is full
    if (Number(session.current_players) >= Number(session.max_players)) {
      return NextResponse.json({ error: 'La partie est complète' }, { status: 400 });
    }

    // Check if player name already exists in session
    const existingPlayerResult = await tursoClient.execute({
      sql: 'SELECT id FROM players WHERE session_id = ? AND player_name = ?',
      args: [sessionId, playerName.trim()]
    });

    if (existingPlayerResult.rows.length > 0) {
      return NextResponse.json({ error: 'Ce nom est déjà pris dans cette partie' }, { status: 400 });
    }

    // Get next position
    const positionResult = await tursoClient.execute({
      sql: 'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM players WHERE session_id = ?',
      args: [sessionId]
    });

    const nextPosition = Number(positionResult.rows[0].next_position);

    // Add player to session
    const insertResult = await tursoClient.execute({
      sql: `
        INSERT INTO players (session_id, user_id, player_name, position, is_ready, is_connected, last_seen)
        VALUES (?, ?, ?, ?, 0, 1, CURRENT_TIMESTAMP)
      `,
      args: [sessionId, userId, playerName.trim(), nextPosition]
    });

    // Update current_players count
    await tursoClient.execute({
      sql: 'UPDATE game_sessions SET current_players = current_players + 1 WHERE id = ?',
      args: [sessionId]
    });

    // Add join event
    await tursoClient.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'player_joined', ?)
      `,
      args: [
        sessionId,
        userId,
        JSON.stringify({ 
          playerName: playerName.trim(),
          position: nextPosition
        })
      ]
    });

    // Convert BigInt to number for JSON serialization
    const playerId = typeof insertResult.lastInsertRowid === 'bigint' 
      ? Number(insertResult.lastInsertRowid) 
      : insertResult.lastInsertRowid;

    return NextResponse.json({ 
      success: true,
      playerId,
      position: nextPosition
    });

  } catch (error) {
    console.error('Join session error:', error);
    return NextResponse.json({ error: 'Erreur lors de la connexion à la partie' }, { status: 500 });
  }
}