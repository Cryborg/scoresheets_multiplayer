'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Car, Award } from 'lucide-react';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import RankingSidebar from '@/components/layout/RankingSidebar';
import ScoreInput from '@/components/ui/ScoreInput';
import { GameSessionWithRounds, Player } from '@/types/multiplayer';

interface MilleBornesRoundData {
  distances: { [playerId: number]: number };
  primes: { [playerId: number]: MilleBornesPrimes };
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

// Reuse the exact PlayerScoreInputModule from the original
interface PlayerScoreInputModuleProps {
  player: Player;
  roundData: MilleBornesRoundData;
  gameVariant: GameVariant;
  calculatePlayerScore: (playerId: number) => number;
  updatePlayerDistance: (playerId: number, distance: number) => void;
  updatePlayerPrime: (playerId: number, primeKey: keyof MilleBornesPrimes, value: boolean) => void;
}

const PlayerScoreInputModule: React.FC<PlayerScoreInputModuleProps> = React.memo(
  function PlayerScoreInputModule({ player, roundData, gameVariant, calculatePlayerScore, updatePlayerDistance, updatePlayerPrime }) {
    return (
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
    );
  }
);

// Read-only component for opponent team display - shows full details but no interactions
interface ReadOnlyPlayerScoreModuleProps {
  player: Player;
  gameVariant: GameVariant;
  calculatePlayerScore: (playerId: number) => number;
  roundData: MilleBornesRoundData;
}

const ReadOnlyPlayerScoreModule: React.FC<ReadOnlyPlayerScoreModuleProps> = ({ 
  player, 
  gameVariant, 
  calculatePlayerScore, 
  roundData 
}) => {
  return (
    <div key={player.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 opacity-75">
      <h3 className="font-medium mb-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          player.is_connected ? 'bg-green-500' : 'bg-gray-400'
        }`}></div>
        {player.player_name}
        <span className="text-sm text-gray-500 ml-auto">
          Total: {calculatePlayerScore(player.id)}
        </span>
        <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
          👁️ Lecture seule
        </span>
      </h3>
      
      {/* Distance - Read Only */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
          Distance parcourue (km)
        </label>
        <div className="bg-gray-100 dark:bg-gray-700 border rounded-lg px-3 py-2 text-gray-600 dark:text-gray-400">
          {roundData.distances[player.id] || 0} km
        </div>
      </div>

      {/* Bottes et Coups Fourrés - Read Only */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-1 text-gray-600 dark:text-gray-400">
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
            <div key={botteKey} className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-750">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
                <span className="text-xs text-gray-500">{description}</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    roundData.primes[player.id]?.[botteKey] 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                  }`}>
                    {roundData.primes[player.id]?.[botteKey] && '✓'}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Botte (+100)</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    roundData.primes[player.id]?.[coupKey] 
                      ? 'bg-blue-500 border-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                  }`}>
                    {roundData.primes[player.id]?.[coupKey] && '✓'}
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Coup fourré (+300)</span>
                </div>
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
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  roundData.primes[player.id]?.sans_les_200 
                    ? 'bg-purple-500 border-purple-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                }`}>
                  {roundData.primes[player.id]?.sans_les_200 && '✓'}
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Sans les 200 (+300)</span>
              </div>
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
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      roundData.primes[player.id]?.[key] 
                        ? 'bg-orange-500 border-orange-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                    }`}>
                      {roundData.primes[player.id]?.[key] && '✓'}
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{label} (+{points})</span>
                  </div>
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
  );
};

