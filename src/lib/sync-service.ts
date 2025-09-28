import { offlineStorage, OfflineAction } from './offline-storage';
import { authenticatedFetch } from '@/lib/authClient';

/**
 * Service de synchronisation en arrière-plan
 * Synchronise les actions offline avec le serveur
 */
type SyncEventCallback = (syncedCount: number) => void;
type SyncFailureCallback = (failedCount: number) => void;

export class SyncService {
  private isRunning = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private successCallbacks: Set<SyncEventCallback> = new Set();
  private failureCallbacks: Set<SyncFailureCallback> = new Set();

  /**
   * Ajoute des callbacks de synchronisation
   */
  addEventListener(
    onSuccess?: SyncEventCallback,
    onFailure?: SyncFailureCallback
  ): () => void {
    if (onSuccess) this.successCallbacks.add(onSuccess);
    if (onFailure) this.failureCallbacks.add(onFailure);

    // Retourne une fonction de nettoyage
    return () => {
      if (onSuccess) this.successCallbacks.delete(onSuccess);
      if (onFailure) this.failureCallbacks.delete(onFailure);
    };
  }

  /**
   * Démarre la synchronisation périodique
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🔄 Sync Service: Started');

    // Synchronisation immédiate
    await this.syncPendingActions();

    // Synchronisation périodique (toutes les 30 secondes)
    this.scheduleNextSync(30000);
  }

  /**
   * Arrête la synchronisation
   */
  stop(): void {
    this.isRunning = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    console.log('⏹️ Sync Service: Stopped');
  }

  /**
   * Force une synchronisation immédiate
   */
  async forcSync(): Promise<void> {
    await this.syncPendingActions();
  }

