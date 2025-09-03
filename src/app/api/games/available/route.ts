import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDatabaseExists } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔧 [API] /api/games/available called');
    await ensureDatabaseExists();
    
    // Récupérer tous les jeux disponibles (comme l'ancienne API /api/games)
    console.log('🔧 [API] /api/games/available executing query...');
    const result = await db.execute(`
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
        gc.name as category_name
      FROM games g
      JOIN game_categories gc ON g.category_id = gc.id
      ORDER BY gc.name, g.name
    `);

    const games = result.rows;
    console.log('🔧 [API] /api/games/available returning', games.length, 'games');

    const response = NextResponse.json({ games });
    
    // Désactiver le cache pour éviter les problèmes de synchronisation
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error) {
    console.error('🔧 [API] /api/games/available: Error fetching games:', error);
    console.error('🔧 [API] /api/games/available: Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    const response = NextResponse.json({ 
      games: [], // Fallback pour éviter les undefined
      error: 'Erreur serveur', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
    
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  }
}