import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier si l'utilisateur est admin
    const userResult = await db.execute({
      sql: 'SELECT is_admin FROM users WHERE id = ?',
      args: [userId]
    });

    const user = userResult.rows[0] as { is_admin: number } | undefined;
    if (!user || user.is_admin !== 1) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Récupérer les statistiques
    const [usersCount, gamesCount, sessionsCount, activeSessionsCount] = await Promise.all([
      // Total utilisateurs
      db.execute('SELECT COUNT(*) as count FROM users'),
      
      // Total jeux
      db.execute('SELECT COUNT(*) as count FROM games WHERE is_implemented = 1'),
      
      // Total sessions
      db.execute('SELECT COUNT(*) as count FROM game_sessions'),
      
      // Sessions actives
      db.execute("SELECT COUNT(*) as count FROM game_sessions WHERE status IN ('waiting', 'active')")
    ]);

    // Sessions récentes avec détails
    const recentSessions = await db.execute(`
      SELECT 
        gs.id,
        gs.session_name,
        gs.status,
        gs.created_at,
        g.name as game_name,
        COUNT(p.id) as players_count
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      LEFT JOIN players p ON gs.id = p.session_id
      GROUP BY gs.id, gs.session_name, gs.status, gs.created_at, g.name
      ORDER BY gs.created_at DESC
      LIMIT 10
    `);

    const stats = {
      totalUsers: Number((usersCount.rows[0] as { count: bigint | number }).count),
      totalGames: Number((gamesCount.rows[0] as { count: bigint | number }).count),
      totalSessions: Number((sessionsCount.rows[0] as { count: bigint | number }).count),
      activeSessions: Number((activeSessionsCount.rows[0] as { count: bigint | number }).count),
      recentSessions: recentSessions.rows.map(row => ({
        id: row.id,
        game_name: row.game_name,
        session_name: row.session_name,
        status: row.status,
        created_at: row.created_at,
        players_count: row.players_count
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}