'use client';

import { useEffect } from 'react';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';
import { authenticatedFetch } from '@/lib/authClient';
import { getGuestId } from '@/lib/guestAuth';

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
      
      // Track game activity (pour tous les utilisateurs - connectés ou guests)
      const trackActivity = async () => {
        try {
          await authenticatedFetch('/api/games/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gameSlug, guestId: getGuestId() }),
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