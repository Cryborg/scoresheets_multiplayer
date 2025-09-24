import { db } from './database';
import { errorLogger } from './errorLogger';

export async function trackGameActivity(userId: number, gameSlug: string): Promise<void> {
  try {
    // Utiliser UPSERT pour insérer ou mettre à jour l'activité
    await db.execute({
      sql: `
        INSERT INTO user_game_activity (user_id, game_slug, last_opened_at, times_opened)
        VALUES (?, ?, CURRENT_TIMESTAMP, 1)
        ON CONFLICT(user_id, game_slug) DO UPDATE SET
          last_opened_at = CURRENT_TIMESTAMP,
          times_opened = times_opened + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [userId, gameSlug]
    });
    
    console.log(`✅ Tracked game activity for user ${userId}, game ${gameSlug}`);
  } catch (error) {
    errorLogger.silent('Erreur lors du tracking d\'activité', 'gameActivity', {
      userId,
      gameSlug,
      error: error instanceof Error ? error.message : String(error)
    });
    // Ne pas faire échouer l'application si le tracking échoue
  }
}

export async function getUserGameActivities(userId: number): Promise<Array<{
  game_slug: string;
  last_opened_at: string;
  times_opened: number;
}>> {
  try {
    const result = await db.execute({
      sql: `
        SELECT game_slug, last_opened_at, times_opened
        FROM user_game_activity
        WHERE user_id = ?
        ORDER BY last_opened_at DESC
      `,
      args: [userId]
    });

    return result.rows.map(row => ({
      game_slug: row.game_slug as string,
      last_opened_at: row.last_opened_at as string,
      times_opened: row.times_opened as number
    }));
  } catch (error) {
    errorLogger.silent('Erreur lors de la récupération des activités', 'gameActivity', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}