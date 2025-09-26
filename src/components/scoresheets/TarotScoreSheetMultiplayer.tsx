'use client';

import { useState, useCallback } from 'react';
import { Crown } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameCard from '@/components/layout/GameCard';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { useErrorHandler } from '@/contexts/ErrorContext';

// Extension spécifique pour Tarot avec details typés
interface TarotGameSession extends GameSessionWithRounds {
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
    details?: {
      taker_id: number;
      contract: string;
      points: number;
      oudlers: number;
      petit_au_bout?: boolean;
      chelem?: boolean;
    };
  }>;
}

interface TarotContract {
  name: string;
  basePoints: number;
  multiplier: number;
}

interface TarotRoundData {
  takerId: number;
  contract: string;
  points: number;
  oudlers: number;
  petitAuBout: boolean;
  chelem: boolean;
}

const TAROT_CONTRACTS: TarotContract[] = [
  { name: 'Prise', basePoints: 25, multiplier: 1 },
  { name: 'Garde', basePoints: 25, multiplier: 2 },
  { name: 'Garde sans', basePoints: 25, multiplier: 4 },
  { name: 'Garde contre', basePoints: 25, multiplier: 6 }
];

const OUDLERS_POINTS = [56, 51, 46, 36]; // Points nécessaires selon nombre d'oudlers (0,1,2,3)

export default function TarotScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<TarotGameSession> sessionId={sessionId} gameSlug="tarot">
      {({ session, gameState }) => (
        <TarotGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function TarotGameInterface({
  session,
  gameState
}: {
  session: TarotGameSession;
  gameState: ReturnType<typeof useMultiplayerGame>;
}) {
  const { addRound, isHost } = gameState;
  const { showError } = useErrorHandler();
  
  const [newRound, setNewRound] = useState<TarotRoundData>({
    takerId: 0,
    contract: 'Prise',
    points: 0,
    oudlers: 0,
    petitAuBout: false,
    chelem: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTarotScore = useCallback((data: TarotRoundData) => {
    if (!session?.players) return {};
    const contract = TAROT_CONTRACTS.find(c => c.name === data.contract);
    if (!contract) return {};

    const taker = session.players.find(p => p.id === data.takerId);
    if (!taker) return {};

    const requiredPoints = OUDLERS_POINTS[data.oudlers];
    const difference = data.points - requiredPoints;
    const success = difference >= 0;

    let baseScore = contract.basePoints + Math.abs(difference);

    // Bonifications
    if (data.petitAuBout) baseScore += 10;
    if (data.chelem) baseScore += success ? 400 : -200;

    const takerScore = (success ? baseScore : -baseScore) * contract.multiplier;
    const otherPlayersScore = -Math.round(takerScore / (session.players.length - 1));

    const scores: { [key: number]: number } = {};
    session.players.forEach(player => {
      scores[player.id] = player.id === data.takerId ? takerScore : otherPlayersScore;
    });

    return scores;
  }, [session?.players]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || newRound.takerId === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const calculatedScores = calculateTarotScore(newRound);
      const scoresArray = Object.entries(calculatedScores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));

      await addRound(scoresArray, {
        taker_id: newRound.takerId,
        contract: newRound.contract,
        points: newRound.points,
        oudlers: newRound.oudlers,
        petit_au_bout: newRound.petitAuBout,
        chelem: newRound.chelem
      });

      // Reset form
      setNewRound({
        takerId: 0,
        contract: 'Prise',
        points: 0,
        oudlers: 0,
        petitAuBout: false,
        chelem: false
      });
    } catch (error) {
      showError('Erreur lors de l\'ajout de la manche', 'scoreSheet', {
        game: 'tarot',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, calculateTarotScore, addRound, showError]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  const currentRound = (session?.rounds?.length || 0) + 1;

  return (
    <div className="space-y-6">
      {/* Scores Table */}
      <GameCard title="Scores">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Joueur</th>
                {session?.rounds?.map((_, index) => (
                  <th key={index} className="text-center p-2 min-w-16">M{index + 1}</th>
                ))}
                <th className="text-center p-2 font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {session?.players?.map((player) => (
                <tr key={player.id} className="border-b dark:border-gray-700">
                  <td className="p-2 font-medium">
                    <div className="flex items-center gap-2">
                      {session.host_user_id === player.user_id && (
                        <Crown className="h-4 w-4 text-yellow-500" title="Hôte" />
                      )}
                      {player.player_name}
                    </div>
                  </td>
                  {session?.rounds?.map((round, roundIndex) => (
                    <td key={roundIndex} className="text-center p-2">
                      <span className={round.scores[player.id] > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {round.scores[player.id] || 0}
                      </span>
                    </td>
                  ))}
                  <td className="text-center p-2 font-bold text-lg">
                    <span className={getTotalScore(player.id) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {getTotalScore(player.id)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GameCard>

      {/* Add Round Form - Only for host */}
      {isHost && (
        <GameCard title={`Ajouter la manche ${currentRound}`}>
          <div className="space-y-4">
            {/* Taker Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Preneur</label>
              <select
                value={newRound.takerId}
                onChange={(e) => setNewRound(prev => ({ ...prev, takerId: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value={0}>Sélectionner le preneur</option>
                {session?.players?.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.player_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Contract Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Contrat</label>
              <select
                value={newRound.contract}
                onChange={(e) => setNewRound(prev => ({ ...prev, contract: e.target.value }))}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                {TAROT_CONTRACTS.map(contract => (
                  <option key={contract.name} value={contract.name}>
                    {contract.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Points and Oudlers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Points du preneur</label>
                <ScoreInput
                  value={newRound.points}
                  onChange={(value) => setNewRound(prev => ({ ...prev, points: value }))}
                  placeholder="Points"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nombre d&apos;oudlers</label>
                <select
                  value={newRound.oudlers}
                  onChange={(e) => setNewRound(prev => ({ ...prev, oudlers: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  {[0, 1, 2, 3].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bonifications */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRound.petitAuBout}
                  onChange={(e) => setNewRound(prev => ({ ...prev, petitAuBout: e.target.checked }))}
                  className="mr-2"
                />
                Petit au bout (+10 points)
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRound.chelem}
                  onChange={(e) => setNewRound(prev => ({ ...prev, chelem: e.target.checked }))}
                  className="mr-2"
                />
                Chelem (+400 si réussi, -200 si échoué)
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitRound}
              disabled={newRound.takerId === 0 || isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Ajout en cours...' : `Ajouter la manche ${currentRound}`}
            </button>
          </div>
        </GameCard>
      )}

      {/* Rounds History */}
      {session?.rounds && session.rounds.length > 0 && (
        <GameCard title="Historique des manches">
          <div className="space-y-3">
            {session.rounds.map((round, index) => {
              const details = round.details;
              const taker = session.players?.find(p => p.id === details?.taker_id);
              return (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">Manche {round.round_number}</div>
                      {details && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {taker?.player_name} - {details.contract} - {details.points} pts ({details.oudlers} oudlers)
                          {details.petit_au_bout && ' - Petit au bout'}
                          {details.chelem && ' - Chelem'}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Scores: {Object.entries(round.scores).map(([playerId, score]) => {
                          const player = session.players?.find(p => p.id === parseInt(playerId));
                          return `${player?.player_name}: ${score > 0 ? '+' : ''}${score}`;
                        }).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </GameCard>
      )}
    </div>
  );
}