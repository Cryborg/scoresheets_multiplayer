'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Interface pour la version legacy (compatibilité)
interface LegacyPollingOptions {
  interval: number;
  onUpdate: () => Promise<void>;
  enabled: boolean;
  onError?: (error: Error) => void;
}

// Interface pour la nouvelle version avec data fetching
export interface PollingServiceOptions {
  url: string;
  interval?: number;
  enabled?: boolean;
  maxRetries?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  fetchOptions?: RequestInit;
}

export interface PollingServiceReturn<T = any> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdate: Date | null;
  retryCount: number;
  forceRefresh: () => Promise<void>;
  isPolling: boolean;
}

const DEFAULT_INTERVAL = 2000;
const DEFAULT_MAX_RETRIES = 3;

// Version legacy pour compatibilité (sera dépréciée)
function useLegacyPollingService({ interval, onUpdate, enabled, onError }: LegacyPollingOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isActiveRef.current = false;
  }, []);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling

    isActiveRef.current = true;

    const poll = async () => {
      if (!isActiveRef.current) return;

      try {
        await onUpdate();
      } catch (error) {
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    };

    // Immediate first call
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);
  }, [interval, onUpdate, onError]);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling]);

  return {
    isPolling: !!intervalRef.current,
    startPolling,
    stopPolling
  };
}

/**
 * Hook spécialisé pour la gestion du polling HTTP avec data fetching
 *
 * Responsabilités:
 * - Polling HTTP avec interval configurable
 * - Gestion des timeouts et retry
 * - Parse automatique des réponses JSON
 * - Gestion basique des erreurs de réseau
 *
 * @param options Configuration du polling
 * @returns État et contrôles du polling
 */
export function usePollingServiceWithData<T = any>(
  options: PollingServiceOptions
): PollingServiceReturn<T> {
  const {
    url,
    interval = DEFAULT_INTERVAL,
    enabled = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    onUpdate,
    onError,
    fetchOptions = {}
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef<boolean>(false);

  // Fonction de fetch avec gestion d'erreurs
  const fetchData = useCallback(async (): Promise<T | null> => {
    if (!url || isUnmountedRef.current) {
      return null;
    }

    try {
      setError(null);

      const response = await fetch(url, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!isUnmountedRef.current) {
        setData(result);
        setLastUpdate(new Date());
        setRetryCount(0);
        onUpdate?.(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (!isUnmountedRef.current) {
        setError(error);
        setRetryCount(prev => prev + 1);
        onError?.(error);
      }

      throw error;
    }
  }, [url, fetchOptions, onUpdate, onError]);

  // Force refresh manuel
  const forceRefresh = useCallback(async (): Promise<void> => {
    if (!enabled || isUnmountedRef.current) {
      return;
    }

    setIsLoading(true);

    try {
      await fetchData();
    } catch (error) {
      // Error déjà gérée dans fetchData
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, fetchData]);

  // Démarrage du polling
  const startPolling = useCallback(() => {
    if (!enabled || isUnmountedRef.current) {
      return;
    }

    // Nettoyage du timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Premier fetch immédiat si pas de données
    if (!data && !isLoading) {
      forceRefresh();
    }

    // Programmation du prochain fetch
    timeoutRef.current = setTimeout(() => {
      if (!isUnmountedRef.current && enabled && retryCount < maxRetries) {
        forceRefresh().then(() => {
          // Continuer le polling si pas d'erreur fatale
          startPolling();
        }).catch(() => {
          // En cas d'erreur, attendre avant de reprendre
          timeoutRef.current = setTimeout(startPolling, interval * 2);
        });
      }
    }, interval);
  }, [enabled, data, isLoading, forceRefresh, retryCount, maxRetries, interval]);

  // Effect principal de gestion du polling
  useEffect(() => {
    if (enabled && url) {
      startPolling();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, url, startPolling]);

  // Cleanup au unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Arrêter le polling si disabled
  useEffect(() => {
    if (!enabled && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [enabled]);

  return {
    data,
    isLoading,
    error,
    lastUpdate,
    retryCount,
    forceRefresh,
    isPolling: !!timeoutRef.current
  };
}

// Export principal - détermine automatiquement la version à utiliser
export function usePollingService(options: LegacyPollingOptions | PollingServiceOptions) {
  // Si l'option contient 'url', c'est la nouvelle version
  if ('url' in options) {
    return usePollingServiceWithData(options);
  }

  // Sinon, c'est la version legacy
  return useLegacyPollingService(options);
}