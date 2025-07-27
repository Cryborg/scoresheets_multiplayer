import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

interface LeaveSessionParams {
  params: Promise<{ sessionId: string }>;
}

export async function POST(request: NextRequest, context: LeaveSessionParams) {
  try {
    const { sessionId } = await context.params;
    const currentUserId = await getAuthenticatedUserId(request);

    if (!currentUserId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Check if session exists
    const sessionResult = await db.execute({
      sql: 'SELECT id, host_user_id, status FROM sessions WHERE id = ?',
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    // Check if user is in session (simplified check via session_player)
    const playerResult = await db.execute({
      sql: `
        SELECT sp.id, p.user_id 
        FROM session_player sp 
        JOIN players p ON sp.player_id = p.id 
        WHERE sp.session_id = ? AND p.user_id = ? AND sp.left_at IS NULL
      `,
      args: [sessionId, currentUserId]
    });

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vous n\'êtes pas dans cette session' }, { status: 400 });
    }

    // Simple leave: mark as left in session_player
    await db.execute({
      sql: 'UPDATE session_player SET left_at = CURRENT_TIMESTAMP WHERE session_id = ? AND player_id IN (SELECT p.id FROM players p WHERE p.user_id = ?)',
      args: [sessionId, currentUserId]
    });

    // Update session timestamp
    await db.execute({
      sql: 'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sessionId]
    });

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
          user_id: currentUserId,
          left_at: new Date().toISOString()
        })
      ]
    });

    return NextResponse.json({
      message: 'Vous avez quitté la session',
      sessionDeleted: false,
      sessionCompleted: false
    });

  } catch (error) {
    console.error('Erreur lors de la sortie de session:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la sortie de session' 
    }, { status: 500 });
  }
}