'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSimpleRealtimeSession } from './useSimpleRealtimeSession';
import { useGamePermissions } from './useGamePermissions';
import { GameSession, Player } from '@/types/multiplayer';
import { notify } from '@/lib/toast';
import { getGuestId } from '@/lib/guestAuth';
import { isOfflineSessionId } from './useOfflineSession';

/**
 * Détermine si une session est "locale" (un seul utilisateur connecté)
 * Une session est locale quand tous les joueurs appartiennent au même user_id
 * ou quand il n'y a qu'un seul user_id unique non-null
 */
function isLocalSession(session: GameSession | null, _currentUserId: number | null): boolean {
  if (!session?.players || session.players.length === 0) {
    return false;
  }

  // Collecter tous les user_id uniques non-null
  const uniqueUserIds = new Set(
    session.players
      .map(player => player.user_id)
      .filter(userId => userId !== null)
  );

  // Si aucun user_id (tous les joueurs sont guests), ou un seul user_id
  return uniqueUserIds.size <= 1;
}

interface UseMultiplayerGameProps {
  sessionId: string;
  gameSlug?: string;
}

export function useMultiplayerGame<T extends GameSession>({ sessionId, gameSlug }: UseMultiplayerGameProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [joiningSession, setJoiningSession] = useState(false);

  // Calculer si on doit pauser le polling pour les sessions locales
  const [shouldPausePolling, setShouldPausePolling] = useState(false);

  // Detecter si c'est une session offline
  const isOffline = isOfflineSessionId(sessionId);

  // Calculer l'intervalle de polling optimisé
  const optimizedPollInterval = useMemo(() => {
    // Pour les sessions locales, utiliser un polling beaucoup plus lent
    // mais pas complètement arrêté pour détecter quand de nouveaux joueurs rejoignent
    return shouldPausePolling ? 30000 : undefined; // 30s pour sessions locales vs 2s par défaut
  }, [shouldPausePolling]);

  // Use realtime session hook only for online sessions
  const {
    session: realtimeSession,
    events,
    isConnected,
    error,
    lastUpdate,
    currentUserId,
    connectionStatus,
    addRound,
    deleteRound,
    forceRefresh,
    isLocalSession: isLocalFromServer
  } = useSimpleRealtimeSession<T>({
    sessionId,
    gameSlug,
    pollInterval: optimizedPollInterval,
    enabled: !isOffline, // Disable realtime polling for offline sessions
    onError: useCallback(() => {
      // Silent error handling
    }, [])
  });

  const session = realtimeSession;
  const permissions = useGamePermissions(currentUserId);

  // Effet séparé pour gérer la détection de session locale (seulement pour sessions online)
  useEffect(() => {
    if (isOffline || !session) return;

    const isLocal = isLocalSession(session, currentUserId);

    if (isLocal !== shouldPausePolling) {
      setShouldPausePolling(isLocal);
    }
  }, [session, currentUserId, shouldPausePolling, isOffline]);
  
  // Calculate permissions with session context (for offline sessions, provide defaults)
  const canJoinSession = isOffline ? false : permissions.canJoinSession(session);
  const canViewSession = isOffline ? true : permissions.canViewSession(session);
  const canStartGame = isOffline ? false : permissions.canStartGame(session);
  const isHost = isOffline ? true : (session ? permissions.isHost(session.host_user_id, currentUserId) : false);

  // Handle joining the session (skip for offline sessions)
  const handleJoinSession = async () => {
    if (isOffline || !playerName.trim()) return;

    setJoiningSession(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          playerName: playerName.trim(),
          player2Name: player2Name.trim() || undefined,
          guestId: getGuestId()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la connexion');
      }

      // Refresh the session data to show the user is now in the session
      // The realtime hook will handle the update
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Erreur lors de la connexion');
    } finally {
      setJoiningSession(false);
    }
  };

  // Handle starting the game (host only, skip for offline sessions)
  const handleStartGame = async () => {
    if (isOffline) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ guestId: getGuestId() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Force immediate refresh to show the game has started
      forceRefresh();
    } catch (_error) {
      // Handle start game error silently
    }
  };

  // Handle leaving the session (skip for offline sessions)
  const handleLeaveSession = useCallback(async () => {
    if (isOffline) {
      // For offline sessions, just navigate back to dashboard
      router.push('/dashboard');
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ guestId: getGuestId() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sortie');
      }

      const result = await response.json();

      // Afficher un message informatif selon le résultat
      if (result.sessionDeleted) {
        // Session supprimée car plus personne
      } else if (result.hostTransferred) {
        // L'hôte a été transféré
      }

      // Rediriger vers le dashboard
      router.push('/dashboard');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Erreur lors de la sortie');
    }
  }, [isOffline, router, sessionId]);

  // Smart navigation that handles leaving session when appropriate
  const goToDashboard = useCallback(() => {
    if (isOffline) {
      // For offline sessions, just navigate back to dashboard
      router.push('/dashboard');
      return;
    }

    // Si nous sommes dans une session active, quitter proprement
    if (session && currentUserId && permissions.isUserInSession(session.players, currentUserId)) {
      handleLeaveSession();
    } else {
      // Sinon, navigation directe
      router.push('/dashboard');
    }
  }, [session, currentUserId, permissions, handleLeaveSession, router, isOffline]);

  return {
    // Session data (for offline sessions, provide defaults)
    session,
    events: isOffline ? [] : events,
    isConnected: isOffline ? true : isConnected, // Offline sessions are always "connected"
    error: isOffline ? null : error,
    lastUpdate: isOffline ? new Date() : lastUpdate,
    currentUserId: isOffline ? 1 : currentUserId, // Offline sessions have default user ID
    connectionStatus: isOffline ? 'connected' : connectionStatus,
    isLocalSession: isOffline ? true : isLocalFromServer, // Offline sessions are always local

    // Permissions
    canJoinSession,
    canViewSession,
    canStartGame,
    canEditPlayerScores: isOffline
      ? () => true // Offline sessions allow all edits
      : (player: Player) => permissions.canEditPlayerScores(player, session),
    isHost,

    // Join functionality
    playerName,
    setPlayerName,
    player2Name,
    setPlayer2Name,
    joiningSession,
    handleJoinSession,

    // Game control (for offline sessions, provide no-op functions)
    handleStartGame,
    handleLeaveSession,
    addRound: isOffline ? async () => {} : addRound, // No-op for offline
    deleteRound: isOffline ? async () => {} : deleteRound, // No-op for offline
    forceRefresh: isOffline ? async () => {} : forceRefresh, // No-op for offline

    // Navigation
    goToDashboard
  };
}