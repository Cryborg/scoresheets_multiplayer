import { NextRequest } from 'next/server';
import { db, ensureDatabaseExists } from '@/lib/database';
import { getAuthenticatedUserId } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/lib/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    await ensureDatabaseExists();
    
    const userId = await getAuthenticatedUserId(request);
    
    if (!userId) {
      return createSuccessResponse({ games: [] });
    }

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

    return createSuccessResponse({ games: result.rows });
  } catch (error) {
    console.error('API /api/games: Error:', error);
    return createErrorResponse(error, { games: [] });
  }
}