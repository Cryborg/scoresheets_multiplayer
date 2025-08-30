'use client';

import { useState, useCallback } from 'react';
import { Crown, Target, Users } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameCard from '@/components/layout/GameCard';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

interface BeloteGameSession extends GameSessionWithRounds {
  score_target?: number;
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
    details?: {
      team1_points: number;
      team2_points: number;
      team1_announces: number;
      team2_announces: number;
      coinche: boolean;
      surcoinche: boolean;
      taking_team: number;
    };
  }>;
}

interface BeloteRoundData {
  team1Points: number;
  team2Points: number;
  team1Announces: number;
  team2Announces: number;
  coinche: boolean;
  surcoinche: boolean;
  takingTeam: number; // 1 ou 2
}

export default function BeloteScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<BeloteGameSession> sessionId={sessionId} gameSlug="belote">
      {({ session, gameState }) => (
        <BeloteGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function BeloteGameInterface({ 
  session, 
  gameState 
}: { 
  session: BeloteGameSession;
  gameState: any;
}) {
  const { addRound, isHost } = gameState;

  const [newRound, setNewRound] = useState<BeloteRoundData>({
    team1Points: 0,
    team2Points: 0,
    team1Announces: 0,
    team2Announces: 0,
    coinche: false,
    surcoinche: false,
    takingTeam: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateBeloteScore = useCallback((data: BeloteRoundData) => {
    if (!session?.players) return {};

    // Diviser les joueurs en équipes (équipe 1: pos 0,2 - équipe 2: pos 1,3)
    const team1Players = session.players.filter(p => p.position === 0 || p.position === 2);
    const team2Players = session.players.filter(p => p.position === 1 || p.position === 3);

    let team1Score = 0;
    let team2Score = 0;

    // Points de base + annonces
    const team1Total = data.team1Points + data.team1Announces;
    const team2Total = data.team2Points + data.team2Announces;

    // L'équipe qui prend doit faire au moins 82 points
    const takingTeamTotal = data.takingTeam === 1 ? team1Total : team2Total;
    const defendingTeamTotal = data.takingTeam === 1 ? team2Total : team1Total;

    if (takingTeamTotal >= 82) {
      // Réussite - l'équipe qui prend marque ses points
      if (data.takingTeam === 1) {
        team1Score = team1Total;
        // Si l'équipe défendante fait 0, l'équipe prenante fait capot (+90)
        if (defendingTeamTotal === 0) {
          team1Score += 90;
        }
      } else {
        team2Score = team2Total;
        if (defendingTeamTotal === 0) {
          team2Score += 90;
        }
      }
    } else {
      // Échec - l'équipe défendante marque 162 + ses annonces
      if (data.takingTeam === 1) {
        team2Score = 162 + data.team2Announces;
      } else {
        team1Score = 162 + data.team1Announces;
      }
    }

    // Multiplicateurs coinche/surcoinche
    if (data.surcoinche) {
      team1Score *= 4;
      team2Score *= 4;
    } else if (data.coinche) {
      team1Score *= 2;
      team2Score *= 2;
    }

    // Répartir les scores entre les joueurs de chaque équipe
    const scores: { [key: number]: number } = {};
    team1Players.forEach(player => {
      scores[player.id] = team1Score;
    });
    team2Players.forEach(player => {
      scores[player.id] = team2Score;
    });

    return scores;
  }, [session?.players]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    // Validation : au moins une équipe doit avoir des points
    if (newRound.team1Points === 0 && newRound.team2Points === 0) {
      alert('Veuillez saisir au moins des points pour une équipe.');
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedScores = calculateBeloteScore(newRound);
      const scoresArray = Object.entries(calculatedScores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));

      await addRound(scoresArray, {
        team1_points: newRound.team1Points,
        team2_points: newRound.team2Points,
        team1_announces: newRound.team1Announces,
        team2_announces: newRound.team2Announces,
        coinche: newRound.coinche,
        surcoinche: newRound.surcoinche,
        taking_team: newRound.takingTeam
      });

      // Reset form
      setNewRound({
        team1Points: 0,
        team2Points: 0,
        team1Announces: 0,
        team2Announces: 0,
        coinche: false,
        surcoinche: false,
        takingTeam: 1
      });
    } catch (error) {
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, calculateBeloteScore, addRound]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  const getTeamScore = useCallback((teamNumber: 1 | 2) => {
    if (!session?.players) return 0;
    const teamPlayers = session.players.filter(p => 
      teamNumber === 1 ? (p.position === 0 || p.position === 2) : (p.position === 1 || p.position === 3)
    );
    return teamPlayers.reduce((total, player) => total + getTotalScore(player.id), 0) / teamPlayers.length;
  }, [session?.players, getTotalScore]);

  const currentRound = (session?.rounds?.length || 0) + 1;
  const scoreTarget = session?.score_target || 1000;

  // Organiser les joueurs par équipe
  const team1Players = session?.players?.filter(p => p.position === 0 || p.position === 2) || [];
  const team2Players = session?.players?.filter(p => p.position === 1 || p.position === 3) || [];

  return (
    <div className="space-y-6">
      {/* Score Target Display */}
      {session?.score_target && (
        <GameCard title="Objectif">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold">
                Premier à {session.score_target} points
              </span>
            </div>
          </div>
        </GameCard>
      )}

      {/* Teams Score Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GameCard title="Équipe 1" className="border-blue-200 dark:border-blue-800">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {getTeamScore(1)}
              </div>
              <div className="text-sm text-gray-500">Total équipe</div>
            </div>
            <div className="space-y-2">
              {team1Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {session.host_user_id === player.user_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{player.player_name}</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {getTotalScore(player.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GameCard>

        <GameCard title="Équipe 2" className="border-red-200 dark:border-red-800">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {getTeamScore(2)}
              </div>
              <div className="text-sm text-gray-500">Total équipe</div>
            </div>
            <div className="space-y-2">
              {team2Players.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {session.host_user_id === player.user_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{player.player_name}</span>
                  </div>
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    {getTotalScore(player.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GameCard>
      </div>

      {/* Detailed Score Table */}
      <GameCard title="Historique des manches">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Manche</th>
                <th className="text-center p-2 text-blue-600">Équipe 1</th>
                <th className="text-center p-2 text-red-600">Équipe 2</th>
                <th className="text-center p-2">Détails</th>
              </tr>
            </thead>
            <tbody>
              {session?.rounds?.map((round, index) => {
                const team1Score = team1Players.length > 0 ? round.scores[team1Players[0].id] || 0 : 0;
                const team2Score = team2Players.length > 0 ? round.scores[team2Players[0].id] || 0 : 0;
                const details = round.details;
                
                return (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="p-2 font-medium">{round.round_number}</td>
                    <td className="text-center p-2 text-blue-600 font-semibold">
                      {team1Score > 0 ? `+${team1Score}` : team1Score}
                    </td>
                    <td className="text-center p-2 text-red-600 font-semibold">
                      {team2Score > 0 ? `+${team2Score}` : team2Score}
                    </td>
                    <td className="text-center p-2 text-sm text-gray-500">
                      {details && (
                        <div>
                          {details.team1_points}+{details.team1_announces} vs {details.team2_points}+{details.team2_announces}
                          {details.coinche && ' (Coinché)'}
                          {details.surcoinche && ' (Surcoinché)'}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GameCard>

      {/* Add Round Form - Only for host */}
      {isHost && (
        <GameCard title={`Ajouter la manche ${currentRound}`}>
          <div className="space-y-6">
            {/* Taking Team Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Équipe qui prend
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRound(prev => ({ ...prev, takingTeam: 1 }))}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    newRound.takingTeam === 1
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                  }`}
                >
                  <Users className="h-5 w-5 mx-auto mb-2" />
                  Équipe 1
                </button>
                <button
                  type="button"
                  onClick={() => setNewRound(prev => ({ ...prev, takingTeam: 2 }))}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    newRound.takingTeam === 2
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-red-300'
                  }`}
                >
                  <Users className="h-5 w-5 mx-auto mb-2" />
                  Équipe 2
                </button>
              </div>
            </div>

            {/* Points Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Points Équipe 1
                </label>
                <ScoreInput
                  value={newRound.team1Points}
                  onChange={(value) => setNewRound(prev => ({ ...prev, team1Points: value }))}
                  placeholder="Points"
                  min={0}
                  max={162}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Points Équipe 2
                </label>
                <ScoreInput
                  value={newRound.team2Points}
                  onChange={(value) => setNewRound(prev => ({ ...prev, team2Points: value }))}
                  placeholder="Points"
                  min={0}
                  max={162}
                />
              </div>
            </div>

            {/* Announces Input */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Annonces Équipe 1
                </label>
                <ScoreInput
                  value={newRound.team1Announces}
                  onChange={(value) => setNewRound(prev => ({ ...prev, team1Announces: value }))}
                  placeholder="Annonces"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Annonces Équipe 2
                </label>
                <ScoreInput
                  value={newRound.team2Announces}
                  onChange={(value) => setNewRound(prev => ({ ...prev, team2Announces: value }))}
                  placeholder="Annonces"
                  min={0}
                />
              </div>
            </div>

            {/* Coinche/Surcoinche */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRound.coinche}
                  onChange={(e) => setNewRound(prev => ({ 
                    ...prev, 
                    coinche: e.target.checked,
                    surcoinche: e.target.checked ? prev.surcoinche : false
                  }))}
                  className="mr-2 h-4 w-4"
                />
                Coinché (x2)
              </label>
              {newRound.coinche && (
                <label className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    checked={newRound.surcoinche}
                    onChange={(e) => setNewRound(prev => ({ ...prev, surcoinche: e.target.checked }))}
                    className="mr-2 h-4 w-4"
                  />
                  Surcoinché (x4)
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitRound}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              {isSubmitting ? 'Ajout en cours...' : `Valider la manche ${currentRound}`}
            </button>
          </div>
        </GameCard>
      )}
    </div>
  );
}