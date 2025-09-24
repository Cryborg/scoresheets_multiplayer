/**
 * Version refactorisée de useRealtimeSession qui respecte le principe de responsabilité unique
 * En séparant les préoccupations en hooks spécialisés
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePollingService } from './usePollingService';
import { useVisibilityOptimization } from './useVisibilityOptimization';
import { useConnectionManager } from './useConnectionManager';
import { getGuestId } from '@/lib/guestAuth';
import type { GameSessionWithRounds, GameSessionWithCategories } from '@/types/multiplayer';

interface SessionEvent {
  id: number;
  event_type: string;
  event_data: string;
  username?: string;
  created_at: string;
}

interface UseSimpleRealtimeSessionProps {
  sessionId: string;
  gameSlug?: string;
  enabled?: boolean;
  pollInterval?: number;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useSimpleRealtimeSession<T extends GameSessionWithRounds | GameSessionWithCategories>({
  sessionId,
  gameSlug,
  enabled = true,
  pollInterval = 2000,
  onUpdate,
  onError,
  onConnectionChange
}: UseSimpleRealtimeSessionProps) {

  const [session, setSession] = useState<T | null>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLocalSession, setIsLocalSession] = useState(false);

  // Refs pour la gestion optimisée
  const lastDataHashRef = useRef<string>('');

  // Ref pour éviter la référence circulaire
  const forceRefreshRef = useRef<(() => Promise<void>) | null>(null);

  // Gestion de la visibilité pour optimiser le polling
  const visibility = useVisibilityOptimization({
    pauseOnHidden: true,
    onActivityChange: () => {
      // Force un refresh quand l'utilisateur redevient actif
      if (session && forceRefreshRef.current) {
        forceRefreshRef.current();
      }
    }
  });

  // Gestion de la connexion avec retry automatique
  const connection = useConnectionManager({
    maxRetries: 3,
    baseDelay: 1000,
    maxConsecutiveFailures: 5,
    onError: (error) => {
      onError?.(error);
      console.error('Connection error:', error);
    },
    onConnectionChange: (connected) => {
      onConnectionChange?.(connected);
    }
  });

  // Fonction de fetch des données
  const fetchSessionData = useCallback(async () => {
    if (!sessionId || sessionId === 'new') return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // Préparer les headers
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'X-Last-Update': lastUpdate?.toISOString() || '',
      };

      // Ajouter guest ID si pas authentifié
      if (typeof window !== 'undefined' && !document.cookie.includes('auth-token')) {
        const guestId = getGuestId();
        if (guestId) {
          headers['X-Guest-Id'] = guestId.toString();
        }
      }

      const response = await fetch(`/api/sessions/${sessionId}/realtime`, {
        signal: controller.signal,
        credentials: 'include',
        headers
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const newData = await response.json();

      // Exclure le timestamp et isLocalSession du hash pour éviter les re-renders inutiles
      const { timestamp, isLocalSession: isLocal, ...sessionDataForHash } = newData;
      const dataHash = JSON.stringify(sessionDataForHash);

      // Update local session flag
      if (typeof isLocal === 'boolean') {
        setIsLocalSession(isLocal);
      }

      // Mise à jour uniquement si données changées
      if (dataHash !== lastDataHashRef.current) {
        lastDataHashRef.current = dataHash;
        setSession(newData.session);
        setEvents(newData.events || []);
        setCurrentUserId(newData.currentUserId || null);
        setLastUpdate(new Date());

        // Notifier la mise à jour
        onUpdate?.({ session: newData.session, events: newData.events });
      }

      // Marquer le succès de la connexion
      connection.handleSuccess();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur de connexion');
      connection.handleError(error);
      throw error;
    }
  }, [sessionId, lastUpdate, connection, onUpdate]);

  // Calculer l'intervalle de polling adaptatif
  const getAdaptiveInterval = useCallback(() => {
    const baseInterval = pollInterval;
    const multiplier = visibility.getAdaptiveMultiplier();

    // Add jitter to prevent thundering herd (5-15% random variation)
    const jitterRange = baseInterval * 0.1;
    const jitter = (Math.random() - 0.5) * jitterRange;

    return Math.max(1000, Math.floor((baseInterval * multiplier) + jitter));
  }, [pollInterval, visibility]);

  // Service de polling avec gestion des erreurs
  const pollingEnabled = enabled &&
                         !visibility.state.shouldPause &&
                         connection.shouldRetry();

  const polling = usePollingService({
    interval: getAdaptiveInterval(),
    onUpdate: fetchSessionData,
    enabled: pollingEnabled,
    onError: connection.handleError
  });

  // Effet pour forcer le premier fetch même si polling désactivé
  useEffect(() => {
    if (sessionId && sessionId !== 'new' && !session) {
      fetchSessionData();
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Force refresh fonction
  const forceRefresh = useCallback(async () => {
    await fetchSessionData();
  }, [fetchSessionData]);

  // Mettre à jour la ref après chaque redéfinition
  forceRefreshRef.current = forceRefresh;

  // Fonctions de gestion des rounds (pour compatibilité avec l'API existante)
  const addRound = useCallback(async (
    scores: Array<{ playerId: number; score: number }>,
    details?: Record<string, unknown>
  ) => {
    try {
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
      await forceRefresh();

    } catch (error) {
      throw error;
    }
  }, [sessionId, gameSlug, forceRefresh]);

  const deleteRound = useCallback(async (roundNumber: number) => {
    try {
      const endpoint = gameSlug
        ? `/api/games/${gameSlug}/sessions/${sessionId}/rounds/${roundNumber}`
        : `/api/sessions/${sessionId}/rounds/${roundNumber}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression de la manche');
      }

      // Force refresh to get updated data
      await forceRefresh();

      return await response.json();
    } catch (error) {
      console.error('Error deleting round:', error);
      throw error;
    }
  }, [gameSlug, sessionId, forceRefresh]);

  return {
    session,
    events,
    isConnected: connection.state.isConnected,
    error: connection.state.error,
    lastUpdate,
    currentUserId,
    connectionStatus: connection.state.connectionStatus,
    isLocalSession,
    addRound,
    deleteRound,
    forceRefresh
  };
}

/**
 * Avantages de cette approche :
 * 
 * 1. Single Responsibility Principle (SRP) ✅
 *    - usePollingService : gère uniquement le polling
 *    - useVisibilityOptimization : gère uniquement la visibilité
 *    - useConnectionManager : gère uniquement les erreurs/retry
 *    - useSimpleRealtimeSession : orchestre les trois
 * 
 * 2. Open/Closed Principle ✅
 *    - Chaque hook peut être étendu sans modifier les autres
 *    - Ex: ajouter circuit breaker dans useConnectionManager
 * 
 * 3. Dependency Inversion ✅
 *    - useSimpleRealtimeSession dépend d'abstractions (hooks)
 *    - Pas de dépendances directes vers l'implémentation
 * 
 * 4. Testabilité améliorée ✅
 *    - Chaque hook peut être testé indépendamment
 *    - Mocking plus simple et ciblé
 * 
 * 5. Réutilisabilité ✅
 *    - usePollingService peut être réutilisé pour d'autres API
 *    - useConnectionManager peut gérer d'autres connexions
 */