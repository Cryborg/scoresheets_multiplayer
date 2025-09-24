'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface PollingServiceOptions {
  interval: number;
  onUpdate: () => Promise<void>;
  enabled: boolean;
  onError?: (error: Error) => void;
}

export interface PollingServiceReturn {
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook spécialisé pour la gestion du polling
 *
 * Responsabilités:
 * - Polling avec interval configurable
 * - Gestion du démarrage et arrêt
 * - Premier appel immédiat
 * - Gestion des erreurs
 */
export function usePollingService({
  interval,
  onUpdate,
  enabled,
  onError
}: PollingServiceOptions): PollingServiceReturn {
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