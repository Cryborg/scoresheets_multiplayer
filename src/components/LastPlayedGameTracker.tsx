'use client';

import { useEffect } from 'react';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';

interface LastPlayedGameTrackerProps {
  gameSlug: string;
}

/**
 * Component client qui enregistre le jeu courant comme dernier jeu joué
 */
export default function LastPlayedGameTracker({ gameSlug }: LastPlayedGameTrackerProps) {
  const { setLastPlayedGame } = useLastPlayedGame();

  useEffect(() => {
    if (gameSlug) {
      setLastPlayedGame(gameSlug);
    }
  }, [gameSlug, setLastPlayedGame]);

  return null; // Ce composant n'affiche rien, il gère juste l'état
}