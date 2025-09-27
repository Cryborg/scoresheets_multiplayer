import { offlineStorage, OfflineAction } from './offline-storage';
import { authenticatedFetch } from '@/lib/authClient';

/**
 * Service de synchronisation en arrière-plan
 * Synchronise les actions offline avec le serveur
 */
export class SyncService {
  private isRunning = false;
  private retryTimeout: NodeJS.Timeout | null = null;

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
    if (!this.isRunning) return;

    try {
      const pendingActions = await offlineStorage.getPendingActions();

      if (pendingActions.length === 0) {
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
      const { sessionId, scores } = action.data;

      // Détermine le type d'endpoint en fonction des données
      const endpoint = scores && Array.isArray(scores) ? 'rounds' : 'scores';

      const response = await authenticatedFetch(`/api/games/*/sessions/${sessionId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.data)
      });

      if (response.ok) {
        await offlineStorage.markActionAsSynced(action.id);
        console.log(`✅ Score for session ${sessionId} synced`);
        return true;
      } else {
        throw new Error(`Server error: ${response.status}`);
      }
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

  useEffect(() => {
    if (isOnline) {
      syncService.start();
    } else {
      syncService.stop();
    }

    return () => {
      syncService.stop();
    };
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
    forceSync: () => syncService.forcSync()
  };
}