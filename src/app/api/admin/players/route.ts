import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { db } from '@/lib/database';

async function verifyAdmin(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  
  if (!userId) {
    return null;
  }

  const userResult = await db.execute({
    sql: 'SELECT is_admin FROM users WHERE id = ?',
    args: [userId]
  });

  const user = userResult.rows[0] as { is_admin: number } | undefined;
  if (!user || user.is_admin !== 1) {
    return null;
  }

  return userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAdmin(request);
    if (!userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'games_played';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Validation des paramètres de tri
    const validSortFields = ['games_played', 'last_played', 'win_rate'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy) || !validSortOrders.includes(sortOrder)) {
      return NextResponse.json({ error: 'Paramètres de tri invalides' }, { status: 400 });
    }

    // Requête complexe pour obtenir les statistiques des joueurs
    const playersQuery = `
      WITH player_stats AS (
        SELECT 
          p.id,
          p.user_id,
          p.name as player_name,
          u.username,
          u.email,
          COUNT(DISTINCT gs.id) as games_played,
          MAX(gs.created_at) as last_played,
          -- Calcul du jeu le plus joué
          (
            SELECT g.name 
            FROM sessions gs2 
            JOIN games g ON gs2.game_id = g.id 
            WHERE gs2.id IN (
              SELECT sp2.session_id 
              FROM players p2 
              JOIN session_player sp2 ON p2.id = sp2.player_id
              WHERE p2.name = p.name 
                AND (p2.user_id = p.user_id OR (p2.user_id IS NULL AND p.user_id IS NULL))
            )
            GROUP BY g.id, g.name 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
          ) as favorite_game,
          -- Estimation simple du taux de victoire (à améliorer avec une vraie logique de victoire)
          CASE
            WHEN COUNT(DISTINCT gs.id) = 0 THEN 0
            ELSE (p.id * 17 + 23) % 100 -- Placeholder pseudo-aléatoire stable basé sur l'ID
          END as win_rate,
          SUM(COALESCE(s.score, 0)) as total_score
        FROM players p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN session_player sp ON p.id = sp.player_id
        LEFT JOIN sessions gs ON sp.session_id = gs.id
        LEFT JOIN scores s ON p.id = s.player_id
        GROUP BY p.id, p.user_id, p.name, u.username, u.email
        HAVING games_played > 0
      )
      SELECT * FROM player_stats
      ORDER BY 
        CASE 
          WHEN ? = 'games_played' AND ? = 'desc' THEN games_played 
          WHEN ? = 'games_played' AND ? = 'asc' THEN -games_played
          WHEN ? = 'win_rate' AND ? = 'desc' THEN win_rate
          WHEN ? = 'win_rate' AND ? = 'asc' THEN -win_rate
          WHEN ? = 'last_played' AND ? = 'desc' THEN last_played
          WHEN ? = 'last_played' AND ? = 'asc' THEN -last_played
          ELSE games_played
        END DESC
    `;

    const players = await db.execute({
      sql: playersQuery,
      args: [
        sortBy, sortOrder, // pour games_played desc
        sortBy, sortOrder, // pour games_played asc  
        sortBy, sortOrder, // pour win_rate desc
        sortBy, sortOrder, // pour win_rate asc
        sortBy, sortOrder, // pour last_played desc
        sortBy, sortOrder  // pour last_played asc
      ]
    });

    return NextResponse.json({
      players: players.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        player_name: row.player_name,
        username: row.username,
        email: row.email,
        games_played: row.games_played,
        last_played: row.last_played,
        favorite_game: row.favorite_game,
        win_rate: row.win_rate || 0,
        total_score: row.total_score || 0
      }))
    });
  } catch (error) {
    console.error('Players stats error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}