import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabaseExists } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseExists();
    
    // Récupérer l'utilisateur authentifié
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId) {
      // Si pas d'utilisateur, retourner liste vide (aucun jeu ne s'affiche de base)
      const response = NextResponse.json({ games: [] });
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache'); 
      response.headers.set('Expires', '0');
      return response;
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

    const response = NextResponse.json({ games });
    
    // Désactiver le cache pour éviter les problèmes de synchronisation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('API /api/games: Error fetching games:', error);
    console.error('API /api/games: Error details:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}