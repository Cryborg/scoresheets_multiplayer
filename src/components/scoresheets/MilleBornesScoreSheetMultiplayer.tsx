'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Car, Award } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameCard from '@/components/layout/GameCard';
import MilleBornesRulesHelper from '@/components/ui/MilleBornesRulesHelper';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';
import { TeamRecord } from '@/types/realtime';

interface MilleBornesGameSession extends GameSessionWithRounds {
  teams?: TeamRecord[];
  team_based: number;
  rounds: Array<{
    round_number: number;
    scores: { [playerId: number]: number };
  }>;
}

interface MilleBornesRoundData {
  distances: { [playerId: number]: number };
  primes: {
    [playerId: number]: {
      coups_fourres: number;
      as_volant: boolean;
      sans_crevaison: boolean;
      sans_panne: boolean;
      sans_accident: boolean;
      sans_essence: boolean;
      extension: boolean;
      fermeture: boolean;
      arret_rouge: boolean;
    };
  };
}

const MILLE_BORNES_PRIMES = {
  coups_fourres: 300, // par coup fourré
  as_volant: 300,
  sans_crevaison: 300,
  sans_panne: 300,
  sans_accident: 300,
  sans_essence: 300,
  extension: 200,
  fermeture: 300,
  arret_rouge: 300
};

