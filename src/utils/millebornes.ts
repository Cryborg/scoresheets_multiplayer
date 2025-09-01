/**
 * Utility functions for Mille Bornes game
 * Helpers for data initialization and manipulation
 */

import { MilleBornesPrimes, MilleBornesRoundData } from '@/constants/millebornes';

/**
 * Create empty primes object with all values set to false
 */
export function createEmptyPrimes(): MilleBornesPrimes {
  return {
    as_volant: false,
    citerne: false,
    prioritaire: false,
    increvable: false,
    as_volant_coup_fourre: false,
    citerne_coup_fourre: false,
    prioritaire_coup_fourre: false,
    increvable_coup_fourre: false,
    allonge: false,
    fin_contrat: false,
    fin_contrat_200: false,
    fin_limite: false,
    fin_limite_expert: false,
    fin_expert: false,
    fin_expert_200: false,
    fin_acrobate: false,
    fin_acrobate_expert: false,
    fin_acrobate_sans_escale: false,
    fin_vitesse: false,
    fin_acrobate_vitesse: false,
  };
}

/**
 * Create empty round data for a list of players
 */
export function createEmptyRoundData(playerIds: number[]): MilleBornesRoundData {
  const distances: Record<number, number> = {};
  const primes: Record<number, MilleBornesPrimes> = {};
  
  playerIds.forEach(id => {
    distances[id] = 0;
    primes[id] = createEmptyPrimes();
  });
  
  return { distances, primes };
}

/**
 * Merge round data from different sources (for real-time sync)
 */
export function mergeRoundData(
  current: MilleBornesRoundData,
  incoming: Partial<MilleBornesRoundData>
): MilleBornesRoundData {
  return {
    distances: {
      ...current.distances,
      ...(incoming.distances || {})
    },
    primes: {
      ...current.primes,
      ...(incoming.primes || {})
    }
  };
}

/**
 * Calculate total primes value for a player
 */
export function calculatePrimesTotal(
  primes: MilleBornesPrimes,
  primeValues: Record<keyof MilleBornesPrimes, number>
): number {
  let total = 0;
  
  (Object.keys(primes) as Array<keyof MilleBornesPrimes>).forEach(key => {
    if (primes[key] && primeValues[key]) {
      total += primeValues[key];
    }
  });
  
  return total;
}

/**
 * Check if a team has reached 5000 points (victory condition)
 */
export function checkVictoryCondition(totalScore: number): boolean {
  return totalScore >= 5000;
}

/**
 * Format score display with thousands separator
 */
export function formatScore(score: number): string {
  return score.toLocaleString('fr-FR');
}

/**
 * Extract team players from session
 */
export function getTeamPlayers(
  players: Array<{ id: number; team_id?: number | null; [key: string]: unknown }>,
  teamId: number
): number[] {
  return players
    .filter(player => {
      const playerTeamId = player.team_id || (player.id <= 2 ? 1 : 2);
      return playerTeamId === teamId;
    })
    .map(player => player.id);
}

/**
 * Determine display team ID from actual team ID
 * Team IDs in DB can be anything, but we display as Team 1 or Team 2
 */
export function getDisplayTeamId(teamId: number | null | undefined): 1 | 2 {
  if (!teamId || teamId === 1) return 1;
  if (teamId === 2) return 2;
  // For any other ID (like 21, 22), map to team 1 or 2
  if (teamId >= 21 && teamId <= 22) {
    return (teamId - 20) as 1 | 2;
  }
  // Default fallback
  return 1;
}