import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'last-played-game';

export function useLastPlayedGame() {
  const [lastPlayedGameSlug, setLastPlayedGameSlug] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load last played game from localStorage on mount
  useEffect(() => {
    try {
      const savedSlug = localStorage.getItem(STORAGE_KEY);
      if (savedSlug) {
        setLastPlayedGameSlug(savedSlug);
      }
    } catch (error) {
      console.warn('Error loading last played game from localStorage:', error);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Function to update the last played game
  const setLastPlayedGame = useCallback((gameSlug: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, gameSlug);
      setLastPlayedGameSlug(gameSlug);
    } catch (error) {
      console.warn('Error saving last played game to localStorage:', error);
    }
  }, []);

  // Function to sort games array with last played first
  const sortGamesWithLastPlayedFirst = useCallback(<T extends { slug: string }>(games: T[]): T[] => {
    if (!lastPlayedGameSlug || !initialized) {
      return games;
    }

    const lastPlayedIndex = games.findIndex(game => game.slug === lastPlayedGameSlug);
    
    if (lastPlayedIndex === -1) {
      return games;
    }

    // Move the last played game to the front
    const sortedGames = [...games];
    const [lastPlayedGame] = sortedGames.splice(lastPlayedIndex, 1);
    sortedGames.unshift(lastPlayedGame);
    
    return sortedGames;
  }, [lastPlayedGameSlug, initialized]);

  return {
    lastPlayedGameSlug,
    setLastPlayedGame,
    sortGamesWithLastPlayedFirst,
    initialized
  };
}