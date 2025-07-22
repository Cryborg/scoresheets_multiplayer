import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    await initializeDatabase();
    
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { sessionId, slug } = await params;
    const { scores } = await request.json();

    console.log(`[API] POST /api/games/${slug}/sessions/${sessionId}/rounds`);
    console.log('Scores:', JSON.stringify(scores, null, 2));

    // Verify session exists and get next round number
    const sessionResult = await db.execute({
      sql: `
        SELECT gs.id, gs.current_round, g.slug
        FROM game_sessions gs
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

    const roundNumber = session.current_round;
    console.log(`[API] Adding scores for round ${roundNumber}`);

    // Insert scores for this round
    for (const scoreData of scores) {
      await db.execute({
        sql: `INSERT INTO scores (session_id, player_id, round_number, score, created_by_user_id)
              VALUES (?, ?, ?, ?, ?)`,
        args: [sessionId, scoreData.playerId, roundNumber, scoreData.score, userId]
      });
    }

    // Update current round and last activity
    await db.execute({
      sql: `UPDATE game_sessions 
            SET current_round = current_round + 1, 
                last_activity = CURRENT_TIMESTAMP 
            WHERE id = ?`,
      args: [sessionId]
    });

    console.log(`[API] Round ${roundNumber} completed, advanced to round ${roundNumber + 1}`);

    return NextResponse.json({
      message: 'Manche enregistrée avec succès',
      roundNumber,
      nextRound: roundNumber + 1
    });

  } catch (error) {
    console.error('[API] POST rounds error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}