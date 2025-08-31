import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

// GET - Récupérer les sessions de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer toutes les sessions où l'utilisateur est hôte ou participant
    const sessions = await db.execute({
      sql: `
        SELECT DISTINCT
          s.id,
          s.name as session_name,
          s.status,
          (SELECT COUNT(*) FROM session_player sp WHERE sp.session_id = s.id) as current_players,
          g.max_players,
          s.created_at,
          s.updated_at as last_activity,
          s.ended_at,
          s.host_user_id,
          g.name as game_name,
          g.slug as game_slug,
          CASE WHEN s.host_user_id = ? THEN 1 ELSE 0 END as is_host
        FROM sessions s
        JOIN games g ON s.game_id = g.id
        LEFT JOIN session_player sp ON s.id = sp.session_id
        LEFT JOIN players p ON sp.player_id = p.id
        WHERE s.host_user_id = ? OR p.user_id = ?
        ORDER BY s.updated_at DESC, s.created_at DESC
      `,
      args: [userId, userId, userId]
    });

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
      sessions: sessions.rows.map(row => ({
        id: row.id,
        session_name: row.session_name,
        game_name: row.game_name,
        game_slug: row.game_slug,
        status: row.status,
        current_players: row.current_players,
        max_players: row.max_players,
        created_at: row.created_at,
        last_activity: row.last_activity,
        ended_at: row.ended_at,
        is_host: Boolean(row.is_host),
        players: playersData
          .filter(player => player.session_id === row.id)
          .map(player => player.player_name)
      }))
    });

  } catch (error) {
    console.error('Sessions fetch error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}