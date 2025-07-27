import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { tursoClient } from '@/lib/database';

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

    // Vérifier que la session existe
    const sessionResult = await tursoClient.execute({
      sql: 'SELECT id, host_user_id, status FROM game_sessions WHERE id = ?',
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 });
    }

    const session = sessionResult.rows[0];
    const hostUserId = session.host_user_id as number;
    const sessionStatus = session.status as string;

    // Vérifier que l'utilisateur est dans la session
    const playerResult = await tursoClient.execute({
      sql: 'SELECT id FROM players WHERE session_id = ? AND user_id = ?',
      args: [sessionId, currentUserId]
    });

    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Vous n\'êtes pas dans cette session' }, { status: 400 });
    }

    // Ne pas autoriser à quitter une session en cours si c'est le seul joueur
    if (sessionStatus === 'playing') {
      const allPlayersResult = await tursoClient.execute({
        sql: 'SELECT COUNT(*) as count FROM players WHERE session_id = ?',
        args: [sessionId]
      });
      
      const playerCount = allPlayersResult.rows[0].count as number;
      if (playerCount === 1) {
        return NextResponse.json({ 
          error: 'Impossible de quitter : vous êtes le seul joueur dans cette partie en cours' 
        }, { status: 400 });
      }
    }

    // Récupérer tous les autres joueurs pour le transfert d'hôte potentiel
    const otherPlayersResult = await tursoClient.execute({
      sql: 'SELECT user_id FROM players WHERE session_id = ? AND user_id != ? AND user_id IS NOT NULL ORDER BY id ASC',
      args: [sessionId, currentUserId]
    });

    // Compter le nombre total de joueurs (pas d'utilisateurs uniques)
    const totalPlayersResult = await tursoClient.execute({
      sql: 'SELECT COUNT(*) as count FROM players WHERE session_id = ?',
      args: [sessionId]
    });

    const otherPlayers = otherPlayersResult.rows;
    const totalPlayerCount = Number(totalPlayersResult.rows[0].count);

    // Commencer une transaction
    await tursoClient.execute('BEGIN TRANSACTION');

    try {
      // Mark user as having left in session_participants
      await tursoClient.execute({
        sql: 'UPDATE session_participants SET left_at = CURRENT_TIMESTAMP WHERE session_id = ? AND user_id = ? AND left_at IS NULL',
        args: [sessionId, currentUserId]
      });

      // DON'T change session status - let user decide when to end the session

      // NEVER delete sessions, players, scores, or events - preserve game history!

      // Créer un événement pour notifier que quelqu'un a quitté
      await tursoClient.execute({
        sql: `INSERT INTO session_events (session_id, user_id, event_type, event_data, created_at)
              VALUES (?, ?, ?, ?, datetime('now'))`,
        args: [
          sessionId,
          currentUserId,
          'player_left',
          JSON.stringify({
            user_id: currentUserId,
            remaining_players: otherPlayers.length
          })
        ]
      });

      await tursoClient.execute('COMMIT');

      return NextResponse.json({
        message: 'Vous avez quitté la session. La partie reste active.',
        sessionDeleted: false,
        sessionCompleted: false
      });

    } catch (error) {
      await tursoClient.execute('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Erreur lors de la sortie de session:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur lors de la sortie de session' 
    }, { status: 500 });
  }
}