'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface ConnectionConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxConsecutiveFailures?: number;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export interface ConnectionState {
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  error: string | null;
  retryCount: number;
  consecutiveFailures: number;
  isCircuitOpen: boolean;
}

export interface ConnectionManager {
  state: ConnectionState;
  handleSuccess: () => void;
  handleError: (error: Error) => void;
  reset: () => void;
  shouldRetry: () => boolean;
  getRetryDelay: () => number;
}

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxConsecutiveFailures: 5,
};

/**
 * Hook spécialisé pour la gestion des connexions et reconnexions
 * Implémente un circuit breaker et un backoff exponentiel
 */
export function useConnectionManager(config: ConnectionConfig = {}): ConnectionManager {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    baseDelay = DEFAULT_CONFIG.baseDelay,
    maxConsecutiveFailures = DEFAULT_CONFIG.maxConsecutiveFailures,
    onConnectionChange,
    onError,
  } = config;

  // État de la connexion
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  // Compteurs de retry et circuit breaker (état pour re-render)
  const [retryCount, setRetryCount] = useState(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // Debounce pour éviter les changements trop fréquents de status
  const connectionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction de mise à jour du status avec debounce
  const setConnectionStatusDebounced = useCallback((status: typeof connectionStatus) => {
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
    }

    connectionDebounceRef.current = setTimeout(() => {
      setConnectionStatus(status);
    }, 300); // 300ms delay to stabilize
  }, []);

  // Circuit breaker: est-il ouvert ?
  const isCircuitOpen = consecutiveFailures >= maxConsecutiveFailures;

  // Gestion du succès d'une connexion
  const handleSuccess = useCallback(() => {
    setIsConnected(true);
    setConnectionStatusDebounced('connected');
    setError(null);

    // Reset tous les compteurs d'erreur
    setRetryCount(0);
    setConsecutiveFailures(0);

    onConnectionChange?.(true);
  }, [setConnectionStatusDebounced, onConnectionChange]);

  // Gestion des erreurs de connexion
  const handleError = useCallback((err: Error) => {
    const newRetryCount = retryCount + 1;
    const newConsecutiveFailures = consecutiveFailures + 1;

    setRetryCount(newRetryCount);
    setConsecutiveFailures(newConsecutiveFailures);

    const errorMessage = err.message || 'Erreur de connexion';
    setError(errorMessage);
    setIsConnected(false);

    // Déterminer le status selon le nombre d'échecs
    if (newConsecutiveFailures >= maxConsecutiveFailures) {
      setConnectionStatusDebounced('error'); // Circuit breaker ouvert
    } else if (newRetryCount >= maxRetries) {
      setConnectionStatusDebounced('error');
    } else {
      setConnectionStatusDebounced('disconnected');
    }

    onConnectionChange?.(false);
    onError?.(err);
  }, [retryCount, consecutiveFailures, maxRetries, maxConsecutiveFailures, setConnectionStatusDebounced, onConnectionChange, onError]);

  // Reset complet de l'état de connexion
  const reset = useCallback(() => {
    setIsConnected(false);
    setConnectionStatus('connecting');
    setError(null);
    setRetryCount(0);
    setConsecutiveFailures(0);

    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
      connectionDebounceRef.current = null;
    }
  }, []);

  // Détermine si on doit retry
  const shouldRetry = useCallback(() => {
    return (
      retryCount < maxRetries &&
      !isCircuitOpen &&
      (connectionStatus === 'error' || connectionStatus === 'disconnected')
    );
  }, [retryCount, maxRetries, isCircuitOpen, connectionStatus]);

  // Calcule le délai de retry avec backoff exponentiel
  const getRetryDelay = useCallback(() => {
    return baseDelay * Math.pow(2, retryCount);
  }, [baseDelay, retryCount]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (connectionDebounceRef.current) {
        clearTimeout(connectionDebounceRef.current);
      }
    };
  }, []);

  return {
    state: {
      isConnected,
      connectionStatus,
      error,
      retryCount,
      consecutiveFailures,
      isCircuitOpen,
    },
    handleSuccess,
    handleError,
    reset,
    shouldRetry,
    getRetryDelay,
  };
}