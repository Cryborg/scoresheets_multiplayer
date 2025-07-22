'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseAutoReconnectOptions {
  isConnected: boolean;
  onReconnect: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  enabled?: boolean;
}

export function useAutoReconnect({
  isConnected,
  onReconnect,
  maxRetries = 5,
  retryDelay = 2000,
  backoffMultiplier = 1.5,
  enabled = true
}: UseAutoReconnectOptions) {
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const calculateRetryDelay = useCallback((attempt: number) => {
    return retryDelay * Math.pow(backoffMultiplier, attempt);
  }, [retryDelay, backoffMultiplier]);

  const attemptReconnect = useCallback(async () => {
    if (!enabled || isConnected || isReconnectingRef.current) {
      return;
    }

    if (retryCountRef.current >= maxRetries) {
      console.warn('Max reconnection attempts reached');
      return;
    }

    isReconnectingRef.current = true;
    retryCountRef.current++;

    try {
      await onReconnect();
      
      // Succès : reset le compteur
      if (isConnected) {
        retryCountRef.current = 0;
      }
    } catch (error) {
      console.error(`Reconnection attempt ${retryCountRef.current} failed:`, error);
      
      // Programmer la prochaine tentative
      const delay = calculateRetryDelay(retryCountRef.current - 1);
      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);
    } finally {
      isReconnectingRef.current = false;
    }
  }, [enabled, isConnected, maxRetries, onReconnect, calculateRetryDelay]);

  // Reset le compteur quand la connexion est rétablie
  useEffect(() => {
    if (isConnected) {
      retryCountRef.current = 0;
      clearRetryTimeout();
    }
  }, [isConnected, clearRetryTimeout]);

  // Démarre la reconnexion automatique quand déconnecté
  useEffect(() => {
    if (!isConnected && enabled && retryCountRef.current < maxRetries) {
      const delay = calculateRetryDelay(retryCountRef.current);
      
      retryTimeoutRef.current = setTimeout(() => {
        attemptReconnect();
      }, delay);
    }

    return clearRetryTimeout;
  }, [isConnected, enabled, maxRetries, attemptReconnect, calculateRetryDelay, clearRetryTimeout]);

  // Nettoyage
  useEffect(() => {
    return () => {
      clearRetryTimeout();
    };
  }, [clearRetryTimeout]);

  return {
    retryCount: retryCountRef.current,
    isReconnecting: isReconnectingRef.current,
    maxRetries,
    manualReconnect: attemptReconnect
  };
}