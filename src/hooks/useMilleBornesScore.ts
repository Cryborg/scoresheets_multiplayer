/**
 * Hook for Mille Bornes score calculation
 * Centralizes all scoring logic
 */

import { useCallback, useMemo } from 'react';
import { 
  MilleBornesRoundData, 
  MilleBornesPrimes, 
  GameVariant,
  PRIME_VALUES 
} from '@/constants/millebornes';
import { calculatePrimesTotal } from '@/utils/millebornes';

interface UseMilleBornesScoreReturn {
  calculatePlayerScore: (playerId: number) => number;
  calculateTeamScore: (playerIds: number[]) => number;
  calculateTotalWithPreviousRounds: (currentScore: number, previousTotal: number) => number;
}

export function useMilleBornesScore(
  roundData: MilleBornesRoundData,
  gameVariant: GameVariant = 'classic'
): UseMilleBornesScoreReturn {
  
  /**
   * Calculate score for a single player
   */
  const calculatePlayerScore = useCallback((playerId: number): number => {
    const distance = roundData.distances[playerId] || 0;
    const primes = roundData.primes[playerId] || {} as MilleBornesPrimes;
    
    // Base score is the distance
    let score = distance;
    
    // Add primes
    score += calculatePrimesTotal(primes, PRIME_VALUES);
    
    return score;
  }, [roundData]);
  
  /**
   * Calculate total score for a team
   */
  const calculateTeamScore = useCallback((playerIds: number[]): number => {
    return playerIds.reduce((total, playerId) => {
      return total + calculatePlayerScore(playerId);
    }, 0);
  }, [calculatePlayerScore]);
  
  /**
   * Calculate total including previous rounds
   */
  const calculateTotalWithPreviousRounds = useCallback(
    (currentScore: number, previousTotal: number): number => {
      return currentScore + previousTotal;
    },
    []
  );
  
  return useMemo(() => ({
    calculatePlayerScore,
    calculateTeamScore,
    calculateTotalWithPreviousRounds
  }), [calculatePlayerScore, calculateTeamScore, calculateTotalWithPreviousRounds]);
}