// Internal component to handle all the hooks properly
function MilleBornesEquipesGameInterface({ 
  session, 
  gameState 
}: { 
  session: GameSessionWithRounds; 
  gameState: ReturnType<typeof import('@/hooks/useMultiplayerGame').useMultiplayerGame>; 
}) {
  const [roundData, setRoundData] = useState<MilleBornesRoundData>({
    distances: {},
    primes: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameVariant, setGameVariant] = useState<GameVariant>('moderne');
  const [showOtherTeam, setShowOtherTeam] = useState(false);
  
  // Store other teams' round data from session events
  const [otherTeamsRoundData, setOtherTeamsRoundData] = useState<MilleBornesRoundData>({
    distances: {},
    primes: {}
  });

  // Debounce timeout for broadcasting changes
  const broadcastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Variant synchronization: Check session events for host's choice
  const [variantSelected, setVariantSelected] = useState(false);
  

  const effectiveVariant = gameVariant;

  // Get my team and other team players
  const { myTeamPlayers, otherTeamPlayers, displayTeamId } = useMemo(() => {
    if (!session?.players) {
      return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
    }
    
    const currentUserId = gameState.currentUserId;
    const currentPlayer = session.players.find(p => p.user_id === currentUserId);
    
    if (!currentPlayer) {
      return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
    }
    
    // Primary method: Use team_id from player record (most reliable)
    const myTeamId = currentPlayer.team_id;
    
    if (myTeamId) {
      const myPlayers = session.players.filter(p => p.team_id === myTeamId);
      const otherPlayers = session.players.filter(p => p.team_id && p.team_id !== myTeamId);
      
      // Convert database team IDs to display IDs (1 or 2)
      let displayId = 1;
      if (myTeamId === 1) displayId = 1;
      else if (myTeamId === 2) displayId = 2;
      else if (myTeamId > 20) displayId = myTeamId - 20; // Convert 21->1, 22->2
      else displayId = myTeamId <= 2 ? myTeamId : 1;
      
      return { 
        myTeamPlayers: myPlayers, 
        otherTeamPlayers: otherPlayers, 
        displayTeamId: displayId
      };
    }
    
    // Fallback method: Try session.teams structure
    if (session.teams && session.teams.length > 0) {
      const myTeam = session.teams.find(team => 
        team.players?.some(p => p.user_id === currentUserId)
      );
      
      if (myTeam) {
        const otherTeam = session.teams.find(team => team.id !== myTeam.id);
        const displayId = session.teams.indexOf(myTeam) + 1;
        
        return {
          myTeamPlayers: myTeam.players || [],
          otherTeamPlayers: otherTeam?.players || [],
          displayTeamId: displayId
        };
      }
    }
    
    return { myTeamPlayers: [], otherTeamPlayers: [], displayTeamId: 1 };
  }, [session?.players, session?.teams, gameState.currentUserId]);

  // Global round data - reconstructed from latest session round or current input
  const globalRoundData = useMemo((): MilleBornesRoundData => {
    const result: MilleBornesRoundData = {
      distances: {},
      primes: {}
    };

    // For my team, use current roundData (being edited)
    myTeamPlayers.forEach(player => {
      result.distances[player.id] = roundData.distances[player.id] || 0;
      result.primes[player.id] = roundData.primes[player.id] || {};
    });

    // For other team, use data from session events (live updates)
    otherTeamPlayers.forEach(player => {
      result.distances[player.id] = otherTeamsRoundData.distances[player.id] || 0;
      result.primes[player.id] = otherTeamsRoundData.primes[player.id] || {};
    });

    return result;
  }, [roundData, myTeamPlayers, otherTeamPlayers, otherTeamsRoundData]);

  const calculatePlayerScore = useCallback((playerId: number) => {
    const distance = Number(globalRoundData.distances[playerId]) || 0;
    const primes = globalRoundData.primes[playerId];
    
    if (!primes) {
      return distance + (distance >= 1000 ? PRIME_VALUES.manche_terminee : 0);
    }

    let score = distance;

    // Bottes
    if (primes.as_volant) score += PRIME_VALUES.botte;
    if (primes.increvable) score += PRIME_VALUES.botte;
    if (primes.citerne) score += PRIME_VALUES.botte;
    if (primes.prioritaire) score += PRIME_VALUES.botte;

    // Coups fourrés
    if (primes.as_volant_coup_fourre) score += PRIME_VALUES.coup_fourre;
    if (primes.increvable_coup_fourre) score += PRIME_VALUES.coup_fourre;
    if (primes.citerne_coup_fourre) score += PRIME_VALUES.coup_fourre;
    if (primes.prioritaire_coup_fourre) score += PRIME_VALUES.coup_fourre;

    // Fins de manche communes
    if (primes.allonge) score += PRIME_VALUES.allonge;
    if (primes.sans_les_200) score += PRIME_VALUES.sans_les_200;

    // Fins de manche classique uniquement
    if (effectiveVariant === 'classique') {
      if (primes.coup_couronnement) score += PRIME_VALUES.coup_couronnement;
      if (primes.capot) score += PRIME_VALUES.capot;
    }

    // Bonus manche terminée automatique si 1000 bornes
    if (distance >= 1000) {
      score += PRIME_VALUES.manche_terminee;
    }

    return score;
  }, [globalRoundData.distances, globalRoundData.primes, effectiveVariant]);

  // Function to broadcast round data changes (declared before usage)
  const broadcastRoundData = useCallback(async (overrideData?: MilleBornesRoundData) => {
    if (!session) return;
    
    // Use override data if provided, otherwise use current state
    const currentData = overrideData || roundData;
    
    const dataToSend = {
      roundData: {
        distances: Object.fromEntries(
          myTeamPlayers.map(p => [p.id, currentData.distances[p.id] || 0])
        ),
        primes: Object.fromEntries(
          myTeamPlayers.map(p => [p.id, currentData.primes[p.id] || {}])
        )
      }
    };
    
    
    try {
      await fetch(`/api/sessions/${session.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'round_data_updated',
          event_data: dataToSend
        }),
      });
    } catch {
      // Silently fail, sync will happen on next update
    }
  }, [session, myTeamPlayers, roundData]);


  const updatePlayerDistance = useCallback((playerId: number, distance: number) => {
    const newRoundData = {
      distances: { ...roundData.distances, [playerId]: distance },
      primes: roundData.primes
    };
    
    setRoundData(newRoundData);
    
    // Broadcast with the new data immediately, not after state update
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }
    
    broadcastTimeoutRef.current = setTimeout(() => {
      broadcastRoundData(newRoundData);
      broadcastTimeoutRef.current = null;
    }, 50);
  }, [roundData, broadcastRoundData]);

  const updatePlayerPrime = useCallback((playerId: number, primeKey: keyof MilleBornesPrimes, value: boolean) => {
    const newRoundData = {
      distances: roundData.distances,
      primes: {
        ...roundData.primes,
        [playerId]: {
          ...roundData.primes[playerId],
          [primeKey]: value
        }
      }
    };
    
    setRoundData(newRoundData);
    
    // Broadcast with the new data immediately, not after state update
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
    }
    
    broadcastTimeoutRef.current = setTimeout(() => {
      broadcastRoundData(newRoundData);
      broadcastTimeoutRef.current = null;
    }, 50);
  }, [roundData, broadcastRoundData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (broadcastTimeoutRef.current) {
        clearTimeout(broadcastTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting || !myTeamPlayers.length) return;

    // Force immediate broadcast of current state before submitting
    if (broadcastTimeoutRef.current) {
      clearTimeout(broadcastTimeoutRef.current);
      broadcastTimeoutRef.current = null;
    }
    await broadcastRoundData();

    setIsSubmitting(true);
    try {
      const scoresArray = myTeamPlayers.map(player => ({
        playerId: player.id,
        score: calculatePlayerScore(player.id)
      }));

      // Submit scores via gameState
      await gameState.addRound(scoresArray);
      
      // Reset form
      const resetDistances: { [playerId: number]: number } = {};
      const resetPrimes: { [playerId: number]: MilleBornesPrimes } = {};
      myTeamPlayers.forEach(player => {
        resetDistances[player.id] = 0;
        resetPrimes[player.id] = {};
      });
      
      setRoundData({
        distances: resetDistances,
        primes: resetPrimes
      });
    } catch {
      // Error already handled by addRound
    } finally {
      setIsSubmitting(false);
    }
  }, [session, isSubmitting, myTeamPlayers, calculatePlayerScore, gameState, broadcastRoundData]);

  // Check session events for variant selection
  useEffect(() => {
    if (session && gameState.events) {
      const variantEvent = gameState.events
        .slice()
        .reverse() // Check most recent events first
        .find(event => event.event_type === 'variant_selected');
      
      if (variantEvent && variantEvent.event_data) {
        try {
          const data = JSON.parse(variantEvent.event_data);
          if (data.variant && !variantSelected) {
            setGameVariant(data.variant as GameVariant);
            setVariantSelected(true);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [session, gameState.events, variantSelected]);

  // Listen for round data updates from other teams
  useEffect(() => {
    if (session && gameState.events) {
      // Find the most recent round_data_updated event from each team
      const roundDataEvents = gameState.events
        .filter(event => event.event_type === 'round_data_updated')
        .reverse(); // Most recent first


      if (roundDataEvents.length > 0) {
        const updatedData: MilleBornesRoundData = { distances: {}, primes: {} };
        
        // Process only the FIRST event (most recent) that contains data for each player
        const processedDistances = new Set<number>();
        const processedPrimes = new Set<number>();
        
        roundDataEvents.forEach(event => {
          if (event.event_data) {
            try {
              const data = JSON.parse(event.event_data);
              
              if (data.roundData) {
                // Process distances - only accept data from players not in my team AND not already processed
                Object.entries(data.roundData.distances || {}).forEach(([playerIdStr, distance]) => {
                  const playerId = Number(playerIdStr);
                  const isMyPlayer = myTeamPlayers.find(p => p.id === playerId);
                  
                  if (!isMyPlayer && !processedDistances.has(playerId)) {
                    updatedData.distances[playerId] = distance as number;
                    processedDistances.add(playerId);
                  }
                });
                
                // Process primes separately
                Object.entries(data.roundData.primes || {}).forEach(([playerIdStr, primes]) => {
                  const playerId = Number(playerIdStr);
                  const isMyPlayer = myTeamPlayers.find(p => p.id === playerId);
                  
                  if (!isMyPlayer && !processedPrimes.has(playerId)) {
                    updatedData.primes[playerId] = primes as MilleBornesPrimes;
                    processedPrimes.add(playerId);
                  }
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        });
        
        setOtherTeamsRoundData(updatedData);
      }
    }
  }, [session, gameState.events, myTeamPlayers]);

  // Handle variant selection by host
  const handleSaveVariant = useCallback(async () => {
    if (!session || !gameState.isHost) return;

    try {
      // Create event via existing API (with correct field names)
      const response = await fetch(`/api/sessions/${session.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'variant_selected',
          event_data: { variant: gameVariant }
        }),
      });

      if (response.ok) {
        // Update local state immediately
        setVariantSelected(true);
      }
    } catch {
      // Fallback: still update local state if API fails
      setVariantSelected(true);
    }
  }, [session, gameState.isHost, gameVariant]);

  // Show variant selection for host, waiting screen for others
  if (!variantSelected) {
    if (!gameState.isHost) {
      return (
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Mille Bornes par Équipes</h1>
            <p className="text-gray-600 dark:text-gray-400">
              En attente que l&apos;hôte choisisse la variante de jeu...
            </p>
          </div>
        </div>
      );
    }

    // Host chooses variant
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-6">
            <Car className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Choisir la version des règles</h1>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            Le Mille Bornes existe en deux versions principales. Choisissez celle que vous préférez :
          </p>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Version moderne */}
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                gameVariant === 'moderne' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setGameVariant('moderne')}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  checked={gameVariant === 'moderne'}
                  onChange={() => {}} 
                  className="w-4 h-4"
                />
                <h3 className="font-bold text-lg">Version Moderne</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Version simplifiée, plus accessible
              </p>
              <ul className="text-xs text-gray-500">
                <li>• Bottes et coups fourrés (+100 et +300 pts)</li>
                <li>• Manche terminée (+400 pts)</li>
                <li>• Sans les 200 (+300 pts)</li>
              </ul>
            </div>

            {/* Version classique */}
            <div 
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                gameVariant === 'classique' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setGameVariant('classique')}
            >
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  checked={gameVariant === 'classique'}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <h3 className="font-bold text-lg">Version Classique</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Toutes les règles officielles complètes
              </p>
              <ul className="text-xs text-gray-500">
                <li>• Toutes les primes modernes</li>
                <li>• + Allonge (+200 pts)</li>
                <li>• + Coup du couronnement (+300 pts)</li>
                <li>• + Capot (+500 pts)</li>
              </ul>
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={handleSaveVariant}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Commencer la partie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main game interface with complete score sheets
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        
        {/* My team section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b-2 border-blue-500 pb-2">
            Mon Équipe {displayTeamId}
          </h2>
          <div className="space-y-6">
            {myTeamPlayers.map(player => (
              <PlayerScoreInputModule
                key={player.id}
                player={player}
                roundData={roundData}
                gameVariant={effectiveVariant}
                calculatePlayerScore={calculatePlayerScore}
                updatePlayerDistance={updatePlayerDistance}
                updatePlayerPrime={updatePlayerPrime}
              />
            ))}
          </div>
          
          {/* Action buttons right after my team */}
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={handleSubmitRound}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
            >
              {isSubmitting ? 'Soumission...' : 'Soumettre la manche'}
            </button>
            
            <button
              onClick={() => setShowOtherTeam(!showOtherTeam)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
            >
              {showOtherTeam ? 'Masquer' : 'Voir'} équipe adverse
            </button>
          </div>
        </div>

        {/* Other team section - READ ONLY */}
        {showOtherTeam && otherTeamPlayers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 border-b-2 border-red-500 pb-2">
              Équipe Adverse {displayTeamId === 1 ? 2 : 1}
            </h2>
            <div className="space-y-6">
              {otherTeamPlayers.map(player => (
                <ReadOnlyPlayerScoreModule
                  key={player.id}
                  player={player}
                  gameVariant={effectiveVariant}
                  calculatePlayerScore={calculatePlayerScore}
                  roundData={globalRoundData}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MilleBornesEquipesScoreSheetMultiplayerTeam({ sessionId }: { sessionId: string }) {
  const createRankingComponent = useCallback((session: GameSessionWithRounds) => {
    // Use actual teams from session.teams if available
    if (session.teams && session.teams.length > 0) {
      const teamsRanking = session.teams.map(team => ({
        id: team.id, // Use actual team ID from database
        player_name: team.team_name || `Équipe ${team.id}`,
        total_score: (team.players || []).reduce((sum, player) => sum + (player.total_score || 0), 0),
        is_connected: 1,
        is_ready: 1,
        position: team.id
      })).sort((a, b) => b.total_score - a.total_score);

      return <RankingSidebar players={teamsRanking} scoreTarget={session.score_target} showConnectionStatus={false} />;
    }
    
    // Fallback to manual team construction
    const team1Players = (session.players || []).filter(p => p.team_id === 1);
    const team2Players = (session.players || []).filter(p => p.team_id === 2);
    
    const teamsRanking = [
      { 
        id: 1,
        player_name: 'Équipe 1',
        total_score: team1Players.reduce((sum, player) => sum + (player.total_score || 0), 0),
        is_connected: 1,
        is_ready: 1,
        position: 1
      },
      { 
        id: 2,
        player_name: 'Équipe 2',
        total_score: team2Players.reduce((sum, player) => sum + (player.total_score || 0), 0),
        is_connected: 1,
        is_ready: 1,
        position: 2
      }
    ].filter(team => team.total_score > 0 || (team.id === 1 ? team1Players.length : team2Players.length) > 0)
     .sort((a, b) => b.total_score - a.total_score);

    return <RankingSidebar players={teamsRanking} scoreTarget={session.score_target} showConnectionStatus={false} />;
  }, []);

  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId}
      gameSlug="mille-bornes-equipes"
      rankingComponent={createRankingComponent}
    >
      {({ session, gameState }) => (
        <MilleBornesEquipesGameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}