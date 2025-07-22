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
  
  const gameState = useMultiplayerGame<T>({ sessionId });
  
  const {
    session,
    error,
    isConnected,
    connectionStatus,
    playerName,
    setPlayerName,
    joiningSession,
    handleJoinSession,
    currentUserId,
    canStartGame,
    canJoinSession,
    isHost,
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
        onRetry={() => window.location.reload()}
        onGoToDashboard={goToDashboard}
      />
    );
  }

  // Join session state (no session but can join)
  if (!session && canJoinSession) {
    return (
      <JoinSessionForm
        playerName={playerName}
        setPlayerName={setPlayerName}
        onJoin={handleJoinSession}
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
        onGoToDashboard={goToDashboard}
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
        onLeaveSession={handleLeaveSession}
      />
    );
  }

  // Game active - render the actual scoresheet with error boundary
  return (
    <ErrorBoundary
      fallback={
        <ErrorState 
          error="Erreur dans le composant de jeu"
          onGoToDashboard={goToDashboard}
        />
      }
    >
      <GameLayout
        session={session}
        onLeaveSession={handleLeaveSession}
        showRanking={true}
        rankingComponent={
          rankingComponent ? (
            rankingComponent({ session })
          ) : (
            <RankingSidebar session={session} />
          )
        }
      >
        {/* Status Bar */}
        <StatusBar 
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          lastUpdate={gameState.lastUpdate}
          currentRound={session.current_round || 0}
          totalPlayers={session.players?.length || 0}
        />

        {/* Game-specific content wrapped in error boundary */}
        <ErrorBoundary>
          {children({ session, gameState })}
        </ErrorBoundary>
      </GameLayout>
    </ErrorBoundary>
  );
}