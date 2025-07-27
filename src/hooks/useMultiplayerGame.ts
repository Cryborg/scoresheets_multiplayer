'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeSession } from './useRealtimeSession';
import { useGamePermissions } from './useGamePermissions';
import { GameSession } from '@/types/multiplayer';
import { notify } from '@/lib/toast';

interface UseMultiplayerGameProps {
  sessionId: string;
  gameSlug?: string;
}

export function useMultiplayerGame<T extends GameSession>({ sessionId, gameSlug }: UseMultiplayerGameProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [joiningSession, setJoiningSession] = useState(false);

  // Use realtime session hook
  const {
    session: realtimeSession,
    events,
    isConnected,
    error,
    lastUpdate,
    currentUserId,
    connectionStatus,
    addRound
  } = useRealtimeSession<T>({
    sessionId,
    gameSlug,
    onError: useCallback(() => {
      // Silent error handling
    }, [])
  });

  const session = realtimeSession;
  const permissions = useGamePermissions(currentUserId);
  
  // Calculate permissions with session context
  const canJoinSession = permissions.canJoinSession(session);
  const canViewSession = permissions.canViewSession(session);
  const canStartGame = permissions.canStartGame(session);
  const isHost = session ? permissions.isHost(session.host_user_id, currentUserId) : false;

  // Handle joining the session
  const handleJoinSession = async () => {
    if (!playerName.trim()) return;
    
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
          player2Name: player2Name.trim() || undefined
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

  // Handle starting the game (host only)
  const handleStartGame = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // The realtime hook will pick up the status change
    } catch (error) {
      // Handle start game error silently
    }
  };

  // Handle leaving the session
  const handleLeaveSession = async () => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
  };

  // Smart navigation that handles leaving session when appropriate
  const goToDashboard = useCallback(() => {
    // Si nous sommes dans une session active, quitter proprement
    if (session && currentUserId && permissions.isUserInSession(session.players, currentUserId)) {
      handleLeaveSession();
    } else {
      // Sinon, navigation directe
      router.push('/dashboard');
    }
  }, [session, currentUserId, permissions, handleLeaveSession, router]);

  return {
    // Session data
    session,
    events,
    isConnected,
    error,
    lastUpdate,
    currentUserId,
    connectionStatus,
    
    // Permissions
    canJoinSession,
    canViewSession,
    canStartGame,
    canEditPlayerScores: (player: any) => permissions.canEditPlayerScores(player, session),
    isHost,
    
    // Join functionality
    playerName,
    setPlayerName,
    player2Name,
    setPlayer2Name,
    joiningSession,
    handleJoinSession,
    
    // Game control
    handleStartGame,
    handleLeaveSession,
    addRound,
    
    // Navigation
    goToDashboard
  };
}