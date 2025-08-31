'use client';

import { useEffect } from 'react';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';
import { authenticatedFetch } from '@/lib/authClient';

interface LastPlayedGameTrackerProps {
  gameSlug: string;
}

/**
 * Component client qui enregistre le jeu courant comme dernier jeu joué
 * et tracke l'activité de jeu
 */
export default function LastPlayedGameTracker({ gameSlug }: LastPlayedGameTrackerProps) {
  const { setLastPlayedGame } = useLastPlayedGame();

  useEffect(() => {
    if (gameSlug) {
      setLastPlayedGame(gameSlug);
      
      // Track game activity
      const trackActivity = async () => {
        try {
          await authenticatedFetch('/api/games/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gameSlug }),
          });
        } catch (error) {
          // Don't fail if activity tracking fails
          console.warn('Failed to track game activity:', error);
        }
      };
      
      trackActivity();
    }
  }, [gameSlug, setLastPlayedGame]);

  return null; // Ce composant n'affiche rien, il gère juste l'état
}