'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, WifiOff, Clock, Car, Award } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import GameLayout from '@/components/layout/GameLayout';
import GameCard from '@/components/layout/GameCard';
import RankingSidebar from '@/components/layout/RankingSidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import MilleBornesRulesHelper from '@/components/ui/MilleBornesRulesHelper';
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

interface MilleBornesPrimes {
  // Bottes et leurs coups fourrés
  as_volant: boolean;
  as_volant_coup_fourre: boolean;
  increvable: boolean;
  increvable_coup_fourre: boolean;
  citerne: boolean;
  citerne_coup_fourre: boolean;
  prioritaire: boolean;
  prioritaire_coup_fourre: boolean;
  
  // Fins de manche (communes)
  allonge: boolean;
  sans_les_200: boolean;
  
  // Fins de manche (classique uniquement)
  coup_couronnement: boolean;
  capot: boolean;
}

type GameVariant = 'classique' | 'moderne';

// VRAIES valeurs selon les règles officielles du Mille Bornes
const PRIME_VALUES = {
  botte: 100,              // Chaque botte exposée
  coup_fourre: 300,        // Coup fourré (en plus de la botte)
  manche_terminee: 400,    // Finir une manche (1000 bornes atteintes)
  allonge: 200,            // Allonge 700→1000 (jeu individuel)
  sans_les_200: 300,       // Finir sans utiliser de carte 200km
  // Règles classiques uniquement
  coup_couronnement: 300,  // Finir après épuisement du sabot
  capot: 500,              // Adversaire n'a aucune borne
};

