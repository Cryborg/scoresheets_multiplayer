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
import OfflineScoreSheet from '@/components/offline/OfflineScoreSheet';
import { isOfflineSessionId } from '@/hooks/useOfflineSession';

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
  const isOffline = isOfflineSessionId(sessionId);

  // Always call useMultiplayerGame to follow React hooks rules
  // For offline sessions, the gameSlug will be handled appropriately
  const gameState = useMultiplayerGame<T>({ sessionId, gameSlug });

  // Détection des sessions offline et redirection vers le composant approprié
  if (isOffline) {
    return (
      <OfflineScoreSheet sessionId={sessionId} gameSlug={gameSlug}>
        {({ session, gameState }) => {
          // Adapter les données offline vers le format online pour réutiliser l'interface
          const adaptedSession = {
            ...session,
            // Convertir les joueurs offline vers le format online attendu
            players: session.players.map((player, index) => ({
              id: index + 1, // ID séquentiel unique basé sur la position
              player_name: player.name,
              position: player.position,
              team_id: player.team_id || null,
              current_total: session.scores
                .filter(score => score.player_id === player.id)
                .reduce((sum, score) => sum + score.score, 0)
            })),
            // Adapter les rounds pour correspondre au format attendu par RoundBasedScoreSheet
            rounds: session.scores.reduce((rounds: Array<{ round_number: number; scores: Record<number, number> }>, score) => {
              if (!score || !score.player_id) return rounds; // Skip invalid scores

              const roundIndex = score.round_number || 1;
              if (!rounds[roundIndex - 1]) {
                rounds[roundIndex - 1] = {
                  round_number: roundIndex,
                  scores: {} // Object indexé par player.id, pas array
                };
              }
              // Trouver l'index du joueur pour avoir un ID cohérent
              const playerIndex = session.players.findIndex(p => p.id === score.player_id);
              if (playerIndex >= 0) { // Only add if player exists
                const playerId = playerIndex + 1; // Même logique d'ID séquentiel
                // RoundBasedScoreSheet attend round.scores[player.id] = score
                rounds[roundIndex - 1].scores[playerId] = score.score || 0;
              }
              return rounds;
            }, [])
          } as T;

          // Adapter gameState offline vers format online
          const adaptedGameState = {
            session: adaptedSession,
            addRound: async (scores: Array<{ playerId: number; score: number }>, details?: Record<string, unknown>) => {
              // Calculer le numéro de la prochaine manche
              const currentRounds = adaptedSession.rounds || [];
              const nextRoundNumber = currentRounds.length + 1;

              console.log(`🎲 [addRound] Ajout manche ${nextRoundNumber} avec ${scores.length} scores`);

              // Convertir les IDs numériques back vers les IDs offline string
              const offlineScores = scores.map(({ playerId, score }) => {
                // playerId est un index séquentiel (1, 2, 3...), convertir vers l'ID offline
                const playerIndex = playerId - 1; // Convertir back vers index 0-based
                const offlinePlayer = session.players[playerIndex];
                return {
                  playerId: offlinePlayer?.id || `offline_${playerId}`,
                  score,
                  roundNumber: nextRoundNumber, // round_number comme champ direct
                  details
                };
              });

              // Ajouter chaque score individuellement avec le bon round_number
              for (const { playerId, score, roundNumber, details } of offlineScores) {
                // Modifier addScore pour accepter round_number
                await gameState.addScore(playerId, score, details, roundNumber);
              }

              console.log(`✅ [addRound] Manche ${nextRoundNumber} ajoutée avec succès`);
            },
            isHost: gameState.isHost,
            // Autres propriétés nécessaires...
            connectionStatus: 'connected' as const,
            canStartGame: false,
            canJoinSession: false,
            canViewSession: true,
            handleStartGame: gameState.startGame,
            handleLeaveSession: async () => {},
            goToDashboard: () => window.location.href = '/dashboard'
          };


          try {
            // Utiliser l'interface normale avec les données adaptées
            return children({ session: adaptedSession, gameState: adaptedGameState });
          } catch (error) {
            console.error('❌ [BaseScoreSheetMultiplayer] Erreur dans children:', error);
            return (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-red-800 font-semibold mb-2">Erreur d&apos;interface offline</h3>
                <p className="text-red-600 text-sm">
                  Une erreur est survenue lors de l&apos;adaptation des données offline.
                </p>
                <pre className="text-xs text-red-500 mt-2 overflow-auto">
                  {error instanceof Error ? error.message : 'Erreur inconnue'}
                </pre>
              </div>
            );
          }
        }}
      </OfflineScoreSheet>
    );
  }


  // Online session logic - only destructure if gameState exists
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
  } = gameState || {};

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
        showRanking={!gameState?.isLocalSession}
        rankingComponent={
          !gameState?.isLocalSession && (
            rankingComponent ? (
              rankingComponent({ session })
            ) : (
              <RankingSidebar session={session} />
            )
          )
        }
      >
        {/* Status Bar - only show for networked sessions */}
        {!gameState?.isLocalSession && (
          <StatusBar
            connectionStatus={connectionStatus}
            playersCount={session?.players?.length || 0}
            isEditing={false}
            lastUpdate={gameState?.lastUpdate}
            gameStatus={session?.status || 'active'}
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