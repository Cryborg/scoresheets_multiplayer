'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, WifiOff, Clock, Crown, Target } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';

interface Player {
  id: number;
  player_name: string;
  position: number;
  is_connected: number;
  is_ready: number;
  user_id?: number;
  total_score?: number;
  team_id?: number;
}

interface GameSession {
  id: number;
  session_name: string;
  session_code: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  game_name: string;
  host_user_id: number;
  current_round: number;
  score_target?: number;
  players: Player[];
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
  const router = useRouter();
  const { session, events, isConnected, error, addRound } = useRealtimeSession<GameSession>({
    sessionId,
    gameSlug: 'belote'
  });
  
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

    const team1TotalPoints = data.team1Points + data.team1Announces;
    const team2TotalPoints = data.team2Points + data.team2Announces;

    let team1Score = 0;
    let team2Score = 0;
    
    // Base des points
    if (data.takingTeam === 1) {
      if (data.team1Points >= data.team2Points) {
        // Équipe 1 gagne
        team1Score = team1TotalPoints;
        team2Score = team2TotalPoints;
      } else {
        // Équipe 1 chutée
        team1Score = 0;
        team2Score = 162 + team2TotalPoints; // Tous les points + annonces adverses
      }
    } else {
      if (data.team2Points >= data.team1Points) {
        // Équipe 2 gagne
        team1Score = team1TotalPoints;
        team2Score = team2TotalPoints;
      } else {
        // Équipe 2 chutée
        team1Score = 162 + team1TotalPoints; // Tous les points + annonces adverses
        team2Score = 0;
      }
    }

    // Application coinche/surcoinche
    if (data.coinche) {
      if (data.surcoinche) {
        team1Score *= 4;
        team2Score *= 4;
      } else {
        team1Score *= 2;
        team2Score *= 2;
      }
    }

    // Distribution aux joueurs par équipe
    const scores: { [playerId: number]: number } = {};
    session.players.forEach(player => {
      // Les joueurs en position 1,3 sont équipe 1, les joueurs 2,4 sont équipe 2
      const isTeam1 = player.position === 1 || player.position === 3;
      scores[player.id] = isTeam1 ? team1Score : team2Score;
    });

