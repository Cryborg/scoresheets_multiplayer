import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; sessionId: string }> }
) {
  try {
    await initializeDatabase();
    
    const { slug, sessionId } = await params;
    console.log(`[API] GET /api/games/${slug}/sessions/${sessionId}`);

    // Get session with game info
    const sessionResult = await db.execute({
      sql: `
        SELECT gs.*, g.name as game_name, g.slug as game_slug, g.score_type, g.team_based
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

    // Get players
    const playersResult = await db.execute({
      sql: 'SELECT * FROM players WHERE session_id = ? ORDER BY position',
      args: [sessionId]
    });

    const players = playersResult.rows.map(row => ({
      id: row.id,
      player_name: row.player_name,
      position: row.position,
      team_id: row.team_id,
      is_ready: row.is_ready,
      is_connected: row.is_connected
    }));

    // Get scores based on game type
    let scores = {};
    let rounds: any[] = [];

    if (session.score_type === 'categories') {
      // For games like Yams - scores by category
      const scoresResult = await db.execute({
        sql: 'SELECT * FROM scores WHERE session_id = ? ORDER BY player_id, category_id',
        args: [sessionId]
      });

      // Group scores by category_id, then by player_id
      scoresResult.rows.forEach((score: any) => {
        if (!scores[score.category_id]) {
          scores[score.category_id] = {};
        }
        scores[score.category_id][score.player_id] = score.score;
      });
    } else {
      // For games like Tarot - scores by round
      const roundsResult = await db.execute({
        sql: `
          SELECT round_number, player_id, score 
          FROM scores 
          WHERE session_id = ? 
          ORDER BY round_number, player_id
        `,
        args: [sessionId]
      });

      // Group by round_number
      const roundsMap = new Map();
      roundsResult.rows.forEach((score: any) => {
        if (!roundsMap.has(score.round_number)) {
          roundsMap.set(score.round_number, {
            round_number: score.round_number,
            scores: {}
          });
        }
        roundsMap.get(score.round_number).scores[score.player_id] = score.score;
      });

      rounds = Array.from(roundsMap.values());
    }

    const responseData = {
      session: {
        id: session.id,
        name: session.name,
        session_code: session.session_code,
        game_name: session.game_name,
        game_slug: session.game_slug,
        status: session.status,
        current_round: session.current_round,
        has_score_target: session.has_score_target,
        score_target: session.score_target,
        finish_current_round: session.finish_current_round,
        score_type: session.score_type,
        team_based: session.team_based,
        created_at: session.created_at,
        players,
        scores,
        rounds
      }
    };

    console.log(`[API] Session data:`, JSON.stringify(responseData, null, 2));
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[API] GET session error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}