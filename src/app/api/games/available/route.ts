import { db, ensureDatabaseExists } from '@/lib/database';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiHelpers';
import { getUserId } from '@/lib/authHelper';

export async function GET(request: Request) {
  try {
    await ensureDatabaseExists();

    // Get current user ID to filter custom games
    const userId = await getUserId(request as Request & { cookies?: any });


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
        g.created_by_user_id,
        gc.name as category_name
      FROM games g
      JOIN game_categories gc ON g.category_id = gc.id
      WHERE
        (g.created_by_user_id IS NULL) OR  -- Built-in games
        (g.created_by_user_id = ?)         -- User's custom games
      ORDER BY gc.name, g.name
    `, [userId]);

    return createSuccessResponse({ games: result.rows });
  } catch (error) {
    console.error('API /api/games/available: Error:', error);
    return createErrorResponse(error, { games: [] });
  }
}