import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';
import { 
  ScoreRecord, 
  RoundsScoreData, 
  CategoriesScoreData,
  ScoreData,
  SessionRecord,
  PlayerRecord,
  SessionEventRecord,
  RealtimeAPIResponse 
} from '@/types/realtime';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Get current user ID if authenticated
    const currentUserId = getAuthenticatedUserId(request);

    // Get session with access control in a single optimized query
    const sessionWithAccessResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.name as game_name,
          g.slug as game_slug,
          g.score_type,
          g.team_based,
          g.min_players,
          g.max_players,
          u.username as host_username,
          CASE 
            WHEN gs.host_user_id = ? THEN 'host'
            WHEN p.user_id = ? THEN 'player'
            WHEN gs.status = 'waiting' THEN 'can_join'
            WHEN EXISTS(SELECT 1 FROM players p2 WHERE p2.session_id = gs.id AND p2.user_id IS NULL) AND ? IS NULL THEN 'guest_allowed'
            ELSE 'denied'
          END as access_level
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        JOIN users u ON gs.host_user_id = u.id
        LEFT JOIN players p ON p.session_id = gs.id AND p.user_id = ?
        WHERE gs.id = ?
        GROUP BY gs.id
      `,
      args: [currentUserId, currentUserId, currentUserId, currentUserId, sessionId]
    });

    if (sessionWithAccessResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionWithAccessResult.rows[0] as SessionRecord;
    
    // Check access level
    const accessLevel = String(session.access_level);
    if (accessLevel === 'denied') {
      if (currentUserId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      } else {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    // Get players
    const playersResult = await tursoClient.execute({
      sql: `
        SELECT 
          p.*,
          u.username,
          u.display_name,
          u.is_online
        FROM players p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.session_id = ?
        ORDER BY p.position
      `,
      args: [sessionId]
    });

    // Get scores based on game type
    let scoresData: ScoreData = session.score_type === 'rounds' 
      ? { rounds: [] } 
      : { scores: {} };
    
    if (session.score_type === 'rounds') {
      // Round-based scoring (like Tarot, Belote)
      const scoresResult = await tursoClient.execute({
        sql: `
          SELECT 
            round_number,
            player_id,
            score
          FROM scores 
          WHERE session_id = ?
          ORDER BY round_number, player_id
        `,
        args: [sessionId]
      });

      // Group scores by round
      const roundsMap: { [round: number]: { [playerId: number]: number } } = {};
      
      for (const score of scoresResult.rows) {
        const scoreRecord = score as ScoreRecord;
        const round = Number(scoreRecord.round_number);
        const playerId = Number(scoreRecord.player_id);
        const scoreValue = Number(scoreRecord.score);
        
        if (!roundsMap[round]) {
          roundsMap[round] = {};
        }
        roundsMap[round][playerId] = scoreValue;
      }

      scoresData = {
        rounds: Object.entries(roundsMap).map(([round, scores]) => ({
          round_number: Number(round),
          scores
        }))
      } as RoundsScoreData;

    } else {
      // Category-based scoring (like Yams)
      const scoresResult = await tursoClient.execute({
        sql: `
          SELECT 
            category_id,
            player_id,
            score
          FROM scores 
          WHERE session_id = ?
          ORDER BY category_id, player_id
        `,
        args: [sessionId]
      });

      // Group scores by category
      const categoriesMap: { [categoryId: string]: { [playerId: number]: number } } = {};
      
      for (const score of scoresResult.rows) {
        const scoreRecord = score as ScoreRecord & { category_id: string };
        const categoryId = String(scoreRecord.category_id);
        const playerId = Number(scoreRecord.player_id);
        const scoreValue = Number(scoreRecord.score);
        
        if (!categoriesMap[categoryId]) {
          categoriesMap[categoryId] = {};
        }
        categoriesMap[categoryId][playerId] = scoreValue;
      }

      scoresData = { scores: categoriesMap } as CategoriesScoreData;
    }

    // Get recent events (last 50)
    const eventsResult = await tursoClient.execute({
      sql: `
        SELECT 
          se.*,
          u.username
        FROM session_events se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE se.session_id = ?
        ORDER BY se.created_at DESC
        LIMIT 50
      `,
      args: [sessionId]
    });

    // Update session activity (non-critical, don't fail if it errors)
    try {
      await tursoClient.execute({
        sql: 'UPDATE game_sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = ?',
        args: [sessionId]
      });
    } catch (updateError) {
      console.warn('Failed to update session activity:', updateError);
    }

    // Calculate totals for players
    const players = playersResult.rows.map(player => {
      const playerRecord = player as PlayerRecord;
      const playerId = Number(playerRecord.id);
      let totalScore = 0;

      if (session.score_type === 'rounds' && 'rounds' in scoresData) {
        totalScore = scoresData.rounds.reduce((sum: number, round) => {
          return sum + (round.scores[playerId] || 0);
        }, 0);
      } else if (session.score_type === 'categories' && 'scores' in scoresData) {
        totalScore = Object.values(scoresData.scores).reduce((sum: number, categoryScores) => {
          return sum + (categoryScores[playerId] || 0);
        }, 0);
      }

      return {
        ...playerRecord,
        total_score: totalScore
      };
    });

    const responseData: RealtimeAPIResponse = {
      session: {
        ...session,
        players,
        ...scoresData
      },
      events: eventsResult.rows.map(event => event as SessionEventRecord).reverse(), // Most recent first
      timestamp: new Date().toISOString(),
      currentUserId // Include current user ID for client-side permissions
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Realtime API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}