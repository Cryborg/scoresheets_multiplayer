import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { offlineStorage } from '@/lib/offline-storage';
import type { OfflineGameSession, OfflinePlayer, OfflineScore } from '@/lib/offline-storage';

interface OfflineSessionData extends OfflineGameSession {
  players: OfflinePlayer[];
  scores: OfflineScore[];
}

export function useOfflineSession(sessionId: string) {
  const router = useRouter();
  const [session, setSession] = useState<OfflineSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Loading offline session

      const sessionData = await offlineStorage.getOfflineSession(sessionId);
      if (!sessionData) {
        // Session not found in IndexedDB

        // Vérifier si cette session existe côté serveur (synchronisée)
        try {
          // Checking server for session
          const response = await fetch(`/api/sessions/${sessionId}`);

          if (response.ok) {
            const serverSession = await response.json();
            // Session found on server

            // Rediriger vers l'ID serveur si c'est une session synchronisée
            if (serverSession.session) {
              const gameSlug = serverSession.session.game_slug;
              const serverId = serverSession.session.id;
              // Redirecting to server session
              router.replace(`/games/${gameSlug}/${serverId}`);
              return;
            }
          }
        } catch (serverError) {
          // Session not found on server either
        }

        setError('Session offline introuvable');
        setIsLoading(false);
        return;
      }

      // Session found

      const players = await offlineStorage.getOfflineSessionPlayers(sessionId);
      const scores = await offlineStorage.getOfflineSessionScores(sessionId);

      // Data loaded

      setSession({
        ...sessionData,
        players,
        scores
      });
    } catch (err) {
      console.error('Erreur lors du chargement de la session offline:', err);
      setError('Erreur lors du chargement de la session offline');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const addPlayer = useCallback(async (playerName: string) => {
    if (!session) return;

    try {
      const position = session.players.length + 1;
      const playerId = await offlineStorage.addOfflinePlayer({
        session_id: sessionId,
        name: playerName,
        position
      });

      // Mettre à jour uniquement le compteur de joueurs
      await offlineStorage.updateOfflineSession(sessionId, {
        current_players: session.current_players + 1
      });

      // Recharger les données
      await loadSession();
      return playerId;
    } catch (err) {
      console.error('Erreur lors de l\'ajout du joueur:', err);
      throw err;
    }
  }, [session, sessionId, loadSession]);

  const addScore = useCallback(async (playerId: string, score: number, details?: Record<string, unknown>, roundNumber?: number) => {
    try {
      await offlineStorage.addOfflineScore({
        session_id: sessionId,
        player_id: playerId,
        score,
        round_number: roundNumber, // Passer le round_number comme champ direct
        details
      });

      // Recharger les données
      await loadSession();
    } catch (err) {
      console.error('Erreur lors de l\'ajout du score:', err);
      throw err;
    }
  }, [sessionId, loadSession]);

  const startGame = useCallback(async () => {
    if (!session) return;

    try {
      await offlineStorage.updateOfflineSession(sessionId, {
        status: 'active'
      });
      await loadSession();
    } catch (err) {
      console.error('Erreur lors du démarrage de la partie:', err);
      throw err;
    }
  }, [session, sessionId, loadSession]);

  const endGame = useCallback(async () => {
    if (!session) return;

    try {
      await offlineStorage.updateOfflineSession(sessionId, {
        status: 'completed',
        ended_at: new Date().toISOString()
      });
      await loadSession();
    } catch (err) {
      console.error('Erreur lors de la fin de la partie:', err);
      throw err;
    }
  }, [session, sessionId, loadSession]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId, loadSession]);

  return {
    session,
    isLoading,
    error,
    addPlayer,
    addScore,
    startGame,
    endGame,
    refresh: loadSession
  };
}

// Helper pour détecter si une session est offline
export function isOfflineSessionId(sessionId: string): boolean {
  return sessionId.startsWith('offline_');
}