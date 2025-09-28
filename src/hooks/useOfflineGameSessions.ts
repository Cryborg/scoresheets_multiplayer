import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch, isAuthenticated } from '@/lib/authClient';
import { errorLogger } from '@/lib/errorLogger';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { offlineStorage, OfflineGameSession } from '@/lib/offline-storage';

interface GameSession {
  id: number | string; // number pour serveur, string pour offline
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
  offline_mode?: boolean; // Indique si la session est créée hors ligne
  sync_status?: 'pending' | 'synced' | 'conflict' | 'failed';
}

/**
 * Hook amélioré pour gérer sessions online ET offline
 * Mode offline-first : fonctionne sans connexion
 */
export function useOfflineGameSessions(options: { enableAutoRefresh?: boolean } = {}) {
  const { enableAutoRefresh = false } = options;
  const { isOnline } = useNetworkStatus();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Fusion des sessions online et offline
  const mergeSessions = useCallback((onlineSessions: GameSession[], offlineSessions: OfflineGameSession[]): GameSession[] => {
    const merged: GameSession[] = [];

    // Ajoute les sessions online
    onlineSessions.forEach(session => {
      merged.push({
        ...session,
        offline_mode: false
      });
    });

    // Ajoute les sessions offline (non encore synchronisées)
    // Exclure les sessions qui ont été synchronisées pour éviter les doublons
    offlineSessions.forEach(offlineSession => {
      // Vérifier s'il y a un doublon basé sur le nom et les joueurs
      const hasDuplicate = onlineSessions.some(onlineSession =>
        onlineSession.session_name === offlineSession.session_name &&
        onlineSession.game_slug === offlineSession.game_slug &&
        JSON.stringify(onlineSession.players.sort()) === JSON.stringify(offlineSession.players.sort())
      );

      // Afficher les sessions offline si :
      // 1. Elles sont en attente de synchronisation (pending)
      // 2. Elles sont synchronisées MAIS pas encore récupérées comme session online (pas de doublon)
      // 3. PAS si elles ont un server_id ET qu'il y a un doublon (éviter les vrais doublons)
      const hasServerIdAndDuplicate = offlineSession.server_id && hasDuplicate;
      const shouldShowOfflineSession = !hasServerIdAndDuplicate &&
        (offlineSession.sync_status === 'pending' || offlineSession.sync_status === 'synced');

      if (shouldShowOfflineSession) {
        merged.push({
          id: offlineSession.id,
          session_name: offlineSession.session_name,
          game_name: offlineSession.game_name,
          game_slug: offlineSession.game_slug,
          status: offlineSession.status,
          current_players: offlineSession.current_players,
          max_players: offlineSession.max_players,
          created_at: offlineSession.created_at,
          last_activity: offlineSession.last_activity,
          ended_at: offlineSession.ended_at,
          is_host: offlineSession.is_host,
          players: offlineSession.players,
          offline_mode: true,
          sync_status: offlineSession.sync_status
        });
      }
    });

    // Trie par activité récente
    return merged.sort((a, b) =>
      new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
    );
  }, []);

  const fetchAllSessions = useCallback(async () => {
    setLoading(true);

    try {
      let onlineSessions: GameSession[] = [];
      let offlineSessions: OfflineGameSession[] = [];

      // Récupère toujours les sessions offline
      offlineSessions = await offlineStorage.getAllOfflineSessions();

      // Récupère les sessions online si connecté
      if (isOnline && isAuthenticated()) {
        try {
          const response = await authenticatedFetch('/api/sessions');
          if (response.ok) {
            const data = await response.json();
            onlineSessions = data.sessions || [];

            // Cache les sessions online pour utilisation hors ligne
            onlineSessions.forEach(session => {
              if (session.status !== 'cancelled') {
                offlineStorage.setCache(
                  `/api/sessions/${session.id}`,
                  'GET',
                  session,
                  600000 // 10 minutes TTL
                );
              }
            });
          }
        } catch {
          console.log('Failed to fetch online sessions, using offline data only');
        }
      }

      // Fusionne et filtre
      const allSessions = mergeSessions(onlineSessions, offlineSessions);
      const validSessions = allSessions.filter(session => session.status !== 'cancelled');

      setSessions(validSessions);

      if (process.env.NODE_ENV === 'development') {
        // Sessions loaded
      }

    } catch (error) {
      errorLogger.silent('Erreur lors de la récupération de toutes les sessions', 'offlineGameSessions', {
        error: error instanceof Error ? error.message : String(error),
        isOnline
      });

      // En cas d'erreur, charge au moins les sessions offline
      try {
        const offlineSessions = await offlineStorage.getAllOfflineSessions();
        const validSessions = offlineSessions
          .filter(session => session.status !== 'cancelled')
          .map(session => ({
            id: session.id,
            session_name: session.session_name,
            game_name: session.game_name,
            game_slug: session.game_slug,
            status: session.status,
            current_players: session.current_players,
            max_players: session.max_players,
            created_at: session.created_at,
            last_activity: session.last_activity,
            ended_at: session.ended_at,
            is_host: session.is_host,
            players: session.players,
            offline_mode: true,
            sync_status: session.sync_status
          }));

        setSessions(validSessions);
      } catch {
        setSessions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, mergeSessions]);

  useEffect(() => {
    fetchAllSessions();
  }, [fetchAllSessions]);

  // Auto-refresh optionnel avec adaptation au statut réseau
  useEffect(() => {
    if (!enableAutoRefresh) return;

    // Interval plus long hors ligne pour économiser la batterie
    const interval = setInterval(fetchAllSessions, isOnline ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [enableAutoRefresh, fetchAllSessions, isOnline]);

  // Helper functions pour filtrer par jeu
  const getSessionsForGame = useCallback((gameSlug: string) => {
    return sessions.filter(session => session.game_slug === gameSlug);
  }, [sessions]);

  const getActiveSessionsForGame = useCallback((gameSlug: string) => {
    const filtered = sessions.filter(session =>
      session.game_slug === gameSlug &&
      (session.status === 'active' || session.status === 'waiting')
    );


    return filtered;
  }, [sessions]);

  const getCompletedSessionsForGame = useCallback((gameSlug: string) => {
    return sessions.filter(session =>
      session.game_slug === gameSlug &&
      session.status === 'completed'
    );
  }, [sessions]);

  // Fonctions de création de sessions offline
  const createOfflineSession = useCallback(async (sessionData: {
    session_name: string;
    game_slug: string;
    game_name: string;
    players: string[];
    team_based: boolean;
  }) => {
    try {
      const sessionId = await offlineStorage.createOfflineSession({
        session_name: sessionData.session_name,
        game_name: sessionData.game_name,
        game_slug: sessionData.game_slug,
        status: 'active', // Offline = tous les joueurs sont déjà saisis, on démarre directement
        current_players: sessionData.players.length,
        max_players: sessionData.players.length, // Offline = tous les joueurs saisis
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        is_host: true,
        players: sessionData.players,
        team_based: sessionData.team_based
      });

      // Créer les objets OfflinePlayer pour chaque joueur
      for (let i = 0; i < sessionData.players.length; i++) {
        await offlineStorage.addOfflinePlayer({
          session_id: sessionId,
          name: sessionData.players[i],
          position: i + 1
        });
      }

      // Queue action de création pour synchronisation future
      await offlineStorage.queueAction({
        type: 'create_session',
        session_id: sessionId,
        data: sessionData,
        priority: 1,
        max_retries: 3
      });

      // Recharge les sessions
      await fetchAllSessions();

      return sessionId;
    } catch (error) {
      console.error('Error creating offline session:', error);
      throw error;
    }
  }, [fetchAllSessions]);

  return {
    sessions,
    loading,
    getSessionsForGame,
    getActiveSessionsForGame,
    getCompletedSessionsForGame,
    refetch: fetchAllSessions,
    createOfflineSession,

    // Informations de performance et statut
    totalSessions: sessions.length,
    offlineSessions: sessions.filter(s => s.offline_mode).length,
    onlineSessions: sessions.filter(s => !s.offline_mode).length,
    isAutoRefreshEnabled: enableAutoRefresh,
    isOfflineMode: !isOnline
  };
}