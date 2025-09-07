'use client';

import React from 'react';
import GameLayout from '@/components/layout/GameLayout';
import RankingSidebar from '@/components/layout/RankingSidebar';
import WaitingRoom from '@/components/multiplayer/WaitingRoom';
import { StatusBar } from '@/components/multiplayer/StatusBar';
import { LoadingState, ErrorState, JoinSessionForm } from '@/components/multiplayer/GameStates';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { GameSessionWithCategories, GameSessionWithRounds } from '@/types/multiplayer';
import ErrorBoundary from '@/components/ErrorBoundary';

interface BaseScoreSheetProps<T> {
  sessionId: string;
  gameSlug: string;
  children: (params: {
    session: T;
    gameState: ReturnType<typeof useMultiplayerGame>;
  }) => React.ReactNode;
  rankingComponent?: (params: { session: T }) => React.ReactNode;
}

/**
 * Base component for all multiplayer scoresheets
 * Handles common multiplayer logic: loading, error states, waiting room, etc.
 * Reduces duplication across 7+ scoresheet components
 */
export default function BaseScoreSheetMultiplayer<T extends GameSessionWithCategories | GameSessionWithRounds>({ 
  sessionId, 
  gameSlug,
  children,
  rankingComponent 
}: BaseScoreSheetProps<T>) {
  
  const gameState = useMultiplayerGame<T>({ sessionId, gameSlug });
  
  const {
    session,
    error,
    connectionStatus,
    playerName,
    setPlayerName,
    player2Name,
    setPlayer2Name,
    joiningSession,
    handleJoinSession,
    currentUserId,
    canStartGame,
    canJoinSession,
    canViewSession,
    handleStartGame,
    handleLeaveSession,
    goToDashboard
  } = gameState;

  // Loading state
  if (!session && !error) {
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState 
        error={error}
        onBack={goToDashboard}
      />
    );
  }

  // Check if user has access to this session
  if (session && !canViewSession) {
    return (
      <ErrorState 
        error="Accès refusé à cette session"
        onBack={goToDashboard}
      />
    );
  }

  // Join session state (user can view session but can still join as new player)
  if (canJoinSession && session) {
    return (
      <JoinSessionForm
        sessionName={session.session_name || 'Partie en cours'}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        player2Name={player2Name}
        onPlayer2NameChange={setPlayer2Name}
        onJoin={handleJoinSession}
        onCancel={goToDashboard}
        isJoining={joiningSession}
        gameSlug={gameSlug}
      />
    );
  }

  // Should have session by now
  if (!session) {
    return (
      <ErrorState 
        error="Session non trouvée"
        onBack={goToDashboard}
      />
    );
  }

  // Validate that the URL gameSlug matches the actual session game
  if (session.game_slug && gameSlug !== session.game_slug) {
    return (
      <ErrorState 
        error={`Cette session est pour le jeu "${session.game_name}" (${session.game_slug}), pas pour "${gameSlug}". Vérifiez l'URL.`}
        onBack={goToDashboard}
      />
    );
  }

  // Waiting room state
  if (session.status === 'waiting') {
    return (
      <WaitingRoom
        session={session}
        currentUserId={currentUserId}
        canStartGame={canStartGame}
        onStartGame={handleStartGame}
        onBack={handleLeaveSession}
      />
    );
  }


  // Game active - render the actual scoresheet with error boundary
  return (
    <ErrorBoundary
      fallback={
        <ErrorState 
          error="Erreur dans le composant de jeu"
          onBack={goToDashboard}
        />
      }
    >
      <GameLayout
        session={session}
        onLeaveSession={handleLeaveSession}
        showRanking={!gameState.isLocalSession}
        rankingComponent={
          !gameState.isLocalSession && (
            rankingComponent ? (
              rankingComponent({ session })
            ) : (
              <RankingSidebar session={session} />
            )
          )
        }
      >
        {/* Status Bar - only show for networked sessions */}
        {!gameState.isLocalSession && (
          <StatusBar 
            connectionStatus={connectionStatus}
            playersCount={session.players?.length || 0}
            isEditing={false}
            lastUpdate={gameState.lastUpdate}
            gameStatus={session.status || 'active'}
          />
        )}

        {/* Game-specific content wrapped in error boundary */}
        <ErrorBoundary>
          {children({ session, gameState })}
        </ErrorBoundary>
      </GameLayout>
    </ErrorBoundary>
  );
}