export default function MilleBornesScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<MilleBornesGameSession> sessionId={sessionId} gameSlug="mille-bornes">
      {({ session, gameState }) => (
        <MilleBornesGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function MilleBornesGameInterface({ 
  session, 
  gameState 
}: { 
  session: MilleBornesGameSession;
  gameState: any;
}) {
  const { addRound, isHost } = gameState;

  const [newRound, setNewRound] = useState<MilleBornesRoundData>({
    distances: {},
    primes: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data for all players
  useEffect(() => {
    if (session?.players) {
      const initialDistances: { [key: number]: number } = {};
      const initialPrimes: { [key: number]: any } = {};

      session.players.forEach(player => {
        initialDistances[player.id] = 0;
        initialPrimes[player.id] = {
          coups_fourres: 0,
          as_volant: false,
          sans_crevaison: false,
          sans_panne: false,
          sans_accident: false,
          sans_essence: false,
          extension: false,
          fermeture: false,
          arret_rouge: false
        };
      });

      setNewRound(prev => ({
        ...prev,
        distances: initialDistances,
        primes: initialPrimes
      }));
    }
  }, [session?.players]);

  const calculateMilleBornesScore = useCallback((data: MilleBornesRoundData) => {
    if (!session?.players) return {};

    const scores: { [key: number]: number } = {};

    session.players.forEach(player => {
      let score = data.distances[player.id] || 0;
      const playerPrimes = data.primes[player.id] || {};

      // Add primes
      score += (playerPrimes.coups_fourres || 0) * MILLE_BORNES_PRIMES.coups_fourres;
      if (playerPrimes.as_volant) score += MILLE_BORNES_PRIMES.as_volant;
      if (playerPrimes.sans_crevaison) score += MILLE_BORNES_PRIMES.sans_crevaison;
      if (playerPrimes.sans_panne) score += MILLE_BORNES_PRIMES.sans_panne;
      if (playerPrimes.sans_accident) score += MILLE_BORNES_PRIMES.sans_accident;
      if (playerPrimes.sans_essence) score += MILLE_BORNES_PRIMES.sans_essence;
      if (playerPrimes.extension) score += MILLE_BORNES_PRIMES.extension;
      if (playerPrimes.fermeture) score += MILLE_BORNES_PRIMES.fermeture;
      if (playerPrimes.arret_rouge) score += MILLE_BORNES_PRIMES.arret_rouge;

      scores[player.id] = score;
    });

    return scores;
  }, [session?.players]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    // Vérifier qu'au moins un joueur a un score non nul
    const hasValidScores = Object.values(newRound.distances).some(distance => distance > 0) ||
      Object.values(newRound.primes).some(primes => 
        Object.values(primes).some(prime => prime === true || (typeof prime === 'number' && prime > 0))
      );

    if (!hasValidScores) {
      alert('Veuillez saisir au moins un score ou une prime.');
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedScores = calculateMilleBornesScore(newRound);
      const scoresArray = Object.entries(calculatedScores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));

      await addRound(scoresArray, {
        distances: newRound.distances,
        primes: newRound.primes
      });

      // Reset form
      const resetDistances: { [key: number]: number } = {};
      const resetPrimes: { [key: number]: any } = {};

      session.players.forEach(player => {
        resetDistances[player.id] = 0;
        resetPrimes[player.id] = {
          coups_fourres: 0,
          as_volant: false,
          sans_crevaison: false,
          sans_panne: false,
          sans_accident: false,
          sans_essence: false,
          extension: false,
          fermeture: false,
          arret_rouge: false
        };
      });

      setNewRound({
        distances: resetDistances,
        primes: resetPrimes
      });
    } catch (error) {
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, newRound, isSubmitting, calculateMilleBornesScore, addRound]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  const updateDistance = (playerId: number, distance: number) => {
    setNewRound(prev => ({
      ...prev,
      distances: { ...prev.distances, [playerId]: distance }
    }));
  };

  const updatePrime = (playerId: number, primeType: string, value: boolean | number) => {
    setNewRound(prev => ({
      ...prev,
      primes: {
        ...prev.primes,
        [playerId]: {
          ...prev.primes[playerId],
          [primeType]: value
        }
      }
    }));
  };

  const currentRound = (session?.rounds?.length || 0) + 1;

  return (
    <div className="space-y-6">
      {/* Scores Table */}
      <GameCard title="Tableau des scores">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                <th className="text-left p-2">Joueur</th>
                {session?.rounds?.map((_, index) => (
                  <th key={index} className="text-center p-2 min-w-20">M{index + 1}</th>
                ))}
                <th className="text-center p-2 font-bold min-w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {session?.players?.map((player) => (
                <tr key={player.id} className="border-b dark:border-gray-700">
                  <td className="p-2 font-medium">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-blue-500" />
                      {player.player_name}
                    </div>
                  </td>
                  {session?.rounds?.map((round, roundIndex) => (
                    <td key={roundIndex} className="text-center p-2">
                      <span className={round.scores[player.id] > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                        {round.scores[player.id] || 0}
                      </span>
                    </td>
                  ))}
                  <td className="text-center p-2 font-bold text-lg">
                    <span className={getTotalScore(player.id) > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
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
          <div className="space-y-6">
            {/* Distance Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Distances parcourues
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {session?.players?.map(player => (
                  <div key={player.id}>
                    <label className="block text-sm font-medium mb-2">
                      {player.player_name}
                    </label>
                    <ScoreInput
                      value={newRound.distances[player.id] || 0}
                      onChange={(value) => updateDistance(player.id, value)}
                      placeholder="Distance (km)"
                      min={0}
                      max={1000}
                      step={25}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Primes Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5" />
                Primes et bonifications
              </h3>
              
              {session?.players?.map(player => (
                <div key={player.id} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-4">{player.player_name}</h4>
                  
                  <div className="space-y-4">
                    {/* Coups fourrés */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Coups fourrés (300 pts chacun)
                      </label>
                      <ScoreInput
                        value={newRound.primes[player.id]?.coups_fourres || 0}
                        onChange={(value) => updatePrime(player.id, 'coups_fourres', value)}
                        placeholder="Nombre"
                        min={0}
                        max={4}
                      />
                    </div>

                    {/* Primes booléennes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'as_volant', label: 'As du volant (300 pts)' },
                        { key: 'sans_crevaison', label: 'Sans crevaison (300 pts)' },
                        { key: 'sans_panne', label: 'Sans panne (300 pts)' },
                        { key: 'sans_accident', label: 'Sans accident (300 pts)' },
                        { key: 'sans_essence', label: 'Sans essence (300 pts)' },
                        { key: 'extension', label: 'Extension (200 pts)' },
                        { key: 'fermeture', label: 'Fermeture (300 pts)' },
                        { key: 'arret_rouge', label: 'Arrêt rouge (300 pts)' }
                      ].map(prime => (
                        <label key={prime.key} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newRound.primes[player.id]?.[prime.key] || false}
                            onChange={(e) => updatePrime(player.id, prime.key, e.target.checked)}
                            className="mr-2 h-4 w-4"
                          />
                          <span className="text-sm">{prime.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rules Helper */}
            <MilleBornesRulesHelper />

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

      {/* Rounds History */}
      {session?.rounds && session.rounds.length > 0 && (
        <GameCard title="Historique des manches">
          <div className="space-y-3">
            {session.rounds.map((round, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium">Manche {round.round_number}</div>
                  <div className="text-sm text-gray-500">
                    Total: {Object.values(round.scores).reduce((a, b) => a + b, 0)} pts
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {session.players?.map(player => {
                    const score = round.scores[player.id] || 0;
                    return (
                      <div key={player.id} className="flex justify-between">
                        <span>{player.player_name}:</span>
                        <span className={score > 0 ? 'font-medium text-green-600 dark:text-green-400' : 'text-gray-500'}>
                          {score} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </GameCard>
      )}
    </div>
  );
}