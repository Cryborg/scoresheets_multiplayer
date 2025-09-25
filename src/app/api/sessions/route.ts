import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/authHelper';
import { db } from '@/lib/database';

// GET - Récupérer les sessions de l'utilisateur
export async function GET(request: NextRequest) {
  let userId: number | undefined;
  try {
    // Everyone gets an ID (authenticated or guest)
    userId = await getUserId(request);

    // Récupérer les sessions où l'utilisateur est hôte
    const hostSessions = await db.execute({
      sql: `
        SELECT
          s.id,
          s.name as session_name,
          s.status,
          s.created_at,
          s.updated_at as last_activity,
          s.ended_at,
          s.host_user_id,
          g.name as game_name,
          g.slug as game_slug,
          g.max_players,
          1 as is_host
        FROM sessions s
        JOIN games g ON s.game_id = g.id
        WHERE s.host_user_id = ?
        ORDER BY s.updated_at DESC, s.created_at DESC
      `,
      args: [userId]
    });

    const sessions = { rows: hostSessions.rows };

    // Récupérer les joueurs pour chaque session
    const sessionIds = sessions.rows.map(row => row.id);
    let playersData = [];
    
    if (sessionIds.length > 0) {
      const placeholders = sessionIds.map(() => '?').join(',');
      const playersResult = await db.execute({
        sql: `
          SELECT 
            sp.session_id,
            p.name as player_name
          FROM session_player sp
          JOIN players p ON sp.player_id = p.id
          WHERE sp.session_id IN (${placeholders})
          ORDER BY sp.position
        `,
        args: sessionIds
      });
      playersData = playersResult.rows;
    }

    return NextResponse.json({
      sessions: sessions.rows.map(row => {
        const sessionPlayers = playersData.filter(player => player.session_id === row.id);
        return {
          id: row.id,
          session_name: row.session_name,
          game_name: row.game_name,
          game_slug: row.game_slug,
          status: row.status,
          current_players: sessionPlayers.length,
          max_players: row.max_players,
          created_at: row.created_at,
          last_activity: row.last_activity,
          ended_at: row.ended_at,
          is_host: Boolean(row.is_host),
          players: sessionPlayers.map(player => player.player_name)
        };
      })
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur serveur lors de la récupération des sessions',
        details: error instanceof Error ? error.message : String(error),
        userId: userId || null,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}