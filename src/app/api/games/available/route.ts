import { db, ensureDatabaseExists } from '@/lib/database';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiHelpers';

export async function GET() {
  try {
    await ensureDatabaseExists();
    
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

    return createSuccessResponse({ games: result.rows });
  } catch (error) {
    console.error('API /api/games/available: Error:', error);
    return createErrorResponse(error, { games: [] });
  }
}