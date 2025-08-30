'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, WifiOff, Clock, Crown, Shield, Target } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

// Extension spécifique pour Bridge avec details typés
interface BridgeGameSession extends GameSessionWithRounds {
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
    details?: {
      declarer_position: string;
      contract: string;
      level: number;
      doubled: number;
      tricks_made: number;
      vulnerable_ns: boolean;
      vulnerable_ew: boolean;
    };
  }>;
}

interface BridgeContract {
  suit: string;
  symbol: string;
  points: number;
}

interface BridgeRoundData {
  declarerPosition: string;
  contract: string;
  level: number;
  doubled: number; // 0=normal, 1=double, 2=redouble
  tricksMade: number;
  vulnerableNS: boolean;
  vulnerableEW: boolean;
}

const BRIDGE_CONTRACTS: BridgeContract[] = [
  { suit: 'SA', symbol: 'SA', points: 30 },
  { suit: 'Piques', symbol: '♠', points: 30 },
  { suit: 'Cœurs', symbol: '♥', points: 30 },
  { suit: 'Carreaux', symbol: '♦', points: 20 },
  { suit: 'Trèfles', symbol: '♣', points: 20 }
];

const POSITIONS = ['Nord', 'Est', 'Sud', 'Ouest'];

export default function BridgeScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { session, events, isConnected, error, addRound } = useRealtimeSession<BridgeGameSession>({
    sessionId,
    gameSlug: 'bridge'
  });
  
  const [newRound, setNewRound] = useState<BridgeRoundData>({
    declarerPosition: 'Nord',
    contract: 'SA',
    level: 1,
    doubled: 0,
    tricksMade: 0,
    vulnerableNS: false,
    vulnerableEW: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateBridgeScore = useCallback((data: BridgeRoundData) => {
    if (!session?.players) return {};

    const contract = BRIDGE_CONTRACTS.find(c => c.suit === data.contract);
    if (!contract) return {};

    const tricksNeeded = 6 + data.level;
    const made = data.tricksMade >= tricksNeeded;
    const overtricks = Math.max(0, data.tricksMade - tricksNeeded);
    const undertricks = made ? 0 : tricksNeeded - data.tricksMade;

    let score = 0;
    
    const isNSDeclarerTeam = data.declarerPosition === 'Nord' || data.declarerPosition === 'Sud';
    const declarerVulnerable = isNSDeclarerTeam ? data.vulnerableNS : data.vulnerableEW;
    
    if (made) {
      // Score de base
      let baseScore = data.level * contract.points;
      if (data.contract === 'SA') baseScore += 10; // Bonus SA
      
      // Game bonus
      if (baseScore >= 100) {
        score += declarerVulnerable ? 500 : 300;
      } else {
        score += 50; // Part game
      }
      
      // Contract points
      score += baseScore;
      
      // Overtricks
      if (overtricks > 0) {
        if (data.doubled === 0) {
          score += overtricks * (contract.points === 30 ? 30 : 20);
        } else {
          score += overtricks * (declarerVulnerable ? 200 : 100) * Math.pow(2, data.doubled - 1);
        }
      }
      
      // Double bonus
      if (data.doubled > 0) {
        score += 50 * Math.pow(2, data.doubled - 1);
      }
      
    } else {
      // Undertricks penalties
      for (let i = 0; i < undertricks; i++) {
        if (data.doubled === 0) {
          score -= declarerVulnerable ? 100 : 50;
        } else {
          if (i === 0) {
            score -= (declarerVulnerable ? 200 : 100) * Math.pow(2, data.doubled - 1);
          } else if (i <= 2) {
            score -= (declarerVulnerable ? 300 : 200) * Math.pow(2, data.doubled - 1);
          } else {
            score -= (declarerVulnerable ? 300 : 300) * Math.pow(2, data.doubled - 1);
          }
        }
      }
    }

    // Distribution par équipes (4 joueurs fixes : Nord/Sud vs Est/Ouest)
    const scores: { [playerId: number]: number } = {};
    session.players.forEach(player => {
      const playerPosition = POSITIONS[player.position - 1];
      const isNSTeam = playerPosition === 'Nord' || playerPosition === 'Sud';
      
      if (isNSTeam === isNSDeclarerTeam) {
        scores[player.id] = score; // Équipe qui déclare
      } else {
        scores[player.id] = -score; // Équipe adverse
      }
    });

    return scores;
  }, [session?.players]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const calculatedScores = calculateBridgeScore(newRound);
      const scoresArray = Object.entries(calculatedScores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));

      await addRound(scoresArray, {
        declarer_position: newRound.declarerPosition,
        contract: newRound.contract,
        level: newRound.level,
        doubled: newRound.doubled,
        tricks_made: newRound.tricksMade,
        vulnerable_ns: newRound.vulnerableNS,
        vulnerable_ew: newRound.vulnerableEW
      });

      // Reset form
      setNewRound({
        declarerPosition: 'Nord',
        contract: 'SA',
        level: 1,
        doubled: 0,
        tricksMade: 0,
        vulnerableNS: false,
        vulnerableEW: false
      });
    } catch (error) {
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, addRound, calculateBridgeScore]);

  const getTeamScore = useCallback((teamNS: boolean) => {
    if (!session?.rounds || !session?.players) return 0;
    
    return session.rounds.reduce((total, round) => {
      // Trouve le score d'un joueur de l'équipe
      const teamPlayer = session.players.find(p => {
        const position = POSITIONS[p.position - 1];
        const isNS = position === 'Nord' || position === 'Sud';
        return isNS === teamNS;
      });
      
      return total + (teamPlayer ? (round.scores[teamPlayer.id] || 0) : 0);
    }, 0);
  }, [session?.rounds, session?.players]);

  const getTeamPlayers = useCallback((teamNS: boolean) => {
    if (!session?.players) return [];
    
    return session.players.filter(p => {
      const position = POSITIONS[p.position - 1];
      const isNS = position === 'Nord' || position === 'Sud';
      return isNS === teamNS;
    }).map(player => ({
      ...player,
      total_score: getTeamScore(teamNS)
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
  const nsPlayers = getTeamPlayers(true);
  const ewPlayers = getTeamPlayers(false);

  return (
    <GameLayout 
      title={session?.session_name || 'Bridge'}
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
            Donne {currentRound}
          </div>
          <div className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs font-mono">
            Code: {session?.session_code}
          </div>
        </div>
      }
      onBack
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Nouvelle donne */}
        <div className="lg:col-span-3">
          <GameCard title="Nouvelle donne" icon={<Crown className="h-5 w-5" />}>
            <div className="space-y-4">
              {/* Déclarant et contrat */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Déclarant</label>
                  <select
                    value={newRound.declarerPosition}
                    onChange={(e) => setNewRound(prev => ({ ...prev, declarerPosition: e.target.value }))}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {POSITIONS.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Niveau</label>
                  <select
                    value={newRound.level}
                    onChange={(e) => setNewRound(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {[1,2,3,4,5,6,7].map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Couleur</label>
                  <select
                    value={newRound.contract}
                    onChange={(e) => setNewRound(prev => ({ ...prev, contract: e.target.value }))}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    {BRIDGE_CONTRACTS.map(contract => (
                      <option key={contract.suit} value={contract.suit}>
                        {contract.suit} {contract.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modificateurs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Contre</label>
                  <select
                    value={newRound.doubled}
                    onChange={(e) => setNewRound(prev => ({ ...prev, doubled: parseInt(e.target.value) }))}
                    className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>Contre</option>
                    <option value={2}>Surcontre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Levées réalisées</label>
                  <ScoreInput
                    value={newRound.tricksMade}
                    onChange={(value) => setNewRound(prev => ({ ...prev, tricksMade: value }))}
                    min={0}
                    max={13}
                  />
                </div>
              </div>

              {/* Vulnérabilité */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Vulnérabilité</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newRound.vulnerableNS}
                      onChange={(e) => setNewRound(prev => ({ ...prev, vulnerableNS: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <Shield className="h-4 w-4 text-red-500" />
                      Nord/Sud vulnérables
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newRound.vulnerableEW}
                      onChange={(e) => setNewRound(prev => ({ ...prev, vulnerableEW: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex items-center gap-1">
                      <Shield className="h-4 w-4 text-red-500" />
                      Est/Ouest vulnérables
                    </span>
                  </label>
                </div>
              </div>

              {/* Aperçu des scores */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                <h4 className="font-medium mb-2">Aperçu des scores :</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Nord/Sud</div>
                    {Object.entries(calculateBridgeScore(newRound))
                      .filter(([playerId]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        if (!player) return false;
                        const position = POSITIONS[player.position - 1];
                        return position === 'Nord' || position === 'Sud';
                      })
                      .map(([playerId, score]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        const position = POSITIONS[player?.position - 1];
                        return (
                          <div key={playerId} className="flex justify-between">
                            <span>{position}</span>
                            <span className={score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''}>
                              {score > 0 ? '+' : ''}{score}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div>
                    <div className="font-medium">Est/Ouest</div>
                    {Object.entries(calculateBridgeScore(newRound))
                      .filter(([playerId]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        if (!player) return false;
                        const position = POSITIONS[player.position - 1];
                        return position === 'Est' || position === 'Ouest';
                      })
                      .map(([playerId, score]) => {
                        const player = session?.players.find(p => p.id === parseInt(playerId));
                        const position = POSITIONS[player?.position - 1];
                        return (
                          <div key={playerId} className="flex justify-between">
                            <span>{position}</span>
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
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Ajout...' : 'Ajouter la donne'}
              </button>
            </div>
          </GameCard>

          {/* Historique */}
          {(session?.rounds?.length || 0) > 0 && (
            <GameCard title="Historique des donnes" className="mt-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="py-2 px-3 text-left text-sm font-medium">Donne</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Contrat</th>
                      <th className="py-2 px-3 text-left text-sm font-medium">Levées</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Nord</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Est</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Sud</th>
                      <th className="py-2 px-3 text-center text-sm font-medium">Ouest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session?.rounds.map((round) => {
                      const contractStr = `${round.details?.level}${BRIDGE_CONTRACTS.find(c => c.suit === round.details?.contract)?.symbol}`;
                      const doubleStr = round.details?.doubled === 1 ? ' X' : round.details?.doubled === 2 ? ' XX' : '';
                      
                      return (
                        <tr key={round.round_number} className="border-b dark:border-gray-700">
                          <td className="py-2 px-3 text-sm">{round.round_number}</td>
                          <td className="py-2 px-3 text-sm">
                            {round.details?.declarer_position} - {contractStr}{doubleStr}
                          </td>
                          <td className="py-2 px-3 text-sm">{round.details?.tricks_made}/13</td>
                          {POSITIONS.map((position) => {
                            const player = session.players.find(p => POSITIONS[p.position - 1] === position);
                            if (!player) return <td key={position} className="py-2 px-3 text-center text-sm">-</td>;
                            
                            const score = round.scores[player.id] || 0;
                            return (
                              <td key={position} className="py-2 px-3 text-center text-sm">
                                <span className={`font-medium ${
                                  score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''
                                }`}>
                                  {score > 0 ? '+' : ''}{score}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
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
              {/* Équipe Nord/Sud */}
              <div className="border rounded-md p-3 bg-blue-50 dark:bg-blue-900/20">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Nord / Sud</h3>
                <div className="space-y-1">
                  {nsPlayers.map(player => (
                    <div key={player.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {player.is_connected ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                        {POSITIONS[player.position - 1]}
                      </span>
                      <span className="font-mono">
                        {getTeamScore(true)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Équipe Est/Ouest */}
              <div className="border rounded-md p-3 bg-red-50 dark:bg-red-900/20">
                <h3 className="font-medium text-red-800 dark:text-red-200 mb-2">Est / Ouest</h3>
                <div className="space-y-1">
                  {ewPlayers.map(player => (
                    <div key={player.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1">
                        {player.is_connected ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        )}
                        {POSITIONS[player.position - 1]}
                      </span>
                      <span className="font-mono">
                        {getTeamScore(false)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Différence */}
              <div className="text-center pt-2 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400">Différence</div>
                <div className="text-lg font-mono font-bold">
                  {getTeamScore(true) - getTeamScore(false)}
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