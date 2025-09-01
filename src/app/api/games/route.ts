import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await initializeDatabase();
    
    // Récupérer l'utilisateur authentifié
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId) {
      // Si pas d'utilisateur, retourner liste vide (aucun jeu ne s'affiche de base)
      return NextResponse.json({ games: [] });
    }

    // Récupérer seulement les jeux que l'utilisateur a ouverts au moins une fois
    const result = await db.execute({
      sql: `
        SELECT 
          g.id,
          g.name,
          g.slug,
          g.rules,
          g.is_implemented,
          g.score_type,
          g.team_based,
          g.min_players,
          g.max_players,
          g.score_direction,
          gc.name as category_name,
          uga.last_opened_at,
          uga.times_opened
        FROM games g
        JOIN game_categories gc ON g.category_id = gc.id
        INNER JOIN user_game_activity uga ON g.slug = uga.game_slug
        WHERE uga.user_id = ?
        ORDER BY uga.last_opened_at DESC
      `,
      args: [userId]
    });

    const games = result.rows;

    return NextResponse.json({ games });
  } catch (error) {
    console.error('API /api/games: Error fetching games:', error);
    console.error('API /api/games: Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}