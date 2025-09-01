/**
 * Refactored Mille Bornes Équipes scoresheet
 * Simplified version using extracted components and hooks
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import PlayerScoreCard from './millebornes/PlayerScoreCard';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { 
  MilleBornesRoundData, 
  MilleBornesPrimes, 
  GameVariant 
} from '@/constants/millebornes';
import { 
  createEmptyRoundData, 
  getTeamPlayers, 
  getDisplayTeamId,
  formatScore,
  checkVictoryCondition
} from '@/utils/millebornes';
import { useMilleBornesScore } from '@/hooks/useMilleBornesScore';
import GameCard from '@/components/layout/GameCard';
import { Trophy, Users, Target } from 'lucide-react';

interface Props {
  sessionId: string;
}

export default function MilleBornesEquipesRefactored({ sessionId }: Props) {
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId}
      gameSlug="mille-bornes-equipes"
    >
      {({ session, gameState }) => (
        <MilleBornesGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

interface GameInterfaceProps {
  session: GameSessionWithRounds;
  gameState: ReturnType<typeof import('@/hooks/useMultiplayerGame').default>;
}

function MilleBornesGameInterface({ session, gameState }: GameInterfaceProps) {
  const { addRound, isHost, currentUserId } = gameState;
  
  // State
  const [gameVariant, setGameVariant] = useState<GameVariant>('classic');
  const [roundData, setRoundData] = useState<MilleBornesRoundData>(() => 
    createEmptyRoundData(session.players.map(p => p.id))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Team logic
  const myTeamId = session.players.find(p => p.user_id === currentUserId)?.team_id || 1;
  const displayTeamId = getDisplayTeamId(myTeamId);
  const myTeamPlayerIds = getTeamPlayers(session.players, myTeamId);
  const otherTeamId = myTeamId === 1 ? 2 : 1;
  const otherTeamPlayerIds = getTeamPlayers(session.players, otherTeamId);
  
  // Score calculation hook
  const { calculatePlayerScore, calculateTeamScore } = useMilleBornesScore(roundData, gameVariant);
  
  // Calculate current scores
  const myTeamScore = calculateTeamScore(myTeamPlayerIds);
  const otherTeamScore = calculateTeamScore(otherTeamPlayerIds);
  
  // Calculate total scores including previous rounds
  const myTeamPreviousTotal = session.rounds?.reduce((total, round) => {
    const roundScore = myTeamPlayerIds.reduce((sum, playerId) => 
      sum + (round.scores[playerId] || 0), 0
    );
    return total + roundScore;
  }, 0) || 0;
  
  const otherTeamPreviousTotal = session.rounds?.reduce((total, round) => {
    const roundScore = otherTeamPlayerIds.reduce((sum, playerId) => 
      sum + (round.scores[playerId] || 0), 0
    );
    return total + roundScore;
  }, 0) || 0;
  
  const myTeamTotalScore = myTeamScore + myTeamPreviousTotal;
  const otherTeamTotalScore = otherTeamScore + otherTeamPreviousTotal;
  
  // Handlers
  const handleDistanceChange = useCallback((playerId: number, distance: number) => {
    setRoundData(prev => ({
      ...prev,
      distances: {
        ...prev.distances,
        [playerId]: distance
      }
    }));
  }, []);
  
  const handlePrimeChange = useCallback((playerId: number, key: keyof MilleBornesPrimes, value: boolean) => {
    setRoundData(prev => ({
      ...prev,
      primes: {
        ...prev.primes,
        [playerId]: {
          ...prev.primes[playerId],
          [key]: value
        }
      }
    }));
  }, []);
  
  const handleSubmitRound = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const scores = session.players.map(player => ({
        playerId: player.id,
        score: calculatePlayerScore(player.id)
      }));
      
      await addRound(scores, { gameVariant, roundData });
      
      // Reset for next round
      setRoundData(createEmptyRoundData(session.players.map(p => p.id)));
    } catch (error) {
      console.error('Error submitting round:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const canSubmit = myTeamPlayerIds.some(id => 
    (roundData.distances[id] || 0) > 0
  );
  
  return (
    <div className="space-y-6">
      {/* Game Header */}
      <GameCard
        title="Mille Bornes - Équipes"
        subtitle={`Manche ${(session.rounds?.length || 0) + 1}`}
        icon={<Target className="h-8 w-8 text-blue-600" />}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Mon équipe</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatScore(myTeamTotalScore)}
            </div>
            {checkVictoryCondition(myTeamTotalScore) && (
              <Trophy className="inline-block h-5 w-5 text-yellow-500 ml-2" />
            )}
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">Équipe adverse</div>
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {formatScore(otherTeamTotalScore)}
            </div>
            {checkVictoryCondition(otherTeamTotalScore) && (
              <Trophy className="inline-block h-5 w-5 text-yellow-500 ml-2" />
            )}
          </div>
        </div>
      </GameCard>
      
      {/* Game Variant Selector */}
      {isHost && (session.rounds?.length || 0) === 0 && (
        <GameCard title="Variante de jeu">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={gameVariant === 'classic'}
                onChange={() => setGameVariant('classic')}
                className="w-4 h-4 text-blue-600"
              />
              <span>Classique</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={gameVariant === 'extension'}
                onChange={() => setGameVariant('extension')}
                className="w-4 h-4 text-blue-600"
              />
              <span>Extension</span>
            </label>
          </div>
        </GameCard>
      )}
      
      {/* My Team Section */}
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <Users className="h-6 w-6" />
          Mon équipe (Équipe {displayTeamId})
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {myTeamPlayerIds.map(playerId => {
            const player = session.players.find(p => p.id === playerId);
            if (!player) return null;
            
            return (
              <PlayerScoreCard
                key={playerId}
                playerId={playerId}
                playerName={player.player_name}
                roundData={roundData}
                gameVariant={gameVariant}
                score={calculatePlayerScore(playerId)}
                onDistanceChange={(distance) => handleDistanceChange(playerId, distance)}
                onPrimeChange={(key, value) => handlePrimeChange(playerId, key, value)}
                readonly={false}
              />
            );
          })}
        </div>
      </div>
      
      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmitRound}
          disabled={!canSubmit || isSubmitting}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200"
        >
          {isSubmitting ? 'Validation en cours...' : 'Valider la manche'}
        </button>
      </div>
      
      {/* Other Team Section (readonly) */}
      {otherTeamPlayerIds.length > 0 && (
        <div className="space-y-4 opacity-75">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-700 dark:text-gray-300">
            <Users className="h-6 w-6" />
            Équipe adverse (Équipe {displayTeamId === 1 ? 2 : 1})
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {otherTeamPlayerIds.map(playerId => {
              const player = session.players.find(p => p.id === playerId);
              if (!player) return null;
              
              return (
                <PlayerScoreCard
                  key={playerId}
                  playerId={playerId}
                  playerName={player.player_name}
                  roundData={roundData}
                  gameVariant={gameVariant}
                  score={calculatePlayerScore(playerId)}
                  readonly={true}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Previous Rounds Summary */}
      {session.rounds && session.rounds.length > 0 && (
        <GameCard title="Historique des manches">
          <div className="space-y-2">
            {session.rounds.map((round, index) => (
              <div key={index} className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">
                  Manche {index + 1}
                </span>
                <div className="flex gap-8">
                  <span className="text-blue-600 dark:text-blue-400">
                    Équipe {displayTeamId}: {formatScore(
                      myTeamPlayerIds.reduce((sum, id) => sum + (round.scores[id] || 0), 0)
                    )}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Équipe {displayTeamId === 1 ? 2 : 1}: {formatScore(
                      otherTeamPlayerIds.reduce((sum, id) => sum + (round.scores[id] || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 font-bold">
              <span>Total</span>
              <div className="flex gap-8">
                <span className="text-blue-600 dark:text-blue-400">
                  {formatScore(myTeamTotalScore)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatScore(otherTeamTotalScore)}
                </span>
              </div>
            </div>
          </div>
        </GameCard>
      )}
    </div>
  );
}