    return scores;
  }, [session?.players]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    // Validation de base
    if (newRound.team1Points + newRound.team2Points !== 162) {
      alert('Le total des points doit être égal à 162');
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
  }, [session, newRound, isSubmitting, addRound, calculateBeloteScore]);

  const getTeamScore = useCallback((teamNumber: number) => {
    if (!session?.rounds || !session?.players) return 0;
    
    return session.rounds.reduce((total, round) => {
      // Trouve le score d'un joueur de l'équipe
      const teamPlayer = session.players.find(p => {
        const isTeam1 = p.position === 1 || p.position === 3;
        return (isTeam1 && teamNumber === 1) || (!isTeam1 && teamNumber === 2);
      });
      
      return total + (teamPlayer ? (round.scores[teamPlayer.id] || 0) : 0);
    }, 0);
  }, [session?.rounds, session?.players]);

  const getTeamPlayers = useCallback((teamNumber: number) => {
    if (!session?.players) return [];
    
    return session.players.filter(p => {
      const isTeam1 = p.position === 1 || p.position === 3;
      return (isTeam1 && teamNumber === 1) || (!isTeam1 && teamNumber === 2);
    }).map(player => ({
      ...player,
      total_score: getTeamScore(teamNumber)
    }));
  }, [session?.players, getTeamScore]);

  if (!session && !error) {
    return (
      <GameLayout 
        title="Chargement..."
        onBack
      >
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </GameLayout>
    );
  }

  if (error) {
    return (
      <GameLayout 
        title="Erreur"
        onBack
      >
        <GameCard>
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retour au dashboard
            </button>
          </div>
        </GameCard>
      </GameLayout>
    );
  }

  const currentRound = (session?.rounds?.length || 0) + 1;
  const team1Players = getTeamPlayers(1);
  const team2Players = getTeamPlayers(2);

  return (
    <GameLayout 
      title={session?.session_name || 'Belote'}
      subtitle={
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            {isConnected ? (
              <><Wifi className="h-4 w-4 text-green-500" /> Connecté</>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-500" /> Déconnecté</>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {session?.players.filter(p => p.is_connected).length}/{session?.players.length} joueurs
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Manche {currentRound}
          </div>
          <div className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs font-mono">
            Code: {session?.session_code}
          </div>
        </div>
      }
      onBack
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nouvelle manche */}
        <div className="lg:col-span-3">
          <GameCard title="Nouvelle manche" icon={<Crown className="h-5 w-5" />}>
            <div className="space-y-4">
              {/* Équipe prenante */}
              <div>
                <label className="block text-sm font-medium mb-2">Équipe prenante</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="takingTeam"
                      checked={newRound.takingTeam === 1}
                      onChange={() => setNewRound(prev => ({ ...prev, takingTeam: 1 }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Équipe 1</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="takingTeam"
                      checked={newRound.takingTeam === 2}
                      onChange={() => setNewRound(prev => ({ ...prev, takingTeam: 2 }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Équipe 2</span>
                  </label>
                </div>
              </div>

              {/* Points aux cartes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Points équipe 1
                  </label>
                  <ScoreInput
                    value={newRound.team1Points}
                    onChange={(value) => {
                      setNewRound(prev => ({ 
                        ...prev, 
                        team1Points: value,
                        team2Points: 162 - value
                      }));
                    }}
                    min={0}
                    max={162}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Points équipe 2 ({162 - newRound.team1Points})
                  </label>
                  <ScoreInput
                    value={newRound.team2Points}
                    onChange={(value) => {
                      setNewRound(prev => ({ 
                        ...prev, 
                        team2Points: value,
                        team1Points: 162 - value
                      }));
                    }}
                    min={0}
                    max={162}
                  />
                </div>
              </div>

              {/* Annonces */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Annonces équipe 1
                  </label>
                  <ScoreInput
                    value={newRound.team1Announces}
                    onChange={(value) => setNewRound(prev => ({ ...prev, team1Announces: value }))}
                    min={0}
                    max={500}
                    step={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Annonces équipe 2
                  </label>
                  <ScoreInput
                    value={newRound.team2Announces}
                    onChange={(value) => setNewRound(prev => ({ ...prev, team2Announces: value }))}
                    min={0}
                    max={500}
                    step={10}
                  />
                </div>
              </div>

              {/* Coinche */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRound.coinche}
                    onChange={(e) => setNewRound(prev => ({ 
                      ...prev, 
                      coinche: e.target.checked,
                      surcoinche: e.target.checked ? prev.surcoinche : false
                    }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Coinche (×2)</span>
                </label>
                {newRound.coinche && (
                  <label className="flex items-center gap-2 ml-6">
                    <input
                      type="checkbox"
                      checked={newRound.surcoinche}
                      onChange={(e) => setNewRound(prev => ({ ...prev, surcoinche: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Surcoinche (×4)</span>
                  </label>
                )}
              </div>

              {/* Aperçu des scores */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <h4 className="font-medium mb-2">Aperçu des scores :</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Équipe 1</div>
                    {Object.entries(calculateBeloteScore(newRound))
                      .filter(([playerId]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        return player && (player.position === 1 || player.position === 3);
                      })
                      .map(([playerId, score]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        return (
                          <div key={playerId} className="flex justify-between">
                            <span>{player?.player_name}</span>
                            <span className={score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''}>
                              {score > 0 ? '+' : ''}{score}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div>
                    <div className="font-medium">Équipe 2</div>
                    {Object.entries(calculateBeloteScore(newRound))
                      .filter(([playerId]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        return player && (player.position === 2 || player.position === 4);
                      })
                      .map(([playerId, score]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        return (
                          <div key={playerId} className="flex justify-between">
                            <span>{player?.player_name}</span>
                            <span className={score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''}>
                              {score > 0 ? '+' : ''}{score}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmitRound}
                disabled={isSubmitting || newRound.team1Points + newRound.team2Points !== 162}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Ajout...' : 'Ajouter la manche'}
              </button>
              
              {newRound.team1Points + newRound.team2Points !== 162 && (
                <p className="text-sm text-red-600 text-center">
                  Le total doit être 162 points (actuellement {newRound.team1Points + newRound.team2Points})
                </p>
              )}
            </div>
          </GameCard>

          {/* Historique */}
          {(session?.rounds?.length || 0) > 0 && (
            <GameCard title="Historique des manches" className="mt-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="py-2 px-3 text-left text-sm font-medium">Manche</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Prenante</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Points</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Annonces</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Éq.1</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Éq.2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session?.rounds.map((round) => (
                      <tr key={round.round_number} className="border-b dark:border-gray-700">
                        <td className="py-2 px-3 text-sm">{round.round_number}</td>
                        <td className="py-2 px-3 text-sm">
                          Équipe {round.details?.taking_team}
                          {round.details?.coinche && (round.details?.surcoinche ? ' (××)' : ' (×)')}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {round.details?.team1_points} - {round.details?.team2_points}
                        </td>
                        <td className="py-2 px-3 text-sm">
                          {round.details?.team1_announces} - {round.details?.team2_announces}
                        </td>
                        {[1, 2].map((teamNum) => {
                          const teamPlayer = session.players.find(p => {
                            const isTeam1 = p.position === 1 || p.position === 3;
                            return (isTeam1 && teamNum === 1) || (!isTeam1 && teamNum === 2);
                          });
                          
                          if (!teamPlayer) return <td key={teamNum} className="py-2 px-3 text-center text-sm">-</td>;
                          
                          const score = round.scores[teamPlayer.id] || 0;
                          return (
                            <td key={teamNum} className="py-2 px-3 text-center text-sm">
                              <span className={`font-medium ${
                                score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''
                              }`}>
                                {score > 0 ? '+' : ''}{score}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GameCard>
          )}
        </div>

        {/* Sidebar scores par équipes */}
        <div className="lg:col-span-1">
          <GameCard title="Scores par équipes" icon={<Target className="h-5 w-5" />}>
            <div className="space-y-4">
              {/* Équipe 1 */}
              <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Équipe 1</h3>
                <div className="space-y-1">
                  {team1Players.map(player => (
                    <div key={player.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {player.is_connected ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                        {player.player_name}
                      </span>
                      <span className="font-mono">
                        {getTeamScore(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Équipe 2 */}
              <div className="border rounded-md p-3 bg-red-50 dark:bg-red-900/20">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Équipe 2</h3>
                <div className="space-y-1">
                  {team2Players.map(player => (
                    <div key={player.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {player.is_connected ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                        {player.player_name}
                      </span>
                      <span className="font-mono">
                        {getTeamScore(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Différence */}
              <div className="text-center pt-2 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">Différence</div>
                <div className="text-lg font-mono font-bold">
                  {getTeamScore(1) - getTeamScore(2)}
                </div>
              </div>
            </div>
          </GameCard>

          {/* Événements récents */}
          {events.length > 0 && (
            <GameCard title="Activité récente" className="mt-6">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.slice(-10).reverse().map((event) => (
                  <div key={event.id} className="text-xs text-gray-600 dark:text-gray-400 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                    <div className="font-medium">{event.username || 'Système'}</div>
                    <div>{event.event_type}</div>
                    <div className="text-gray-400">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </GameCard>
          )}
        </div>
      </div>
    </GameLayout>
  );
}