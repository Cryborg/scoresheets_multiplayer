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
      sql: 'SELECT user_id FROM players WHERE session_id = ? AND user_id != ? ORDER BY id ASC',
      args: [sessionId, currentUserId]
    });

    const otherPlayers = otherPlayersResult.rows;

    // Commencer une transaction
    await tursoClient.execute('BEGIN TRANSACTION');

    try {
      // Supprimer le joueur de la session
      await tursoClient.execute({
        sql: 'DELETE FROM players WHERE session_id = ? AND user_id = ?',
        args: [sessionId, currentUserId]
      });

      // Si plus personne dans la session, la supprimer complètement
      if (otherPlayers.length === 0) {
        // Supprimer tous les scores
        await tursoClient.execute({
          sql: 'DELETE FROM scores WHERE session_id = ?',
          args: [sessionId]
        });

        // Supprimer tous les événements
        await tursoClient.execute({
          sql: 'DELETE FROM session_events WHERE session_id = ?',
          args: [sessionId]
        });

        // Supprimer la session
        await tursoClient.execute({
          sql: 'DELETE FROM game_sessions WHERE id = ?',
          args: [sessionId]
        });

        await tursoClient.execute('COMMIT');

        return NextResponse.json({
          message: 'Vous avez quitté la session. Session supprimée (plus de joueurs).',
          sessionDeleted: true
        });
      }

      // Si l'utilisateur qui quitte était l'hôte, transférer à quelqu'un d'autre
      if (currentUserId === hostUserId && otherPlayers.length > 0) {
        const newHostUserId = otherPlayers[0].user_id as number;
        
        await tursoClient.execute({
          sql: 'UPDATE game_sessions SET host_user_id = ? WHERE id = ?',
          args: [newHostUserId, sessionId]
        });

        // Créer un événement pour notifier le transfert d'hôte
        await tursoClient.execute({
          sql: `INSERT INTO session_events (session_id, user_id, event_type, event_data, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))`,
          args: [
            sessionId,
            newHostUserId,
            'host_transferred',
            JSON.stringify({
              previous_host: currentUserId,
              new_host: newHostUserId
            })
          ]
        });
      }

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
        message: 'Vous avez quitté la session avec succès.',
        sessionDeleted: false,
        hostTransferred: currentUserId === hostUserId && otherPlayers.length > 0
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