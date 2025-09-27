import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastOnline: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  latency: number | null;
}

/**
 * Hook pour surveiller le statut réseau avec détection intelligente
 * Combine navigator.onLine + ping serveur pour une détection précise
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isConnecting: false,
    lastOnline: typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null,
    connectionQuality: 'excellent',
    latency: null
  });

  // Test de ping vers le serveur
  const testConnection = useCallback(async (): Promise<{ isOnline: boolean; latency: number | null; quality: NetworkStatus['connectionQuality'] }> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { isOnline: false, latency: null, quality: 'offline' };
    }

    try {
      const startTime = Date.now();

      // Ping vers notre API de santé (endpoint léger)
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // Timeout 5s
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        let quality: NetworkStatus['connectionQuality'] = 'excellent';

        if (latency > 2000) quality = 'poor';
        else if (latency > 1000) quality = 'good';
        else quality = 'excellent';

        return { isOnline: true, latency, quality };
      } else {
        return { isOnline: false, latency, quality: 'offline' };
      }
    } catch (error) {
      console.log('Network test failed:', error);
      return { isOnline: false, latency: null, quality: 'offline' };
    }
  }, []);

  // Fonction de mise à jour du statut
  const updateNetworkStatus = useCallback(async () => {
    setNetworkStatus(prev => ({ ...prev, isConnecting: true }));

    const result = await testConnection();

    setNetworkStatus(prev => ({
      isOnline: result.isOnline,
      isConnecting: false,
      lastOnline: result.isOnline ? new Date() : prev.lastOnline,
      connectionQuality: result.quality,
      latency: result.latency
    }));

    return result.isOnline;
  }, [testConnection]);

  // Gestionnaires d'événements
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('🌐 Navigator: Back online');
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('📵 Navigator: Gone offline');
      setNetworkStatus(prev => ({
        ...prev,
        isOnline: false,
        isConnecting: false,
        connectionQuality: 'offline',
        latency: null
      }));
    };

    // Événements navigator
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Test initial
    updateNetworkStatus();

    // Tests périodiques (plus fréquents si hors ligne)
    const interval = setInterval(() => {
      updateNetworkStatus();
    }, networkStatus.isOnline ? 30000 : 10000); // 30s online, 10s offline

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [updateNetworkStatus, networkStatus.isOnline]);

  // Test de visibilité (pause quand onglet inactif)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !networkStatus.isOnline) {
        // Onglet redevient visible et on était hors ligne
        updateNetworkStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateNetworkStatus, networkStatus.isOnline]);

  return {
    ...networkStatus,
    refresh: updateNetworkStatus,
    isOffline: !networkStatus.isOnline
  };
}

/**
 * Hook simple pour les composants qui n'ont besoin que du statut online/offline
 */
export function useOnlineStatus(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}