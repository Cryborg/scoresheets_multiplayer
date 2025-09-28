/**
 * Game Data Processing Helpers
 */

import { loadMultipleGameMetadata, defaultGameMetadata } from '@/lib/gameMetadata';
import { Game, GamesAPIResponse } from '@/types/dashboard';

/**
 * Validate API response and return games array
 */
export function validateGamesResponse(data: unknown): unknown[] | null {
  if (!data || typeof data !== 'object' || !('games' in data)) {
    return null;
  }
  
  const games = (data as GamesAPIResponse).games;
  if (!Array.isArray(games)) {
    return null;
  }
  
  return games;
}

/**
 * Process raw games data into formatted games with metadata
 */
export async function processGamesWithMetadata(rawGames: unknown[]): Promise<Game[]> {
  // Filter out "jeu-libre" from the games list
  const filteredGames = rawGames.filter((game: Record<string, unknown>) => game.slug !== 'jeu-libre');

  const slugs = filteredGames.map((game: Record<string, unknown>) => game.slug as string);
  const metadataMap = await loadMultipleGameMetadata(slugs);

  return filteredGames.map((game: Record<string, unknown>) => {
    const metadata = metadataMap[game.slug] || defaultGameMetadata;
    return {
      id: game.id,
      name: game.name,
      slug: game.slug,
      category_name: game.category_name,
      rules: metadata.shortDescription,
      min_players: game.min_players,
      max_players: game.max_players,
      duration: metadata.duration,
      icon: metadata.icon,
      is_implemented: game.is_implemented,
      difficulty: metadata.difficulty,
      variant: metadata.variant,
      multiplayer: metadata.multiplayer,
      last_opened_at: game.last_opened_at,
      times_opened: game.times_opened
    };
  });
}