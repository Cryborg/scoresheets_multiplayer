import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const currentUserId = getAuthenticatedUserId(request);
    
    if (!currentUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get session details
    const sessionResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.min_players,
          g.max_players,
          (SELECT COUNT(*) FROM players WHERE session_id = gs.id AND is_connected = 1) as connected_players
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        WHERE gs.id = ?
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0];

    // Check if user is the host
    if (session.host_user_id !== currentUserId) {
      return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
    }

    // Check if session is in waiting status
    if (session.status !== 'waiting') {
      return NextResponse.json({ error: 'Game has already started or ended' }, { status: 400 });
    }

    // Check minimum players requirement
    const connectedPlayers = Number(session.connected_players);
    const minPlayers = Number(session.min_players);

    if (connectedPlayers < minPlayers) {
      return NextResponse.json({ 
        error: `Il faut au moins ${minPlayers} joueur${minPlayers > 1 ? 's' : ''} pour commencer (${connectedPlayers} connecté${connectedPlayers > 1 ? 's' : ''})` 
      }, { status: 400 });
    }

    // Start the game by updating status to 'active'
    await tursoClient.execute({
      sql: 'UPDATE game_sessions SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: ['active', sessionId]
    });

    // Log the event
    await tursoClient.execute({
      sql: `
        INSERT INTO session_events (session_id, user_id, event_type, event_data)
        VALUES (?, ?, 'game_started', ?)
      `,
      args: [
        sessionId,
        currentUserId,
        JSON.stringify({ 
          connectedPlayers,
          startedAt: new Date().toISOString()
        })
      ]
    });

    return NextResponse.json({
      success: true,
      message: 'Game started successfully',
      status: 'active'
    });

  } catch (error) {
    console.error('Start game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}