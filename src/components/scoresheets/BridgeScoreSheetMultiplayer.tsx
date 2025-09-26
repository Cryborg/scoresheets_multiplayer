'use client';

import { useState, useCallback } from 'react';
import { Crown, Shield } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameCard from '@/components/layout/GameCard';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { useMultiplayerGame } from '@/hooks/useMultiplayerGame';
import { useErrorHandler } from '@/contexts/ErrorContext';

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
  return (
    <BaseScoreSheetMultiplayer<BridgeGameSession> sessionId={sessionId} gameSlug="bridge">
      {({ session, gameState }) => (
        <BridgeGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function BridgeGameInterface({
  session,
  gameState
}: {
  session: BridgeGameSession;
  gameState: ReturnType<typeof useMultiplayerGame>;
}) {
  const { addRound, isHost } = gameState;
  const { showError } = useErrorHandler();

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
      showError('Erreur lors de l\'ajout de la manche', 'scoreSheet', {
        game: 'bridge',
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, calculateBridgeScore, addRound, showError]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  const getTeamScore = useCallback((teamName: 'NS' | 'EW') => {
    if (!session?.players) return 0;
    const teamPlayers = session.players.filter(player => {
      const playerPosition = POSITIONS[player.position - 1];
      return teamName === 'NS' 
        ? (playerPosition === 'Nord' || playerPosition === 'Sud')
        : (playerPosition === 'Est' || playerPosition === 'Ouest');
    });
    return teamPlayers.reduce((total, player) => total + getTotalScore(player.id), 0);
  }, [session?.players, getTotalScore]);

  const currentRound = (session?.rounds?.length || 0) + 1;

  // Organiser les joueurs par équipe
  const nsPlayers = session?.players?.filter(p => {
    const pos = POSITIONS[p.position - 1];
    return pos === 'Nord' || pos === 'Sud';
  }) || [];
  const ewPlayers = session?.players?.filter(p => {
    const pos = POSITIONS[p.position - 1];
    return pos === 'Est' || pos === 'Ouest';
  }) || [];

  return (
    <div className="space-y-6">
      {/* Teams Score Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GameCard title="Nord-Sud" className="border-blue-200 dark:border-blue-800">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {getTeamScore('NS')}
              </div>
              <div className="text-sm text-gray-500">Total équipe</div>
              {newRound.vulnerableNS && (
                <div className="text-xs text-red-600 font-semibold flex items-center justify-center gap-1 mt-1">
                  <Shield className="h-3 w-3" />
                  Vulnérable
                </div>
              )}
            </div>
            <div className="space-y-2">
              {nsPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {session.host_user_id === player.user_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{player.player_name}</span>
                    <span className="text-xs text-gray-500">
                      ({POSITIONS[player.position - 1]})
                    </span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {getTotalScore(player.id)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GameCard>

        <GameCard title="Est-Ouest" className="border-red-200 dark:border-red-800">
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {getTeamScore('EW')}
              </div>
              <div className="text-sm text-gray-500">Total équipe</div>
              {newRound.vulnerableEW && (
                <div className="text-xs text-red-600 font-semibold flex items-center justify-center gap-1 mt-1">
                  <Shield className="h-3 w-3" />
                  Vulnérable
                </div>
              )}
            </div>
            <div className="space-y-2">
              {ewPlayers.map((player) => (
                <div key={player.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {session.host_user_id === player.user_id && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{player.player_name}</span>
                    <span className="text-xs text-gray-500">
                      ({POSITIONS[player.position - 1]})
                    </span>
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
      <GameCard title="Historique des donnes">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Donne</th>
                <th className="text-center p-2">Contrat</th>
                <th className="text-center p-2">Déclarant</th>
                <th className="text-center p-2">Résultat</th>
                <th className="text-center p-2 text-blue-600">N-S</th>
                <th className="text-center p-2 text-red-600">E-O</th>
              </tr>
            </thead>
            <tbody>
              {session?.rounds?.map((round, index) => {
                const details = round.details;
                const nsScore = nsPlayers.length > 0 ? round.scores[nsPlayers[0].id] || 0 : 0;
                const ewScore = ewPlayers.length > 0 ? round.scores[ewPlayers[0].id] || 0 : 0;
                
                return (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="p-2 font-medium">{round.round_number}</td>
                    <td className="text-center p-2">
                      {details && (
                        <div className="text-sm">
                          {details.level}{BRIDGE_CONTRACTS.find(c => c.suit === details.contract)?.symbol}
                          {details.doubled === 1 && ' X'}
                          {details.doubled === 2 && ' XX'}
                        </div>
                      )}
                    </td>
                    <td className="text-center p-2 text-sm">
                      {details?.declarer_position}
                    </td>
                    <td className="text-center p-2 text-sm">
                      {details && `${details.tricks_made} plis`}
                    </td>
                    <td className="text-center p-2 text-blue-600 font-semibold">
                      {nsScore > 0 ? `+${nsScore}` : nsScore}
                    </td>
                    <td className="text-center p-2 text-red-600 font-semibold">
                      {ewScore > 0 ? `+${ewScore}` : ewScore}
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
        <GameCard title={`Ajouter la donne ${currentRound}`}>
          <div className="space-y-6">
            {/* Contract Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Niveau
                </label>
                <select
                  value={newRound.level}
                  onChange={(e) => setNewRound(prev => ({ ...prev, level: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Couleur
                </label>
                <select
                  value={newRound.contract}
                  onChange={(e) => setNewRound(prev => ({ ...prev, contract: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  {BRIDGE_CONTRACTS.map(contract => (
                    <option key={contract.suit} value={contract.suit}>
                      {contract.symbol} {contract.suit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Declarer and Doubled */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Déclarant
                </label>
                <select
                  value={newRound.declarerPosition}
                  onChange={(e) => setNewRound(prev => ({ ...prev, declarerPosition: e.target.value }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  {POSITIONS.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contre
                </label>
                <select
                  value={newRound.doubled}
                  onChange={(e) => setNewRound(prev => ({ ...prev, doubled: parseInt(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                >
                  <option value={0}>Pas de contre</option>
                  <option value={1}>Contré (X)</option>
                  <option value={2}>Surcontré (XX)</option>
                </select>
              </div>
            </div>

            {/* Tricks Made */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Plis réalisés
              </label>
              <ScoreInput
                value={newRound.tricksMade}
                onChange={(value) => setNewRound(prev => ({ ...prev, tricksMade: value }))}
                placeholder="Plis"
                min={0}
                max={13}
              />
            </div>

            {/* Vulnerability */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRound.vulnerableNS}
                  onChange={(e) => setNewRound(prev => ({ ...prev, vulnerableNS: e.target.checked }))}
                  className="mr-2 h-4 w-4"
                />
                Nord-Sud vulnérable
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newRound.vulnerableEW}
                  onChange={(e) => setNewRound(prev => ({ ...prev, vulnerableEW: e.target.checked }))}
                  className="mr-2 h-4 w-4"
                />
                Est-Ouest vulnérable
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitRound}
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              {isSubmitting ? 'Ajout en cours...' : `Valider la donne ${currentRound}`}
            </button>
          </div>
        </GameCard>
      )}
    </div>
  );
}