  /**
   * Synchronise toutes les actions en attente
   */
  private async syncPendingActions(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Vérifier qu'on est toujours online avant de tenter une sync
    if (!navigator.onLine) {
      this.stop();
      return;
    }

    try {
      const pendingActions = await offlineStorage.getPendingActions();

      if (pendingActions.length === 0) {
        this.scheduleNextSync(30000); // 30s si rien à sync
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const action of pendingActions) {
        try {
          const success = await this.syncAction(action);
          if (success) {
            syncedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error('Sync action failed:', error);
          await offlineStorage.markActionAsFailed(
            action.id,
            error instanceof Error ? error.message : 'Unknown error'
          );
          failedCount++;
        }
      }

      // Notifications aux callbacks
      if (syncedCount > 0) {
        this.successCallbacks.forEach(callback => callback(syncedCount));
      }
      if (failedCount > 0) {
        this.failureCallbacks.forEach(callback => callback(failedCount));
      }

      // Planifie la prochaine sync (plus fréquente s'il y a des échecs)
      this.scheduleNextSync(failedCount > 0 ? 10000 : 30000);

    } catch (error) {
      console.error('Sync service error:', error);
      this.scheduleNextSync(60000); // Retry dans 1 minute en cas d'erreur
    }
  }

  /**
   * Synchronise une action spécifique
   */
  private async syncAction(action: OfflineAction): Promise<boolean> {
    // Double check online status before each action
    if (!navigator.onLine) {
      return false;
    }

    switch (action.type) {
      case 'create_session':
        return await this.syncCreateSession(action);

      case 'join_session':
        return await this.syncJoinSession(action);

      case 'add_score':
        return await this.syncAddScore(action);

      case 'update_session':
        return await this.syncUpdateSession(action);

      default:
        console.warn('Unknown action type:', action.type);
        return false;
    }
  }

  /**
   * Synchronise création de session
   */
  private async syncCreateSession(action: OfflineAction): Promise<boolean> {
    try {
      const { session_name, game_slug, players, team_based } = action.data;

      const response = await authenticatedFetch(`/api/games/${game_slug}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name,
          players,
          team_based
        })
      });

      if (response.ok) {
        const result = await response.json();
        const serverId = result.sessionId;

        // Met à jour la session offline avec l'ID serveur
        await this.updateOfflineSessionWithServerId(action.session_id, serverId);

        // Récupérer les joueurs créés côté serveur pour mapper les IDs
        await this.mapOfflinePlayersToServerIds(action.session_id, serverId);

        // Marque l'action comme synchronisée
        await offlineStorage.markActionAsSynced(action.id);

        return true;
      } else {
        const error = await response.text();
        throw new Error(`Server error: ${response.status} - ${error}`);
      }
    } catch (error) {
      console.error('Failed to sync create session:', error);
      return false;
    }
  }

  /**
   * Synchronise rejoindre session
   */
  private async syncJoinSession(action: OfflineAction): Promise<boolean> {
    try {
      const { sessionId, playerName } = action.data;

      const response = await authenticatedFetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName })
      });

      if (response.ok) {
        await offlineStorage.markActionAsSynced(action.id);
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync join session:', error);
      return false;
    }
  }

  /**
   * Synchronise ajout de score
   */
  private async syncAddScore(action: OfflineAction): Promise<boolean> {
    try {
      const { sessionId, playerId, score, roundNumber, details } = action.data;

      // Récupérer la session offline pour obtenir le game_slug
      const session = await offlineStorage.getOfflineSession(action.session_id);
      if (!session) {
        return false;
      }

      // Vérifier que la session a été synchronisée côté serveur
      if (!session.server_id) {
        return false; // Retry plus tard quand la session sera créée
      }

      const gameSlug = session.game_slug;
      const serverSessionId = session.server_id;

      // Pour les jeux de type "rounds", on doit grouper les scores par manche
      if (roundNumber) {
        // Trouver tous les scores de la même manche pour cette session
        const allPendingActions = await offlineStorage.getPendingActions();
        const sameRoundActions = allPendingActions.filter(a =>
          a.type === 'add_score' &&
          a.data.sessionId === sessionId &&
          a.data.roundNumber === roundNumber
        );

        // Si on a tous les scores de cette manche, on les synchronise ensemble
        if (sameRoundActions.length > 0) {
          // Mapper les IDs offline vers les IDs serveur
          const scores = [];
          for (const a of sameRoundActions) {
            const offlinePlayerId = a.data.playerId;

            // Récupérer le server_id du joueur
            const offlinePlayer = await offlineStorage.db.players.get(offlinePlayerId);
            if (!offlinePlayer?.server_id) {
              return false; // Retry plus tard quand les joueurs seront mappés
            }

            const serverPlayerId = offlinePlayer.server_id;

            scores.push({
              playerId: serverPlayerId,
              score: a.data.score
            });
          }

          const url = `/api/games/${gameSlug}/sessions/${serverSessionId}/rounds`;

          const response = await authenticatedFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scores })
          });

          if (response.ok) {
            // Marquer toutes les actions de cette manche comme synchronisées
            for (const roundAction of sameRoundActions) {
              await offlineStorage.markActionAsSynced(roundAction.id);
            }
            return true;
          } else {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
          }
        }
      } else {
        // Score individuel (jeux de catégories)
        const response = await authenticatedFetch(`/api/games/${gameSlug}/sessions/${serverSessionId}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, score, details })
        });

        if (response.ok) {
          await offlineStorage.markActionAsSynced(action.id);
          return true;
        } else {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }

