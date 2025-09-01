import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getUserId } from '@/lib/authHelper';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string; roundNumber: string }> }
) {
  try {
    await initializeDatabase();
    
    const userId = await getUserId(request);
    const { sessionId, slug, roundNumber } = await params;

    logger.api(`DELETE /api/games/${slug}/sessions/${sessionId}/rounds/${roundNumber}`);

    // Verify session exists and user has permissions
    const sessionResult = await db.execute({
      sql: `
        SELECT gs.id, gs.current_round, gs.host_user_id, g.slug
        FROM sessions gs
        JOIN games g ON gs.game_id = g.id  
        WHERE gs.id = ? AND g.slug = ?
      `,
      args: [sessionId, slug]
    });

    const session = sessionResult.rows[0];
    if (!session) {
      return NextResponse.json(
        { error: 'Session non trouvée' },
        { status: 404 }
      );
    }

    // Check if user is host
    const isHost = Number(session.host_user_id) === Number(userId);
    if (!isHost) {
      return NextResponse.json(
        { error: 'Seul l\'hôte peut supprimer une manche' },
        { status: 403 }
      );
    }

    const roundNum = parseInt(roundNumber);
    const currentRound = Number(session.current_round);
    
    // current_round est le numéro de la prochaine manche à jouer
    // donc la dernière manche jouée est current_round - 1
    const lastPlayedRound = currentRound - 1;

    // Verify we're deleting the last round only
    if (roundNum !== lastPlayedRound) {
      return NextResponse.json(
        { error: 'Vous ne pouvez supprimer que la dernière manche' },
        { status: 400 }
      );
    }

    // Start transaction-like operations
    try {
      // Delete scores for this round
      await db.execute({
        sql: 'DELETE FROM scores WHERE session_id = ? AND round_number = ?',
        args: [sessionId, roundNum]
      });

      // Decrement current_round in session
      await db.execute({
        sql: 'UPDATE sessions SET current_round = current_round - 1 WHERE id = ?',
        args: [sessionId]
      });

      // Add event log
      await db.execute({
        sql: `INSERT INTO session_events (session_id, event_type, event_data, user_id)
              VALUES (?, 'round_deleted', ?, ?)`,
        args: [
          sessionId, 
          JSON.stringify({ round_number: roundNum }), 
          userId
        ]
      });

      logger.log(`Round ${roundNum} deleted from session ${sessionId} by user ${userId}`);

      return NextResponse.json({ 
        success: true, 
        message: 'Manche supprimée avec succès'
      });

    } catch (error) {
      logger.error('Error deleting round:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de la manche' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error in DELETE round:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}