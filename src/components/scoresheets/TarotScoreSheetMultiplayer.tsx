'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, WifiOff, Clock, Crown } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import RankingSidebar from '@/components/layout/RankingSidebar';
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
  const router = useRouter();
  const { session, events, isConnected, error, addRound } = useRealtimeSession<GameSession>({
    sessionId,
    gameSlug: 'tarot'
  });
  
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

    const requiredPoints = OUDLERS_POINTS[data.oudlers];
    const difference = data.points - requiredPoints;
    
    // Calcul points de base
    let baseScore = contract.basePoints + difference;
    
    // Bonus/malus
    if (data.petitAuBout) baseScore += 10;
    if (data.chelem && difference >= 0) baseScore += 200;
    if (data.chelem && difference < 0) baseScore -= 200;
    
    // Application du multiplicateur
    const finalScore = baseScore * contract.multiplier;
    
    // Distribution des scores
    const scores: { [playerId: number]: number } = {};
    const isSuccess = difference >= 0;
    
    session.players.forEach(player => {
      if (player.id === data.takerId) {
        scores[player.id] = isSuccess ? finalScore : -finalScore;
      } else {
        scores[player.id] = isSuccess ? -Math.round(finalScore / (session.players.length - 1)) : Math.round(finalScore / (session.players.length - 1));
      }
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
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, addRound, calculateTarotScore]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  const getRankedPlayers = useCallback(() => {
    if (!session?.players) return [];
    return [...session.players]
      .map(player => ({
        ...player,
        total_score: getTotalScore(player.id)
      }))
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }, [session?.players, getTotalScore]);

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
              onClick={() => window.location.href = '/dashboard'}
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
  const rankedPlayers = getRankedPlayers();

  return (
    <GameLayout 
      title={session?.session_name || 'Tarot'}
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
              {/* Preneur */}
              <div>
                <label className="block text-sm font-medium mb-2">Preneur</label>
                <select
                  value={newRound.takerId}
                  onChange={(e) => setNewRound(prev => ({ ...prev, takerId: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value={0}>Sélectionner le preneur</option>
                  {session?.players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.player_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contrat */}
              <div>
                <label className="block text-sm font-medium mb-2">Contrat</label>
                <select
                  value={newRound.contract}
                  onChange={(e) => setNewRound(prev => ({ ...prev, contract: e.target.value }))}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                >
                  {TAROT_CONTRACTS.map(contract => (
                    <option key={contract.name} value={contract.name}>
                      {contract.name} (×{contract.multiplier})
                    </option>
                  ))}
                </select>
              </div>

              {/* Points et oudlers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Points réalisés (sur 91)
                  </label>
                  <ScoreInput
                    value={newRound.points}
                    onChange={(value) => setNewRound(prev => ({ ...prev, points: value }))}
                    min={0}
                    max={91}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Oudlers ({OUDLERS_POINTS[newRound.oudlers]} pts nécessaires)
                  </label>
                  <select
                    value={newRound.oudlers}
                    onChange={(e) => setNewRound(prev => ({ ...prev, oudlers: parseInt(e.target.value) }))}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value={0}>0 oudlers (56 pts)</option>
                    <option value={1}>1 oudler (51 pts)</option>
                    <option value={2}>2 oudlers (46 pts)</option>
                    <option value={3}>3 oudlers (36 pts)</option>
                  </select>
                </div>
              </div>

              {/* Bonus */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRound.petitAuBout}
                    onChange={(e) => setNewRound(prev => ({ ...prev, petitAuBout: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Petit au bout (+10 pts)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newRound.chelem}
                    onChange={(e) => setNewRound(prev => ({ ...prev, chelem: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Chelem réalisé/annoncé (±200 pts)</span>
                </label>
              </div>

              {/* Aperçu des scores */}
              {newRound.takerId > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  <h4 className="font-medium mb-2">Aperçu des scores :</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(calculateTarotScore(newRound)).map(([playerId, score]) => {
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
              )}

              <button
                onClick={handleSubmitRound}
                disabled={newRound.takerId === 0 || isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Ajout...' : 'Ajouter la manche'}
              </button>
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
                      <th className="py-2 px-3 text-left text-sm font-medium">Preneur</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Contrat</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Points</th>
                      {session?.players.map(player => (
                        <th key={player.id} className="py-2 px-3 text-center text-sm font-medium">
                          {player.player_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session?.rounds.map((round) => (
                      <tr key={round.round_number} className="border-b dark:border-gray-700">
                        <td className="py-2 px-3 text-sm">{round.round_number}</td>
                        <td className="py-2 px-3 text-sm">
                          {session.players.find(p => p.id === round.details?.taker_id)?.player_name}
                        </td>
                        <td className="py-2 px-3 text-sm">{round.details?.contract}</td>
                        <td className="py-2 px-3 text-sm">{round.details?.points}/91</td>
                        {session?.players.map(player => (
                          <td key={player.id} className="py-2 px-3 text-center text-sm">
                            <span className={`font-medium ${
                              (round.scores[player.id] || 0) > 0 
                                ? 'text-green-600' 
                                : (round.scores[player.id] || 0) < 0 
                                  ? 'text-red-600' 
                                  : ''
                            }`}>
                              {round.scores[player.id] > 0 ? '+' : ''}{round.scores[player.id] || 0}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GameCard>
          )}
        </div>

        {/* Sidebar classement */}
        <div className="lg:col-span-1">
          <RankingSidebar players={rankedPlayers} />
          
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