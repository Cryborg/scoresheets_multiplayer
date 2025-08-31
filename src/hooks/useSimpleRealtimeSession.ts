/**
 * Version simplifiée de useRealtimeSession qui respecte le principe de responsabilité unique
 * En séparant les préoccupations en hooks spécialisés
 */

import { useState, useCallback, useEffect } from 'react';
import { usePollingService } from './usePollingService';
import { useVisibilityOptimization } from './useVisibilityOptimization';
import { useConnectionManager } from './useConnectionManager';
import type { GameSessionWithRounds, GameSessionWithCategories } from '@/types/multiplayer';

interface UseSimpleRealtimeSessionProps {
  sessionId: string;
  gameSlug?: string;
  enabled?: boolean;
}

export function useSimpleRealtimeSession<T extends GameSessionWithRounds | GameSessionWithCategories>({
  sessionId,
  gameSlug,
  enabled = true
}: UseSimpleRealtimeSessionProps) {
  
  const [session, setSession] = useState<T | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Gestion de la visibilité pour optimiser le polling
  const { shouldPause } = useVisibilityOptimization({ pauseOnHidden: true });

  // Gestion de la connexion avec retry automatique
  const connection = useConnectionManager({
    maxRetries: 5,
    baseDelay: 2000,
    onError: (error) => console.error('Connection error:', error),
    onReconnect: () => console.log('Reconnected successfully')
  });

  // Fonction de fetch des données
  const fetchSessionData = useCallback(async () => {
    const response = await fetch(`/api/sessions/${sessionId}/realtime${gameSlug ? `?gameSlug=${gameSlug}` : ''}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    setSession(data.session);
    setEvents(data.events || []);
    setLoading(false);
    
    connection.handleSuccess();
  }, [sessionId, gameSlug, connection]);

  // Service de polling avec gestion des erreurs
  usePollingService({
    interval: shouldPause ? 10000 : 3000, // Ralentir quand en arrière-plan
    onUpdate: fetchSessionData,
    enabled: enabled && !shouldPause && connection.shouldRetry,
    onError: connection.handleError
  });

  // État de connexion combiné
  const isConnected = connection.isConnected && !loading;
  const connectionStatus = connection.isRetrying ? 'Reconnexion...' : 
                          connection.isConnected ? 'Connecté' : 'Déconnecté';

  return {
    session,
    events,
    loading,
    error: connection.lastError,
    isConnected,
    connectionStatus,
    refetch: fetchSessionData
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