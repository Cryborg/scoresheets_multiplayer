import { db } from '@/lib/database';

/**
 * Utility functions for managing user's player list and autocomplete
 */

/**
 * Add or update a player in user's personal player list for autocomplete
 * This should be called whenever a user creates/joins with a player name
 */
export async function trackUserPlayer(userId: number | string, playerName: string): Promise<void> {
  if (!playerName?.trim()) return;

  const cleanName = playerName.trim();

  try {
    // Use INSERT OR REPLACE to handle duplicates and update counters
    await db.execute({
      sql: `
        INSERT OR REPLACE INTO user_players (user_id, player_name, games_played, last_played, created_at)
        VALUES (?, ?, COALESCE((SELECT games_played FROM user_players WHERE user_id = ? AND player_name = ?), 0) + 1, CURRENT_TIMESTAMP, COALESCE((SELECT created_at FROM user_players WHERE user_id = ? AND player_name = ?), CURRENT_TIMESTAMP))
      `,
      args: [userId, cleanName, userId, cleanName, userId, cleanName]
    });
  } catch (error) {
    console.error('Error tracking user player:', error);
    // Don't throw - this is non-critical functionality
  }
}

/**
 * Get user's frequent players for autocomplete (ordered by frequency and recency)
 */
export async function getUserPlayerSuggestions(userId: number | string): Promise<Array<{
  player_name: string;
  games_played: number;
  last_played: string;
}>> {
  if (!userId) return [];

  try {
    const result = await db.execute({
      sql: `
        SELECT player_name, games_played, last_played
        FROM user_players
        WHERE user_id = ?
        ORDER BY games_played DESC, last_played DESC
        LIMIT 20
      `,
      args: [userId]
    });

    return result.rows.map(row => ({
      player_name: row.player_name as string,
      games_played: row.games_played as number,
      last_played: row.last_played as string,
    }));
  } catch (error) {
    console.error('Error fetching user player suggestions:', error);
    return [];
  }
}

/**
 * Get all user's managed players (for profile management)
 */
export async function getUserManagedPlayers(userId: number | string): Promise<Array<{
  id: number;
  player_name: string;
  games_played: number;
  last_played: string;
  created_at: string;
}>> {
  if (!userId) return [];

  try {
    const result = await db.execute({
      sql: `
        SELECT id, player_name, games_played, last_played, created_at
        FROM user_players
        WHERE user_id = ?
        ORDER BY games_played DESC, last_played DESC
      `,
      args: [userId]
    });

    return result.rows.map(row => ({
      id: row.id as number,
      player_name: row.player_name as string,
      games_played: row.games_played as number,
      last_played: row.last_played as string,
      created_at: row.created_at as string,
    }));
  } catch (error) {
    console.error('Error fetching user managed players:', error);
    return [];
  }
}

/**
 * Add a player manually from user profile
 */
export async function addUserPlayer(userId: number | string, playerName: string): Promise<{ success: boolean; error?: string }> {
  if (!playerName?.trim()) {
    return { success: false, error: 'Le nom du joueur est requis' };
  }

  const cleanName = playerName.trim();

  try {
    await db.execute({
      sql: `INSERT INTO user_players (user_id, player_name, games_played, last_played, created_at) VALUES (?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [userId, cleanName]
    });

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Ce joueur existe déjà dans votre liste' };
    }
    console.error('Error adding user player:', error);
    return { success: false, error: 'Erreur lors de l\'ajout du joueur' };
  }
}

/**
 * Update player name
 */
export async function updateUserPlayer(userId: number | string, playerId: number, newName: string): Promise<{ success: boolean; error?: string }> {
  if (!newName?.trim()) {
    return { success: false, error: 'Le nom du joueur est requis' };
  }

  const cleanName = newName.trim();

  try {
    const result = await db.execute({
      sql: `UPDATE user_players SET player_name = ? WHERE id = ? AND user_id = ?`,
      args: [cleanName, playerId, userId]
    });

    if (result.changes === 0) {
      return { success: false, error: 'Joueur non trouvé ou non autorisé' };
    }

    return { success: true };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('UNIQUE constraint failed')) {
      return { success: false, error: 'Ce nom de joueur existe déjà dans votre liste' };
    }
    console.error('Error updating user player:', error);
    return { success: false, error: 'Erreur lors de la modification' };
  }
}

/**
 * Delete a player from user's list
 */
export async function deleteUserPlayer(userId: number | string, playerId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await db.execute({
      sql: `DELETE FROM user_players WHERE id = ? AND user_id = ?`,
      args: [playerId, userId]
    });

    if (result.changes === 0) {
      return { success: false, error: 'Joueur non trouvé ou non autorisé' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user player:', error);
    return { success: false, error: 'Erreur lors de la suppression' };
  }
}