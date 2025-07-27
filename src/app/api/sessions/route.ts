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
    // Version simplifiée pour la nouvelle architecture Laravel
    const sessions = await db.execute({
      sql: `
        SELECT DISTINCT
          s.id,
          s.session_name,
          s.status,
          s.current_players,
          g.max_players,
          s.created_at,
          s.updated_at as last_activity,
          s.host_user_id,
          g.name as game_name,
          g.slug as game_slug,
          CASE WHEN s.host_user_id = ? THEN 1 ELSE 0 END as is_host
        FROM game_sessions s
        JOIN games g ON s.game_id = g.id
        WHERE s.host_user_id = ?
        ORDER BY s.updated_at DESC, s.created_at DESC
      `,
      args: [userId, userId]
    });

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
        is_host: Boolean(row.is_host)
      }))
    });

  } catch (error) {
    console.error('Sessions fetch error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}