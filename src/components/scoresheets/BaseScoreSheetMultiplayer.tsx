'use client';

import React, { memo, useMemo } from 'react';
import GameLayout from '@/components/layout/GameLayout';
import RankingSidebar from '@/components/layout/RankingSidebar';
import WaitingRoom from '@/components/multiplayer/WaitingRoom';
import { StatusBar } from '@/components/multiplayer/StatusBar';
import { LoadingState, ErrorState, JoinSessionForm } from '@/components/multiplayer/GameStates';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { GameSessionWithCategories, GameSessionWithRounds } from '@/types/multiplayer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';

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
// Memoized components for performance
const MemoizedRankingSidebar = memo(RankingSidebar);
const MemoizedStatusBar = memo(StatusBar);
const MemoizedWaitingRoom = memo(WaitingRoom);

export default function BaseScoreSheetMultiplayer<T extends GameSessionWithCategories | GameSessionWithRounds>({ 
  sessionId, 
  gameSlug,
  children,
  rankingComponent 
}: BaseScoreSheetProps<T>) {
  
  const gameState = useMultiplayerGame<T>({ sessionId, gameSlug });

  // Development logging
  logger.debug('[BaseScoreSheet] State:', { 
    sessionId, 
    gameSlug, 
    hasSession: !!gameState.session, 
    error: gameState.error,
    status: gameState.session?.status 
  });
  
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

  // Memoized ranking component for performance (must be before any conditional returns)
  const memoizedRankingComponent = useMemo(() => {
    if (!session) return null;
    if (rankingComponent) {
      return rankingComponent({ session });
    }
    return <MemoizedRankingSidebar session={session} />;
  }, [rankingComponent, session]);

  // Loading state
  if (!session && !error) {
    return <LoadingState />;
  }

  // Error state with enhanced logging
  if (error) {
    const isNetworkError = error.toLowerCase().includes('network') || 
                          error.toLowerCase().includes('fetch') ||
                          error.toLowerCase().includes('connection');
    
    logger.error('[BaseScoreSheet] Error occurred:', { 
      error, 
      sessionId, 
      gameSlug, 
      isNetworkError 
    });
    
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

  // Waiting room state
  if (session.status === 'waiting') {
    return (
      <MemoizedWaitingRoom
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
        showRanking={true}
        rankingComponent={memoizedRankingComponent}
      >
        {/* Status Bar */}
        <MemoizedStatusBar 
          connectionStatus={connectionStatus}
          playersCount={session.players?.length || 0}
          isEditing={false}
          lastUpdate={gameState.lastUpdate}
          gameStatus={session.status || 'active'}
        />

        {/* Game-specific content wrapped in error boundary */}
        <ErrorBoundary>
          {children({ session, gameState })}
        </ErrorBoundary>
      </GameLayout>
    </ErrorBoundary>
  );
}