      return false;
    } catch (error) {
      console.error('Failed to sync add score:', error);
      return false;
    }
  }

  /**
   * Synchronise mise à jour de session
   */
  private async syncUpdateSession(action: OfflineAction): Promise<boolean> {
    try {
      const { sessionId, updates } = action.data;

      const response = await authenticatedFetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await offlineStorage.markActionAsSynced(action.id);
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync update session:', error);
      return false;
    }
  }

  /**
   * Met à jour une session offline avec son ID serveur
   */
  private async updateOfflineSessionWithServerId(offlineId: string, serverId: number): Promise<void> {
    const session = await offlineStorage.getOfflineSession(offlineId);
    if (session) {
      await offlineStorage.db.sessions.update(offlineId, {
        server_id: serverId,
        sync_status: 'synced'
      });
    }
  }

  /**
   * Mappe les joueurs offline vers leurs IDs serveur
   */
  private async mapOfflinePlayersToServerIds(offlineSessionId: string, serverSessionId: number): Promise<void> {
    try {
      // Récupérer la session offline pour obtenir le game_slug
      const session = await offlineStorage.getOfflineSession(offlineSessionId);
      if (!session) {
        throw new Error(`Session offline ${offlineSessionId} introuvable`);
      }

      const gameSlug = session.game_slug;

      // Récupérer les joueurs depuis le serveur avec le bon endpoint
      const serverUrl = `/api/games/${gameSlug}/sessions/${serverSessionId}`;

      const response = await authenticatedFetch(serverUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Impossible de récupérer les joueurs serveur (${response.status}): ${errorText}`);
      }

      const serverData = await response.json();
      const serverPlayers = serverData.session?.players || [];

      // Récupérer les joueurs offline et LES TRIER PAR POSITION
      const offlinePlayersUnsorted = await offlineStorage.getOfflineSessionPlayers(offlineSessionId);
      const offlinePlayers = offlinePlayersUnsorted.sort((a, b) => a.position - b.position);

      // Mapper par position (les joueurs sont créés dans le même ordre)
      for (let i = 0; i < offlinePlayers.length && i < serverPlayers.length; i++) {
        const offlinePlayer = offlinePlayers[i];
        const serverPlayer = serverPlayers[i];

        await offlineStorage.db.players.update(offlinePlayer.id, {
          server_id: serverPlayer.id,
          sync_status: 'synced'
        });
      }

      // Vérification finale : s'assurer que tous les joueurs ont bien été mappés
      const postMappingPlayers = await offlineStorage.getOfflineSessionPlayers(offlineSessionId);
      const unmappedPlayers = postMappingPlayers.filter(p => !p.server_id);

      if (unmappedPlayers.length > 0) {
        const errorMsg = `${unmappedPlayers.length} joueurs non mappés: ${unmappedPlayers.map(p => p.name).join(', ')}`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Erreur lors du mapping des joueurs:', error);
      throw error; // Re-throw pour que syncCreateSession échoue
    }
  }

  /**
   * Planifie la prochaine synchronisation
   */
  private scheduleNextSync(delay: number): void {
    if (!this.isRunning) return;

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(() => {
      this.syncPendingActions();
    }, delay);
  }
}

// Instance globale du service de sync
export const syncService = new SyncService();

// Hook React pour utiliser le service de sync
import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function useSyncService() {
  const { isOnline } = useNetworkStatus();
  const [syncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncSuccess, setLastSyncSuccess] = useState<{ count: number; timestamp: number } | null>(null);

  // Configure les callbacks une seule fois au montage
  useEffect(() => {
    const removeListeners = syncService.addEventListener(
      (syncedCount) => {
        setLastSyncSuccess({ count: syncedCount, timestamp: Date.now() });
        // Met à jour le compteur des actions en attente
        const updateCount = async () => {
          const actions = await offlineStorage.getPendingActions();
          setPendingCount(actions.length);
        };
        updateCount();
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_failedCount) => {
        // Callback d'échec silencieux - les erreurs sont déjà loggées dans syncService
      }
    );

    return () => {
      removeListeners(); // Nettoie les callbacks
      syncService.stop();
    };
  }, []); // Pas de dépendances - une seule fois

  // Gère le démarrage/arrêt du service selon le statut réseau
  useEffect(() => {
    if (isOnline) {
      syncService.start();
    } else {
      syncService.stop();
    }
  }, [isOnline]);

  // Met à jour le compteur d'actions en attente
  useEffect(() => {
    const updatePendingCount = async () => {
      try {
        const actions = await offlineStorage.getPendingActions();
        setPendingCount(actions.length);
      } catch (error) {
        console.error('Error getting pending actions count:', error);
      }
    };

    updatePendingCount();

    // Vérifie toutes les 10 secondes
    const interval = setInterval(updatePendingCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    lastSyncSuccess,
    forceSync: () => syncService.forcSync(),
    clearSyncNotification: () => setLastSyncSuccess(null)
  };
}