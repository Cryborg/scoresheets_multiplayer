import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

interface JoinSessionParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: JoinSessionParams) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const { playerName, player2Name } = body;

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'Nom du joueur requis' }, { status: 400 });
    }

    // Get user ID if authenticated
    const userId = getAuthenticatedUserId(request);

    // Check if session exists and is joinable
    const sessionResult = await db.execute({
      sql: `
        SELECT 
          s.id,
          s.status,
          g.max_players,
          g.slug as game_slug,
          g.team_based
        FROM sessions s
        JOIN games g ON s.game_id = g.id
        WHERE s.id = ? AND s.status IN ('waiting', 'active')
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée ou non ouverte' }, { status: 404 });
    }

    const session = sessionResult.rows[0] as any;

    // Simple implementation: Just create one player for now
    // TODO: Add team support back later
    
    // Create player in catalog
    const playerResult = await db.execute({
      sql: `INSERT INTO players (name, user_id) VALUES (?, ?)`,
      args: [playerName.trim(), userId]
    });
    
    let playerId = playerResult.lastInsertRowid;
    if (typeof playerId === 'bigint') {
      playerId = Number(playerId);
    }

    // Get next position
    const positionResult = await db.execute({
      sql: 'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM session_player WHERE session_id = ?',
      args: [sessionId]
    });
    const nextPosition = Number(positionResult.rows[0]?.next_position || 1);

    // Link player to session
    await db.execute({
      sql: `INSERT INTO session_player (session_id, player_id, position) VALUES (?, ?, ?)`,
      args: [sessionId, playerId, nextPosition]
    });

    // Update session timestamp
    await db.execute({
      sql: 'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sessionId]
    });

    // Add join event
    await db.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'player_joined', ?)
      `,
      args: [
        sessionId,
        userId,
        JSON.stringify({
          playerId: playerId,
          playerName: playerName.trim()
        })
      ]
    });

    return NextResponse.json({
      message: 'Joueur ajouté avec succès',
      playerId: playerId,
      playerName: playerName.trim()
    });

  } catch (error) {
    console.error('Erreur lors de l\'ajout du joueur:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de l\'ajout du joueur' 
    }, { status: 500 });
  }
}