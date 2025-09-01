import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { getUserId } from '@/lib/authHelper';
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
    
    // Everyone gets an ID (authenticated or guest)
    const currentUserId = await getUserId(request);

    // Get session with simplified query for new architecture
    const sessionWithAccessResult = await db.execute({
      sql: `
        SELECT 
          s.*,
          g.name as game_name,
          g.slug as game_slug,
          g.score_type,
          g.score_direction as game_score_direction,
          g.team_based,
          g.min_players,
          g.max_players,
          u.username as host_username,
          CASE 
            WHEN s.host_user_id = ? THEN 'host'
            WHEN s.status = 'waiting' THEN 'can_join'
            ELSE 'denied'
          END as access_level
        FROM sessions s
        JOIN games g ON s.game_id = g.id
        JOIN users u ON s.host_user_id = u.id
        WHERE s.id = ?
      `,
      args: [currentUserId, sessionId]
    });

    if (sessionWithAccessResult.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionWithAccessResult.rows[0] as SessionRecord;
    
    // Check if this is a local session for access control
    const allUsersInSessionResult = await db.execute({
      sql: `SELECT DISTINCT p.user_id 
            FROM players p 
            JOIN session_player sp ON p.id = sp.player_id 
            WHERE sp.session_id = ? AND p.user_id IS NOT NULL`,
      args: [sessionId]
    });
    
    const isLocalSession = allUsersInSessionResult.rows.length <= 1;
    let accessLevel = String(session.access_level);
    
    // For local sessions, allow access if user is the owner
    if (isLocalSession && currentUserId && Number(session.host_user_id) === currentUserId) {
      accessLevel = 'host';
    }
    
    // Check access level - simplified since everyone has an ID now
    if (accessLevel === 'denied') {
      // For sessions in waiting status, allow anyone to view (they can join)
      if (session.status === 'waiting') {
        accessLevel = 'can_join';
      } else {
        // Allow read-only access for non-participants to existing sessions
        accessLevel = 'viewer';
      }
    }

    // Get players - simplified for empty sessions
    const playersResult = await db.execute({
      sql: `
        SELECT 
          p.id,
          p.name as player_name,
          p.user_id,
          u.username,
          u.display_name,
          u.is_online,
          sp.position,
          sp.is_ready,
          sp.joined_at,
          sp.left_at,
          NULL as team_name,
          NULL as team_id
        FROM session_player sp
        JOIN players p ON sp.player_id = p.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE sp.session_id = ? AND sp.left_at IS NULL
        ORDER BY sp.position
      `,
      args: [sessionId]
    });

    // Get teams - simplified, return empty for now
    const teamsResult = { rows: [] };

    const rawPlayers = playersResult.rows as PlayerRecord[];
    const rawTeams = teamsResult.rows as { id: number; team_name: string }[];

    // Group players by team
    const teamsMap = new Map<number, TeamRecord>();
    rawTeams.forEach(team => {
      teamsMap.set(team.id, { id: team.id, team_name: team.team_name, players: [] });
    });

    // Get scores based on game type
    let scoresData: ScoreData = session.score_type === 'rounds' 
      ? { rounds: [] } 
      : { scores: {} };
    
    if (session.score_type === 'rounds') {
      // Round-based scoring (like Tarot, Belote)
      const scoresResult = await db.execute({
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
      const scoresResult = await db.execute({
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
    const eventsResult = await db.execute({
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
      await db.execute({
        sql: 'UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [sessionId]
      });
    } catch (updateError) {
      console.warn('Failed to update session activity:', updateError);
    }

    // Calculate totals for players and group them by team
    const players = rawPlayers.map(player => {
      const playerId = Number(player.id);
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

      const playerWithScore = {
        ...player,
        total_score: totalScore,
        is_connected: 1, // Default all players to connected for now
        is_ready: 1 // Default all players to ready for simplicity
      };

      if (player.team_id && teamsMap.has(player.team_id)) {
        teamsMap.get(player.team_id)?.players.push(playerWithScore);
      }
      return playerWithScore;
    });

    const teams = Array.from(teamsMap.values());

    const responseData: RealtimeAPIResponse = {
      session: {
        ...session,
        game: {
          name: session.game_name,
          slug: session.game_slug,
          score_type: session.score_type,
          score_direction: session.game_score_direction,
          team_based: session.team_based,
          min_players: session.min_players,
          max_players: session.max_players,
        },
        players,
        teams, // Include teams in the session object
        current_players: players.length, // Add current player count
        ...scoresData
      },
      events: eventsResult.rows.map(event => event as SessionEventRecord).reverse(), // Most recent first
      timestamp: new Date().toISOString(),
      currentUserId, // Include current user ID for client-side permissions
      isLocalSession // Include flag to indicate if this is a local solo session
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