'use client';

import { useState, useCallback } from 'react';

interface UseScoreActionsProps {
  sessionId: string;
  onScoreUpdate?: (categoryId: string, playerId: number, score: number) => void;
}

export function useScoreActions({ sessionId, onScoreUpdate }: UseScoreActionsProps) {
  const [savingScores, setSavingScores] = useState<{ [key: string]: boolean }>({});

  // Submit a score for a specific category and player
  const submitScore = useCallback(async (categoryId: string, playerId: number, score: string | number) => {
    const numericScore = typeof score === 'string' ? (parseInt(score) || 0) : score;
    const saveKey = `${categoryId}-${playerId}`;
    
    setSavingScores(prev => ({ ...prev, [saveKey]: true }));

    try {
      // Save to API with credentials
      const response = await fetch(`/api/sessions/${sessionId}/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: inclure les cookies d'auth
        body: JSON.stringify({
          categoryId,
          playerId,
          score: numericScore
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      
      // Notify parent of successful update
      onScoreUpdate?.(categoryId, playerId, numericScore);

      // Send event for other players
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'score_updated',
          event_data: {
            categoryId,
            playerId,
            score: numericScore
          }
        }),
      });

      return result;
    } catch (error) {
      throw error;
    } finally {
      setSavingScores(prev => ({ ...prev, [saveKey]: false }));
    }
  }, [sessionId, onScoreUpdate]);

  // Submit a round for round-based games
  const submitRound = useCallback(async (scores: Array<{ playerId: number; score: number }>, details?: Record<string, any>) => {
    const roundKey = `round-${Date.now()}`;
    setSavingScores(prev => ({ ...prev, [roundKey]: true }));

    try {
      const response = await fetch(`/api/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ scores, details }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Send event for other players
      await fetch(`/api/sessions/${sessionId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          event_type: 'round_added',
          event_data: {
            round_number: result.round_number || 'nouveau',
            player_count: scores.length
          }
        }),
      });

      return result;
    } catch (error) {
      throw error;
    } finally {
      setSavingScores(prev => ({ ...prev, [roundKey]: false }));
    }
  }, [sessionId]);

  // Check if a specific score is being saved
  const isSaving = useCallback((categoryId: string, playerId: number) => {
    const saveKey = `${categoryId}-${playerId}`;
    return savingScores[saveKey] || false;
  }, [savingScores]);

  // Check if any score is being saved
  const isAnySaving = Object.values(savingScores).some(saving => saving);

  return {
    submitScore,
    submitRound,
    isSaving,
    isAnySaving,
    savingScores
  };
}