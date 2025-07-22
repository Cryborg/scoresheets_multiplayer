'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionEvent {
  id: number;
  event_type: string;
  event_data: string;
  username?: string;
  created_at: string;
}

interface UseRealtimeSessionReturn<T> {
  session: T | null;
  events: SessionEvent[];
  isConnected: boolean;
  error: string | null;
  lastUpdate: Date | null;
  currentUserId: number | null;
  addRound: (scores: Array<{ playerId: number; score: number }>, details?: Record<string, unknown>) => Promise<void>;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

// Configuration adaptative du polling selon l'activité
const POLLING_CONFIG = {
  active: 2000,    // Session active : 2s
  idle: 5000,      // Session idle : 5s
  background: 10000, // En arrière-plan : 10s
  error: 30000     // En erreur : 30s
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;
const MAX_CONSECUTIVE_FAILURES = 5; // Circuit breaker threshold

interface UseRealtimeSessionOptions {
  sessionId: string;
  gameSlug?: string;
  pollInterval?: number;
  pausePolling?: boolean;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useRealtimeSession<T>(options: UseRealtimeSessionOptions): UseRealtimeSessionReturn<T> {
  const { 
    sessionId, 
    gameSlug,
    pollInterval = POLLING_CONFIG.active, 
    pausePolling = false, 
    onUpdate, 
    onError, 
    onConnectionChange 
  } = options;
  const [session, setSession] = useState<T | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');

  // Refs pour la gestion optimisée
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastDataHashRef = useRef<string>('');
  const retryCountRef = useRef(0);
  const consecutiveFailuresRef = useRef(0); // Circuit breaker counter
  const lastActivityRef = useRef<Date>(new Date());
  const visibilityRef = useRef<boolean>(typeof window !== 'undefined' ? !document.hidden : true);
  const fetchSessionDataRef = useRef<(() => Promise<void>) | null>(null);
  const connectionDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Détection d'activité pour polling adaptatif
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
  }, []);

  // Debounced connection status update to prevent flickering
  const setConnectionStatusDebounced = useCallback((newStatus: 'connected' | 'connecting' | 'disconnected' | 'error') => {
    // Clear any existing debounce
    if (connectionDebounceRef.current) {
      clearTimeout(connectionDebounceRef.current);
    }
    
    // For connecting state, apply immediately (no delay)
    if (newStatus === 'connecting') {
      setConnectionStatus(newStatus);
      return;
    }
    
    // For other states, debounce to prevent flickering
    connectionDebounceRef.current = setTimeout(() => {
      setConnectionStatus(newStatus);
    }, 300); // 300ms delay to stabilize
  }, []);

  const getCurrentPollInterval = useCallback(() => {
    // Circuit breaker: stop polling if too many consecutive failures
    if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
      return POLLING_CONFIG.error * 2; // Extra long delay when circuit is open
    }
    
    if (connectionStatus === 'error') return POLLING_CONFIG.error;
    if (!visibilityRef.current) return POLLING_CONFIG.background;
    
    // Add jitter to prevent thundering herd (5-15% random variation)
    const baseInterval = (() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current.getTime();
      return timeSinceActivity > 30000 ? pollInterval * 2.5 : pollInterval;
    })();
    
    const jitterRange = baseInterval * 0.1; // 10% jitter
    const jitter = (Math.random() - 0.5) * jitterRange;
    
    return Math.max(1000, Math.floor(baseInterval + jitter)); // Min 1s interval
  }, [connectionStatus, pollInterval]);

  const fetchSessionData = useCallback(async () => {
    if (isPollingRef.current || !sessionId || sessionId === 'new') return;
    
    isPollingRef.current = true;
    
    try {
      // Only set connecting if we weren't already connected (first time or after an error)
      if (connectionStatus !== 'connected') {
        setConnectionStatusDebounced('connecting');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`/api/sessions/${sessionId}/realtime`, {
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Last-Update': lastUpdate?.toISOString() || '',
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const newData = await response.json();
      // Exclure le timestamp du hash pour éviter les re-renders inutiles
      const { timestamp, ...sessionDataForHash } = newData;
      const dataHash = JSON.stringify(sessionDataForHash);

      // Mise à jour uniquement si données changées
      if (dataHash !== lastDataHashRef.current) {
        lastDataHashRef.current = dataHash;
        setSession(newData.session);
        setEvents(newData.events || []);
        setCurrentUserId(newData.currentUserId || null);
        setLastUpdate(new Date());
        updateActivity();
      }

      // Succès : reset compteurs d'erreur et circuit breaker
      setIsConnected(true);
      setConnectionStatusDebounced('connected');
      setError(null);
      retryCountRef.current = 0;
      consecutiveFailuresRef.current = 0; // Reset circuit breaker on success

    } catch (err) {
      
      retryCountRef.current++;
      consecutiveFailuresRef.current++; // Track consecutive failures for circuit breaker
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      
      setError(errorMessage);
      setIsConnected(false);
      
      // Determine connection status based on failure count
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setConnectionStatusDebounced('error'); // Circuit breaker open
      } else if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        setConnectionStatusDebounced('error');
      } else {
        setConnectionStatusDebounced('disconnected');
      }
      
    } finally {
      isPollingRef.current = false;
    }
  }, [sessionId, updateActivity]);

  // Mettre à jour la ref après chaque redéfinition
  fetchSessionDataRef.current = fetchSessionData;

  const addRound = useCallback(async (
    scores: Array<{ playerId: number; score: number }>, 
    details?: Record<string, unknown>
  ) => {
    try {
      // Use game-specific endpoint if gameSlug is provided, otherwise fallback to generic endpoint
      const endpoint = gameSlug 
        ? `/api/games/${gameSlug}/sessions/${sessionId}/rounds`
        : `/api/sessions/${sessionId}/rounds`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ scores, details }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'ajout de la manche');
      }

      // Force un refresh immédiat après ajout
      updateActivity();
      if (fetchSessionDataRef.current) {
        await fetchSessionDataRef.current();
      }
      
    } catch (error) {
      throw error;
    }
  }, [sessionId, gameSlug, updateActivity]);

  // Polling intelligent avec interval adaptatif
  const setupPolling = useCallback(() => {
    const scheduleNext = () => {
      const interval = getCurrentPollInterval();
      
      intervalRef.current = setTimeout(async () => {
        if (fetchSessionDataRef.current) {
          await fetchSessionDataRef.current();
        }
        scheduleNext(); // Réprogramme avec le nouvel intervalle
      }, interval);
    };

    // Démarre le polling
    scheduleNext();
  }, [getCurrentPollInterval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Gestion de la visibilité de la page
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      const wasVisible = visibilityRef.current;
      visibilityRef.current = !document.hidden;
      
      // Si on revient à la page, fetch immédiatement
      if (!wasVisible && visibilityRef.current) {
        updateActivity();
        if (fetchSessionDataRef.current) {
          fetchSessionDataRef.current();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateActivity]);

  // Gérer le callback onUpdate
  useEffect(() => {
    if (session && onUpdate) {
      onUpdate({ session, events });
    }
  }, [session, events, onUpdate]);

  // Gérer le callback onError
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Gérer le callback onConnectionChange
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(isConnected);
    }
  }, [isConnected, onConnectionChange]);

  // Démarrage et nettoyage avec gestion du pausePolling
  useEffect(() => {
    if (!pausePolling && sessionId && sessionId !== 'new') {
      if (fetchSessionDataRef.current) {
        fetchSessionDataRef.current();
      }
      setupPolling();
    }
    
    return () => {
      stopPolling();
      // Clean up connection debounce timeout
      if (connectionDebounceRef.current) {
        clearTimeout(connectionDebounceRef.current);
      }
    };
  }, [sessionId, pausePolling]); // Seulement les valeurs primitives

  // Retry automatique avec backoff exponentiel  
  useEffect(() => {
    if (connectionStatus === 'error' && retryCountRef.current < MAX_RETRY_ATTEMPTS) {
      const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCountRef.current);
      
      const retryTimer = setTimeout(() => {
        if (fetchSessionDataRef.current) {
          fetchSessionDataRef.current();
        }
      }, retryDelay);

      return () => clearTimeout(retryTimer);
    }
  }, [connectionStatus]);

  return {
    session,
    events,
    isConnected,
    error,
    lastUpdate,
    currentUserId,
    addRound,
    connectionStatus
  };
}