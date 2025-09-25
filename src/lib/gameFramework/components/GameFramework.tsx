'use client';

import React from 'react';
import BaseScoreSheetMultiplayer from '@/components/scoresheets/BaseScoreSheetMultiplayer';
import TeamScoreDisplay from './TeamScoreDisplay';
import IndividualScoreDisplay from './IndividualScoreDisplay';
import RoundHistory from './RoundHistory';
import DynamicForm from './DynamicForm';
import { useGameLogic } from '../useGameLogic';
import { GameDefinition, GameFrameworkProps } from '../types';
import { GameSessionWithRounds, GameSessionWithCategories } from '@/types/multiplayer';

/**
 * Composant principal du Game Framework
 * Génère automatiquement une interface de jeu complète à partir d'une GameDefinition
 */
export default function GameFramework({ sessionId, definition }: GameFrameworkProps) {
  
  if (definition.scoreType === 'categories') {
    return (
      <BaseScoreSheetMultiplayer<GameSessionWithCategories> sessionId={sessionId} gameSlug={definition.slug}>
        {({ session, gameState }) => (
          <GameInterface 
            session={session} 
            gameState={gameState} 
            definition={definition}
          />
        )}
      </BaseScoreSheetMultiplayer>
    );
  }

  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds> sessionId={sessionId} gameSlug={definition.slug}>
      {({ session, gameState }) => (
        <GameInterface 
          session={session} 
          gameState={gameState} 
          definition={definition}
        />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

interface GameInterfaceProps {
  session: GameSessionWithRounds | GameSessionWithCategories;
  gameState: any;
  definition: GameDefinition;
}

function GameInterface({ session, gameState, definition }: GameInterfaceProps) {
  const { isHost } = gameState;
  
  // Attendre que la session soit complètement chargée
  if (!session) {
    return <div>Chargement de la session...</div>;
  }
  
  if (!session.players || !Array.isArray(session.players)) {
    return <div>Chargement des joueurs...</div>;
  }
  const gameLogic = useGameLogic({
    definition,
    session,
    gameState
  });

  const {
    roundData,
    setRoundData,
    isSubmitting,
    handleSubmitRound,
    getTotalScore,
    getTeamScore,
    getCurrentRound
  } = gameLogic;

  // Déterminer le titre du formulaire
  const roundLabel = definition.ui.texts?.roundLabel || 'manche';
  const formTitle = definition.ui.roundForm.title || 
    `Ajouter la ${roundLabel} ${getCurrentRound()}`;
  const submitLabel = definition.ui.roundForm.submitLabel ||
    `Valider la ${roundLabel} ${getCurrentRound()}`;

  return (
    <div className="space-y-6">
      {/* Score Display */}
      {definition.ui.layout.type === 'teams' ? (
        <TeamScoreDisplay
          teams={definition.ui.layout.teams || []}
          session={session}
          getTotalScore={getTotalScore}
          getTeamScore={getTeamScore!}
          targetScore={definition.ui.layout.scoreDisplay.targetScore}
        />
      ) : (
        <IndividualScoreDisplay
          session={session}
          getTotalScore={getTotalScore}
          targetScore={definition.ui.layout.scoreDisplay.targetScore}
          showRankings={definition.ui.layout.scoreDisplay.showRankings}
          theme={definition.ui.theme}
        />
      )}

      {/* Round History */}
      <RoundHistory
        session={session}
        layout={definition.ui.layout}
        roundLabel={definition.ui.texts?.roundLabel}
      />

      {/* Add Round Form - Only for host */}
      {isHost && (
        <DynamicForm
          title={formTitle}
          fields={definition.ui.roundForm.fields}
          data={roundData}
          setData={setRoundData}
          onSubmit={handleSubmitRound}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />
      )}

      {/* Game Finished State */}
      {gameLogic.isGameFinished && gameLogic.winner && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-2">
            🎉 Partie terminée !
          </h2>
          <p className="text-lg">
            <span className="font-semibold">{gameLogic.winner.player_name}</span> remporte la victoire !
          </p>
        </div>
      )}
    </div>
  );
}