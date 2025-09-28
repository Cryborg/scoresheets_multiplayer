import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/lib/offline-storage';

export interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastOnline: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number | null;
}

/**
 * Service singleton pour centraliser les appels health
 * Évite les multiples instances et appels redondants
 */
class NetworkStatusService {
  private static instance: NetworkStatusService;
  private subscribers: Set<(status: NetworkStatus) => void> = new Set();
  private currentStatus: NetworkStatus = {
    isOnline: true,
    isConnecting: false,
    lastOnline: new Date(),
    connectionQuality: 'excellent',
    latency: null
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isTabVisible = true;
  private hasPendingOfflineData = false;

  static getInstance(): NetworkStatusService {
    if (!NetworkStatusService.instance) {
      NetworkStatusService.instance = new NetworkStatusService();
    }
    return NetworkStatusService.instance;
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
      this.startHealthChecking();
    }
  }

  subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.subscribers.add(callback);
    // Envoie immédiatement le statut actuel
    callback(this.currentStatus);

    return () => {
      this.subscribers.delete(callback);
      // Si plus d'abonnés, arrêter les health checks
      if (this.subscribers.size === 0) {
        this.stopHealthChecking();
      }
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.currentStatus));
  }

  private setupEventListeners(): void {
    const handleOnline = () => {
      this.updateNetworkStatus();
    };

    const handleOffline = () => {
      this.currentStatus = {
        ...this.currentStatus,
        isOnline: false,
        isConnecting: false,
        connectionQuality: 'offline',
        latency: null
      };
      this.notifySubscribers();
    };

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      this.isTabVisible = isVisible;

      if (isVisible && !this.currentStatus.isOnline) {
        // Onglet redevient visible et on était hors ligne
        this.updateNetworkStatus();
      }

      // Redémarre/ajuste les health checks selon la visibilité
      this.restartHealthChecking();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Test initial
    if (!navigator.onLine) {
      this.currentStatus.isOnline = false;
      this.currentStatus.connectionQuality = 'offline';
      this.currentStatus.latency = null;
    } else {
      this.updateNetworkStatus();
    }

    // Vérifier les données offline en attente au démarrage
    this.checkPendingOfflineData();
  }

  private async checkPendingOfflineData(): Promise<void> {
    try {
      const [pendingActions, offlineSessions] = await Promise.all([
        offlineStorage.getPendingActions(),
        offlineStorage.getAllOfflineSessions()
      ]);

      // Y a-t-il des actions en attente ou des sessions offline non synchronisées ?
      const hasPending = pendingActions.length > 0 ||
                        offlineSessions.some(session => session.sync_status === 'pending');

      this.hasPendingOfflineData = hasPending;
    } catch (_error) {
      // En cas d'erreur, on assume qu'il pourrait y avoir des données
      this.hasPendingOfflineData = true;
    }
  }

  private async testConnection(): Promise<{ isOnline: boolean; latency: number | null; quality: NetworkStatus['connectionQuality'] }> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Navigator offline
      return { isOnline: false, latency: null, quality: 'offline' };
    }

    try {
      const startTime = Date.now();

      // Ping vers notre API de santé (endpoint léger)
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000) // Timeout 10s
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        let quality: NetworkStatus['connectionQuality'] = 'excellent';

        if (latency > 2000) quality = 'poor';
        else if (latency > 1000) quality = 'good';
        else quality = 'excellent';

        // Network test success
        return { isOnline: true, latency, quality };
      } else {
        // Network test failed
        return { isOnline: false, latency, quality: 'offline' };
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Connection failed
      } else {
        // Network test error
      }
      return { isOnline: false, latency: null, quality: 'offline' };
    }
  }

  private async updateNetworkStatus(): Promise<void> {
    this.currentStatus.isConnecting = true;
    this.notifySubscribers();

    const result = await this.testConnection();

    this.currentStatus = {
      isOnline: result.isOnline,
      isConnecting: false,
      lastOnline: result.isOnline ? new Date() : this.currentStatus.lastOnline,
      connectionQuality: result.quality,
      latency: result.latency
    };

    this.notifySubscribers();
  }

  private startHealthChecking(): void {
    if (this.healthCheckInterval) return;

    this.restartHealthChecking();
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      // Health checks stopped
    }
  }

  private restartHealthChecking(): void {
    // Arrêter l'ancien interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Conditions pour désactiver les health checks :
    const shouldSkipHealthCheck = !this.isTabVisible && !this.hasPendingOfflineData;

    if (shouldSkipHealthCheck) {
      // Health checks paused
      return;
    }

    // Intervalles adaptés selon le contexte
    let interval: number;
    if (!this.currentStatus.isOnline) {
      interval = 20000; // 20s offline - besoin de détecter le retour rapide
    } else if (this.hasPendingOfflineData) {
      interval = 30000; // 30s online avec données en attente
    } else {
      interval = 60000; // 60s online sans données en attente
    }

    this.healthCheckInterval = setInterval(() => {
      this.updateNetworkStatus();
      this.checkPendingOfflineData(); // Re-vérifier les données en attente
    }, interval);

    // Health checks restarted
  }

  // Méthode publique pour forcer un refresh
  async forceRefresh(): Promise<void> {
    await this.updateNetworkStatus();
  }
}

/**
 * Hook pour surveiller le statut réseau avec détection intelligente
 * Utilise un service singleton pour éviter les appels redondants
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: true, // Optimistic par défaut pour éviter l'hydratation mismatch
    isConnecting: false,
    lastOnline: new Date(),
    connectionQuality: 'excellent',
    latency: null
  });

  useEffect(() => {
    const service = NetworkStatusService.getInstance();

    // S'abonner aux mises à jour du service singleton
    const unsubscribe = service.subscribe((status) => {
      setNetworkStatus(status);
    });

    return unsubscribe;
  }, []);

  const forceRefresh = useCallback(async () => {
    const service = NetworkStatusService.getInstance();
    await service.forceRefresh();
  }, []);

  return {
    ...networkStatus,
    refresh: forceRefresh,
    isOffline: !networkStatus.isOnline,
    hasPendingOfflineData: false // Legacy pour compatibilité
  };
}

/**
 * Hook simple pour les composants qui n'ont besoin que du statut online/offline
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}