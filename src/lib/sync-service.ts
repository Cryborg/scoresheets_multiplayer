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
      console.log(`🔄 Sync Service: Not running, skipping sync`);
      return;
    }

    // Vérifier qu'on est toujours online avant de tenter une sync
    if (!navigator.onLine) {
      console.log(`🔄 Sync Service: Offline detected, stopping sync`);
      this.stop();
      return;
    }

    try {
      console.log(`🔄 Sync Service: Checking for pending actions...`);
      const pendingActions = await offlineStorage.getPendingActions();

      if (pendingActions.length === 0) {
        console.log(`🔄 Sync Service: No pending actions found, scheduling next sync in 30s`);
        this.scheduleNextSync(30000); // 30s si rien à sync
        return;
      }

      console.log(`🔄 Sync Service: Processing ${pendingActions.length} pending actions`);

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

      console.log(`✅ Sync Service: Complete (${syncedCount} synced, ${failedCount} failed)`);

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
      console.log(`🔄 Sync Service: Offline detected during action sync, aborting`);
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

      console.log(`🏗️ [syncCreateSession] Création session avec ${players.length} joueurs`);

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

        console.log(`✅ Session ${action.session_id} synced with server ID ${serverId}`);
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
        console.log(`✅ Join session ${sessionId} synced`);
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

      console.log(`🔄 [syncAddScore] Sync score pour session ${sessionId}, round ${roundNumber || 'undefined'}`);

      // Récupérer la session offline pour obtenir le game_slug
      const session = await offlineStorage.getOfflineSession(action.session_id);
      if (!session) {
        console.error(`❌ [syncAddScore] Session offline ${action.session_id} introuvable`);
        return false;
      }

      // Vérifier que la session a été synchronisée côté serveur
      if (!session.server_id) {
        console.log(`⏳ [syncAddScore] Session ${action.session_id} pas encore synchronisée, attente...`);
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
              console.log(`⏳ [syncAddScore] Joueur ${offlinePlayerId} pas encore mappé, attente...`);
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
            console.log(`✅ Manche ${roundNumber} synchronisée avec ${scores.length} scores`);
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
          console.log(`✅ Score individuel synchronisé pour session ${serverSessionId}`);
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
        console.log(`✅ Session ${sessionId} update synced`);
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
      console.log(`🔍 [mapOfflinePlayersToServerIds] Début mapping pour session ${offlineSessionId} → ${serverSessionId}`);

      // Récupérer la session offline pour obtenir le game_slug
      const session = await offlineStorage.getOfflineSession(offlineSessionId);
      if (!session) {
        console.error(`❌ [mapOfflinePlayersToServerIds] Session offline ${offlineSessionId} introuvable`);
        return;
      }

      const gameSlug = session.game_slug;

      // Récupérer les joueurs depuis le serveur avec le bon endpoint
      const serverUrl = `/api/games/${gameSlug}/sessions/${serverSessionId}`;

      const response = await authenticatedFetch(serverUrl);
      if (!response.ok) {
        console.error(`❌ [mapOfflinePlayersToServerIds] Impossible de récupérer les joueurs serveur (${response.status})`);
        const errorText = await response.text();
        console.error(`❌ [mapOfflinePlayersToServerIds] Erreur serveur: ${errorText}`);
        return;
      }

      const serverData = await response.json();
      const serverPlayers = serverData.session?.players || [];

      // Récupérer les joueurs offline et LES TRIER PAR POSITION
      const offlinePlayersUnsorted = await offlineStorage.getOfflineSessionPlayers(offlineSessionId);
      const offlinePlayers = offlinePlayersUnsorted.sort((a, b) => a.position - b.position);

      console.log(`🔗 [mapOfflinePlayersToServerIds] Mapping ${offlinePlayers.length} joueurs offline vers ${serverPlayers.length} joueurs serveur`);

      // Mapper par position (les joueurs sont créés dans le même ordre)
      for (let i = 0; i < offlinePlayers.length && i < serverPlayers.length; i++) {
        const offlinePlayer = offlinePlayers[i];
        const serverPlayer = serverPlayers[i];

        await offlineStorage.db.players.update(offlinePlayer.id, {
          server_id: serverPlayer.id,
          sync_status: 'synced'
        });

        console.log(`✅ Joueur ${offlinePlayer.name}: ${offlinePlayer.id} → server ID ${serverPlayer.id}`);
      }

      console.log(`✅ [mapOfflinePlayersToServerIds] Mapping terminé`);

      // Vérification finale : s'assurer que tous les joueurs ont bien été mappés
      const postMappingPlayers = await offlineStorage.getOfflineSessionPlayers(offlineSessionId);
      const unmappedPlayers = postMappingPlayers.filter(p => !p.server_id);

      if (unmappedPlayers.length > 0) {
        const errorMsg = `❌ [mapOfflinePlayersToServerIds] ${unmappedPlayers.length} joueurs non mappés: ${unmappedPlayers.map(p => p.name).join(', ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`✅ [mapOfflinePlayersToServerIds] Tous les joueurs sont correctement mappés`);
    } catch (error) {
      console.error('❌ [mapOfflinePlayersToServerIds] Erreur:', error);
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
    console.log(`🔄 useSyncService: Setting up callbacks (one time)`);

    const removeListeners = syncService.addEventListener(
      (syncedCount) => {
        console.log(`✅ Sync success callback: ${syncedCount} actions synced`);
        setLastSyncSuccess({ count: syncedCount, timestamp: Date.now() });
        // Met à jour le compteur des actions en attente
        const updateCount = async () => {
          const actions = await offlineStorage.getPendingActions();
          setPendingCount(actions.length);
        };
        updateCount();
      },
      (failedCount) => {
        console.log(`❌ Sync failed for ${failedCount} actions`);
      }
    );

    return () => {
      console.log(`🔄 useSyncService: Cleaning up callbacks`);
      removeListeners(); // Nettoie les callbacks
      syncService.stop();
    };
  }, []); // Pas de dépendances - une seule fois

  // Gère le démarrage/arrêt du service selon le statut réseau
  useEffect(() => {
    console.log(`🔄 useSyncService: Network status changed - isOnline: ${isOnline}`);

    if (isOnline) {
      console.log(`🚀 Starting sync service because we're online`);
      syncService.start();
    } else {
      console.log(`⏹️ Stopping sync service because we're offline`);
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