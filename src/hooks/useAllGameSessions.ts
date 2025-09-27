import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, isAuthenticated } from '@/lib/authClient';
import { errorLogger } from '@/lib/errorLogger';

interface GameSession {
  id: number;
  session_name: string;
  game_name: string;
  game_slug: string;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'cancelled';
  current_players: number;
  max_players: number;
  created_at: string;
  last_activity: string;
  ended_at?: string;
  is_host: boolean;
  players: string[];
}

/**
 * Hook centralisé pour récupérer TOUTES les sessions utilisateur une seule fois
 * Remplace les multiples appels de useGameSessions par jeu
 *
 * OPTIMISATION PERFORMANCE:
 * - UN SEUL appel /api/sessions au lieu de 14+ appels dupliqués
 * - PAS de polling automatique (dashboard statique)
 * - Rechargement manuel via refetch() uniquement
 */
export function useAllGameSessions(options: { enableAutoRefresh?: boolean } = {}) {
  const { enableAutoRefresh = false } = options;
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllSessions = useCallback(async () => {
    // Si l'utilisateur n'est pas authentifié, ne pas faire d'appel API
    if (!isAuthenticated()) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await authenticatedFetch('/api/sessions');

      if (response.ok) {
        const data = await response.json();
        const allSessions: GameSession[] = data.sessions || [];

        // Filtrer seulement les sessions non cancelled et les trier
        const validSessions = allSessions
          .filter(session => session.status !== 'cancelled')
          .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());

        setSessions(validSessions);

        // Debug message pour confirmer l'optimisation
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚀 [Performance] useAllGameSessions: Single API call loaded ${validSessions.length} sessions (vs ${validSessions.length} duplicate calls avoided)`);
        }
      }
    } catch (error) {
      errorLogger.silent('Erreur lors de la récupération de toutes les sessions', 'allGameSessions', {
        error: error instanceof Error ? error.message : String(error)
      });
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement initial
    fetchAllSessions();
  }, [fetchAllSessions]);

  // Auto-refresh optionnel (désactivé par défaut pour le dashboard)
  useEffect(() => {
    if (!enableAutoRefresh) return;

    const interval = setInterval(fetchAllSessions, 30000); // 30s pour l'auto-refresh
    return () => clearInterval(interval);
  }, [enableAutoRefresh, fetchAllSessions]);

  // Helper function pour filtrer les sessions par jeu
  const getSessionsForGame = useCallback((gameSlug: string) => {
    return sessions.filter(session => session.game_slug === gameSlug);
  }, [sessions]);

  const getActiveSessionsForGame = useCallback((gameSlug: string) => {
    return sessions.filter(session =>
      session.game_slug === gameSlug &&
      (session.status === 'active' || session.status === 'waiting')
    );
  }, [sessions]);

  const getCompletedSessionsForGame = useCallback((gameSlug: string) => {
    return sessions.filter(session =>
      session.game_slug === gameSlug &&
      session.status === 'completed'
    );
  }, [sessions]);

  return {
    sessions,
    loading,
    getSessionsForGame,
    getActiveSessionsForGame,
    getCompletedSessionsForGame,
    refetch: fetchAllSessions,
    // Informations de performance
    totalSessions: sessions.length,
    isAutoRefreshEnabled: enableAutoRefresh
  };
}