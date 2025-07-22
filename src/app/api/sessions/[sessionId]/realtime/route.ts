import { NextRequest, NextResponse } from 'next/server';
import { tursoClient } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Get current user ID if authenticated
    const currentUserId = getAuthenticatedUserId(request);

    // Add a small random delay to prevent concurrent access issues
    if (Math.random() < 0.1) {
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // Get session with all related data
    const sessionResult = await tursoClient.execute({
      sql: `
        SELECT 
          gs.*,
          g.name as game_name,
          g.slug as game_slug,
          g.score_type,
          g.team_based,
          g.min_players,
          g.max_players,
          u.username as host_username
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        JOIN users u ON gs.host_user_id = u.id
        WHERE gs.id = ?
      `,
      args: [sessionId]
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionResult.rows[0];
    
    // Check if current user has access to this session
    if (currentUserId) {
      // User is authenticated - check if they are host, player, or if session is still open for joining
      const accessCheckResult = await tursoClient.execute({
        sql: `
          SELECT 1 FROM (
            SELECT host_user_id as user_id FROM game_sessions WHERE id = ?
            UNION
            SELECT user_id FROM players WHERE session_id = ? AND user_id IS NOT NULL
          ) WHERE user_id = ?
        `,
        args: [sessionId, sessionId, currentUserId]
      });
      
      // If user is not host or player, check if session is still joinable (waiting status)
      if (accessCheckResult.rows.length === 0 && session.status !== 'waiting') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // User is not authenticated - only allow access if there are guest players (user_id is null)
      const guestPlayersResult = await tursoClient.execute({
        sql: 'SELECT 1 FROM players WHERE session_id = ? AND user_id IS NULL LIMIT 1',
        args: [sessionId]
      });
      
      if (guestPlayersResult.rows.length === 0) {
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
    let scoresData: any = {};
    
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
        const round = Number(score.round_number);
        const playerId = Number(score.player_id);
        const scoreValue = Number(score.score);
        
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
      };

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
        const categoryId = String(score.category_id);
        const playerId = Number(score.player_id);
        const scoreValue = Number(score.score);
        
        if (!categoriesMap[categoryId]) {
          categoriesMap[categoryId] = {};
        }
        categoriesMap[categoryId][playerId] = scoreValue;
      }

      scoresData = { scores: categoriesMap };
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
      const playerId = Number(player.id);
      let totalScore = 0;

      if (session.score_type === 'rounds' && scoresData.rounds) {
        totalScore = scoresData.rounds.reduce((sum: number, round: any) => {
          return sum + (round.scores[playerId] || 0);
        }, 0);
      } else if (session.score_type === 'categories' && scoresData.scores) {
        totalScore = Object.values(scoresData.scores).reduce((sum: number, categoryScores: any) => {
          return sum + (categoryScores[playerId] || 0);
        }, 0);
      }

      return {
        ...player,
        total_score: totalScore
      };
    });

    const responseData = {
      session: {
        ...session,
        players,
        ...scoresData
      },
      events: eventsResult.rows.reverse(), // Most recent first
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