export default function MilleBornesEquipesScoreSheetMultiplayer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { session, events, isConnected, error, addRound } = useRealtimeSession<GameSession>({
    sessionId,
    gameSlug: 'mille-bornes-equipes'
  });
  
  const [roundData, setRoundData] = useState<MilleBornesRoundData>({
    distances: {},
    primes: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameVariant, setGameVariant] = useState<GameVariant>('moderne');
  const [variantSelected, setVariantSelected] = useState(false);

  const initializePlayerData = useCallback(() => {
    if (!session?.players) return;
    
    const newDistances: { [playerId: number]: number } = {};
    const newPrimes: { [playerId: number]: MilleBornesPrimes } = {};
    
    session.players.forEach(player => {
      if (!(player.id in roundData.distances)) {
        newDistances[player.id] = 0;
      }
      if (!(player.id in roundData.primes)) {
        newPrimes[player.id] = {
          as_volant: false,
          as_volant_coup_fourre: false,
          increvable: false,
          increvable_coup_fourre: false,
          citerne: false,
          citerne_coup_fourre: false,
          prioritaire: false,
          prioritaire_coup_fourre: false,
          allonge: false,
          sans_les_200: false,
          coup_couronnement: false,
          capot: false,
        };
      }
    });

    setRoundData(prev => ({
      distances: { ...prev.distances, ...newDistances },
      primes: { ...prev.primes, ...newPrimes }
    }));
  }, [session?.players, roundData.distances, roundData.primes]);

  React.useEffect(() => {
    initializePlayerData();
  }, [initializePlayerData]);

  const calculatePlayerScore = useCallback((playerId: number) => {
    const distance = Number(roundData.distances[playerId]) || 0;
    const primes = roundData.primes[playerId];
    
    if (!primes) {
      // Si 1000 bornes atteintes, ajouter bonus manche terminée
      return distance + (distance >= 1000 ? PRIME_VALUES.manche_terminee : 0);
    }

    let score = distance;

    // Bottes (cartes spéciales) - 100 points chacune
    let bottesCount = 0;
    if (primes.as_volant) {
      score += PRIME_VALUES.botte;
      bottesCount++;
      // + 300 si c'est un coup fourré
      if (primes.as_volant_coup_fourre) {
        score += PRIME_VALUES.coup_fourre;
      }
    }
    if (primes.increvable) {
      score += PRIME_VALUES.botte;
      bottesCount++;
      if (primes.increvable_coup_fourre) {
        score += PRIME_VALUES.coup_fourre;
      }
    }
    if (primes.citerne) {
      score += PRIME_VALUES.botte;
      bottesCount++;
      if (primes.citerne_coup_fourre) {
        score += PRIME_VALUES.coup_fourre;
      }
    }
    if (primes.prioritaire) {
      score += PRIME_VALUES.botte;
      bottesCount++;
      if (primes.prioritaire_coup_fourre) {
        score += PRIME_VALUES.coup_fourre;
      }
    }
    
    // Bonus 4 bottes complètes (700 points total au lieu de 400)
    if (bottesCount === 4) {
      score += 300; // Bonus supplémentaire
    }

    // Fins de manche (communes)
    if (primes.allonge) score += PRIME_VALUES.allonge;
    if (primes.sans_les_200) score += PRIME_VALUES.sans_les_200;
    
    // Fins de manche (classique uniquement)
    if (gameVariant === 'classique') {
      if (primes.coup_couronnement) score += PRIME_VALUES.coup_couronnement;
      if (primes.capot) score += PRIME_VALUES.capot;
    }

    // Bonus manche terminée automatique si 1000 bornes
    if (distance >= 1000) {
      score += PRIME_VALUES.manche_terminee;
    }

    return score;
  }, [roundData.distances, roundData.primes]);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const scoresArray = session.players.map(player => ({
        playerId: player.id,
        score: calculatePlayerScore(player.id)
      }));

      await addRound(scoresArray);

      // Reset form
      const resetDistances: { [playerId: number]: number } = {};
      const resetPrimes: { [playerId: number]: MilleBornesPrimes } = {};
      
      session.players.forEach(player => {
        resetDistances[player.id] = 0;
        resetPrimes[player.id] = {
          as_volant: false,
          as_volant_coup_fourre: false,
          increvable: false,
          increvable_coup_fourre: false,
          citerne: false,
          citerne_coup_fourre: false,
          prioritaire: false,
          prioritaire_coup_fourre: false,
          allonge: false,
          sans_les_200: false,
          coup_couronnement: false,
          capot: false,
        };
      });

      setRoundData({
        distances: resetDistances,
        primes: resetPrimes
      });
    } catch (error) {
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, isSubmitting, addRound, calculatePlayerScore]);

  const getTotalScore = useCallback((playerId: number) => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  // Grouper les joueurs par équipe
  const getTeams = useCallback(() => {
    if (!session?.players) return [];
    
    // En mode équipe, les joueurs sont organisés par team_id (1 ou 2)
    const teams = [
      {
        id: 1,
        name: 'Équipe 1',
        players: session.players.filter(p => p.team_id === 1 || (!p.team_id && p.position <= 2))
      },
      {
        id: 2, 
        name: 'Équipe 2',
        players: session.players.filter(p => p.team_id === 2 || (!p.team_id && p.position > 2))
      }
    ];
    
    return teams.map(team => ({
      ...team,
      total_score: team.players.reduce((sum, player) => sum + getTotalScore(player.id), 0)
    }));
  }, [session?.players, getTotalScore]);

  const getRankedTeams = useCallback(() => {
    return getTeams().sort((a, b) => b.total_score - a.total_score);
  }, [getTeams]);

  const updatePlayerDistance = useCallback((playerId: number, distance: number) => {
    setRoundData(prev => ({
      ...prev,
      distances: { ...prev.distances, [playerId]: distance }
    }));
  }, []);

  const updatePlayerPrime = useCallback((playerId: number, primeKey: keyof MilleBornesPrimes, value: boolean | number) => {
    setRoundData(prev => ({
      ...prev,
      primes: {
        ...prev.primes,
        [playerId]: {
          ...prev.primes[playerId],
          [primeKey]: value
        }
      }
    }));
  }, []);

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
  const rankedTeams = getRankedTeams();

  // Sélecteur de version avant de commencer
  if (!variantSelected) {
    return (
      <GameLayout 
        title={session?.session_name || 'Mille Bornes'}
        onBack
      >
        <GameCard title="Choisir la version des règles" icon={<Car className="h-5 w-5" />}>
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">
              Le Mille Bornes existe en deux versions principales. Choisissez celle que vous préférez :
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* Version moderne */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  gameVariant === 'moderne' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setGameVariant('moderne')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={gameVariant === 'moderne'}
                    onChange={() => setGameVariant('moderne')}
                    className="w-4 h-4"
                  />
                  <h3 className="font-bold text-lg">Version Moderne</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Version simplifiée, plus accessible
                </p>
                <ul className="text-sm space-y-1">
                  <li>❌ Allonge</li>
                  <li>❌ Coup du Couronnement</li>
                  <li>❌ Capot</li>
                </ul>
              </div>
              
              {/* Version classique */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  gameVariant === 'classique' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => setGameVariant('classique')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    checked={gameVariant === 'classique'}
                    onChange={() => setGameVariant('classique')}
                    className="w-4 h-4"
                  />
                  <h3 className="font-bold text-lg">Version Classique</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Version complète originale (1954)
                </p>
                <ul className="text-sm space-y-1">
                  <li>✅ Allonge (+200)</li>
                  <li>✅ Coup du Couronnement (+300)</li>
                  <li>✅ Capot (+500)</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setVariantSelected(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Commencer avec la version {gameVariant}
              </button>
            </div>
          </div>
        </GameCard>
      </GameLayout>
    );
  }

  return (
    <GameLayout 
      title={session?.session_name || 'Mille Bornes'}
      onBack
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Saisie des scores */}
        <div className="lg:col-span-3">
          {/* En-tête avec objectif et aide */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Car className="h-6 w-6" />
                Objectif : 5000 POINTS ({gameVariant})
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                  Version {gameVariant}
                </span>
                <MilleBornesRulesHelper variant={gameVariant} />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Rappel :</strong> Ce n'est pas une course à 1000 bornes, mais bien un jeu de points ! 
              Chaque manche rapporte des points selon les distances et primes obtenues.
            </p>
          </div>

          <GameCard title={`Manche ${currentRound}`} icon={<Car className="h-5 w-5" />}>
            <div className="space-y-6">
              {getTeams().map((team) => (
                <div key={team.id} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4">
                  <h2 className="text-lg font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    {team.name}
                  </h2>
                  <div className="space-y-4">
                    {team.players.map((player) => (
                <div key={player.id} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      player.is_connected ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    {player.player_name}
                    <span className="text-sm text-gray-500 ml-auto">
                      Total aperçu: {calculatePlayerScore(player.id)}
                    </span>
                  </h3>
                  
                  {/* Distance */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Distance parcourue (km)
                    </label>
                    <ScoreInput
                      value={roundData.distances[player.id] || 0}
                      onChange={(value) => updatePlayerDistance(player.id, value)}
                      min={0}
                      max={1000}
                      step={25}
                    />
                  </div>

                  {/* Bottes et Coups Fourrés */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      Bottes & Coups Fourrés
                    </h4>
                    
                    {/* Bottes avec possibilité de coup fourré */}
                    <div className="space-y-3">
                      {[
                        { 
                          botteKey: 'as_volant' as const, 
                          coupKey: 'as_volant_coup_fourre' as const, 
                          label: 'As du Volant',
                          description: 'contre Accident'
                        },
                        { 
                          botteKey: 'increvable' as const, 
                          coupKey: 'increvable_coup_fourre' as const, 
                          label: 'Increvable',
                          description: 'contre Crevaison'
                        },
                        { 
                          botteKey: 'citerne' as const, 
                          coupKey: 'citerne_coup_fourre' as const, 
                          label: 'Citerne',
                          description: 'contre Panne d\'Essence'
                        },
                        { 
                          botteKey: 'prioritaire' as const, 
                          coupKey: 'prioritaire_coup_fourre' as const, 
                          label: 'Prioritaire',
                          description: 'contre Limitation'
                        }
                      ].map(({ botteKey, coupKey, label, description }) => (
                        <div key={botteKey} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{label}</span>
                            <span className="text-xs text-gray-500">{description}</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={roundData.primes[player.id]?.[botteKey] || false}
                                onChange={(e) => updatePlayerPrime(player.id, botteKey, e.target.checked)}
                                className="w-4 h-4"
                              />
                              <span className="text-xs">Botte (+100)</span>
                            </label>
                            
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={roundData.primes[player.id]?.[coupKey] || false}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Si on coche coup fourré, cocher aussi la botte automatiquement
                                    updatePlayerPrime(player.id, botteKey, true);
                                    updatePlayerPrime(player.id, coupKey, true);
                                  } else {
                                    // Si on décoche coup fourré, décocher seulement le coup fourré
                                    updatePlayerPrime(player.id, coupKey, false);
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <span className="text-xs">Coup fourré (+300)</span>
                            </label>
                          </div>
                          
                          {/* Affichage du total pour cette botte */}
                          {roundData.primes[player.id]?.[botteKey] && (
                            <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                              Total: {100 + (roundData.primes[player.id]?.[coupKey] ? 300 : 0)} points
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Fins de manche */}
                    <div className="mt-4">
                      <h5 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Fins de manche</h5>
                      <div className="space-y-2 text-sm">
                        {/* Sans les 200 (commune à toutes versions) */}
                        <div className="space-y-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={roundData.primes[player.id]?.sans_les_200 || false}
                              onChange={(e) => updatePlayerPrime(player.id, 'sans_les_200', e.target.checked)}
                              className="w-4 h-4"
                            />
                            <span className="text-xs">Sans les 200 (+300)</span>
                          </label>
                        </div>
                        
                        {/* Primes classiques uniquement */}
                        {gameVariant === 'classique' && (
                          <div className="space-y-1">
                            <h6 className="text-xs font-medium text-green-700 dark:text-green-300">Classique uniquement</h6>
                            {[
                              { key: 'allonge' as const, label: 'Allonge (700→1000)', points: 200 },
                              { key: 'coup_couronnement' as const, label: 'Coup du Couronnement', points: 300 },
                              { key: 'capot' as const, label: 'Capot', points: 500 }
                            ].map(({ key, label, points }) => (
                              <label key={key} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={roundData.primes[player.id]?.[key] || false}
                                  onChange={(e) => updatePlayerPrime(player.id, key, e.target.checked)}
                                  className="w-4 h-4"
                                />
                                <span className="text-xs">{label} (+{points})</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                      </div>
                    </div>

                    {/* Bonus manche terminée automatique */}
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-800 dark:text-green-200">
                      <strong>+400 points</strong> automatiques si 1000 bornes atteintes
                    </div>
                  </div>
                </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleSubmitRound}
                disabled={isSubmitting}
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
                        {session?.players.map(player => (
                          <td key={player.id} className="py-2 px-3 text-center text-sm">
                            <span className="font-medium text-green-600">
                              +{round.scores[player.id] || 0}
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
        <div className="lg:col-span-1 space-y-4">
          <GameCard title="🏆 Classement - Objectif : 5000 pts">
            <div className="space-y-3">
              {rankedTeams.map((team, index) => (
                <div 
                  key={team.id}
                  className={`p-3 rounded-lg border ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' 
                      : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${
                        index === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        #{index + 1}
                      </span>
                      <span className="font-semibold">{team.name}</span>
                    </div>
                    <span className={`font-bold ${
                      index === 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {team.total_score} pts
                    </span>
                  </div>
                  <div className="space-y-1">
                    {team.players.map(player => (
                      <div key={player.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${
                            player.is_connected ? 'bg-green-500' : 'bg-gray-400'
                          }`}></div>
                          <span>{player.player_name}</span>
                        </div>
                        <span>{getTotalScore(player.id)} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GameCard>
          
          {/* Rappel des vraies règles */}
          <GameCard title="💡 Le saviez-vous ?">
            <div className="text-sm space-y-2">
              <p>
                <strong>Configuration officielle : 2 contre 2 !</strong>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Le score d'équipe = addition des points de chaque partenaire.
                Première équipe à <strong>5000 points</strong> gagne !
              </p>
              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
                <MilleBornesRulesHelper />
              </div>
            </div>
          </GameCard>
        </div>
      </div>
    </GameLayout>
  );
}