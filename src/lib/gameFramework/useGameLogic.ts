'use client';

import { useState, useCallback, useMemo } from 'react';
import { GameSessionWithRounds, GameSessionWithCategories, Player } from '@/types/multiplayer';
import { 
  GameDefinition, 
  UseGameLogicOptions, 
  UseGameLogicResult,
  PlayerScores 
} from './types';

/**
 * Hook principal du Game Framework
 * Encapsule toute la logique commune des jeux multijoueurs
 */
export function useGameLogic<TRoundData = any>({
  definition,
  session,
  gameState
}: UseGameLogicOptions<TRoundData>): UseGameLogicResult<TRoundData> {
  const { addRound } = gameState;

  // État du formulaire de manche
  const [roundData, setRoundData] = useState<TRoundData>(() => {
    // Créer les valeurs par défaut à partir de la définition
    const defaultData: any = {};
    definition.ui.roundForm.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultData[field.name] = field.defaultValue;
      } else {
        // Valeurs par défaut selon le type
        switch (field.type) {
          case 'number':
            defaultData[field.name] = field.min || 0;
            break;
          case 'checkbox':
            defaultData[field.name] = false;
            break;
          case 'select':
          case 'radio':
            defaultData[field.name] = field.options?.[0]?.value || '';
            break;
          default:
            defaultData[field.name] = '';
        }
      }
    });
    return defaultData as TRoundData;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset du formulaire
  const resetForm = useCallback(() => {
    setRoundData(() => {
      const defaultData: any = {};
      definition.ui.roundForm.fields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaultData[field.name] = field.defaultValue;
        } else {
          switch (field.type) {
            case 'number':
              defaultData[field.name] = field.min || 0;
              break;
            case 'checkbox':
              defaultData[field.name] = false;
              break;
            case 'select':
            case 'radio':
              defaultData[field.name] = field.options?.[0]?.value || '';
              break;
            default:
              defaultData[field.name] = '';
          }
        }
      });
      return defaultData as TRoundData;
    });
  }, [definition]);

  // Calcul des scores totaux
  const getTotalScore = useCallback((playerId: number): number => {
    if (!session?.rounds) return 0;
    return session.rounds.reduce((total, round) => {
      return total + (round.scores[playerId] || 0);
    }, 0);
  }, [session?.rounds]);

  // Calcul des scores d'équipe (si applicable)
  const getTeamScore = useCallback((teamId: string): number => {
    if (!session?.players || !definition.ui.layout.teams) return 0;
    
    const team = definition.ui.layout.teams.find(t => t.id === teamId);
    if (!team) return 0;
    
    const teamPlayers = team.players(session);
    return teamPlayers.reduce((total, player) => total + getTotalScore(player.id), 0);
  }, [session, definition.ui.layout.teams, getTotalScore]);

  // Numéro de la manche actuelle
  const getCurrentRound = useCallback((): number => {
    return (session?.rounds?.length || 0) + 1;
  }, [session?.rounds]);

  // Validation des données
  const validateRoundData = useCallback((data: TRoundData): { valid: boolean; error?: string } => {
    // Validation custom du jeu
    if (definition.rules.validateRoundData) {
      const customValidation = definition.rules.validateRoundData(data);
      if (!customValidation.valid) {
        return customValidation;
      }
    }

    // Validation générique basée sur les champs
    for (const field of definition.ui.roundForm.fields) {
      const value = (data as any)[field.name];
      
      if (field.required && (value === undefined || value === null || value === '')) {
        return { valid: false, error: `Le champ "${field.label}" est requis.` };
      }
      
      if (field.type === 'number' && typeof value === 'number') {
        if (field.min !== undefined && value < field.min) {
          return { valid: false, error: `${field.label} doit être supérieur ou égal à ${field.min}.` };
        }
        if (field.max !== undefined && value > field.max) {
          return { valid: false, error: `${field.label} doit être inférieur ou égal à ${field.max}.` };
        }
      }
      
      if (field.validation && !field.validation(value)) {
        return { valid: false, error: `Valeur invalide pour ${field.label}.` };
      }
    }
    
    return { valid: true };
  }, [definition, roundData]);

  // Soumission d'une manche
  const handleSubmitRound = useCallback(async () => {
    if (!session || isSubmitting) return;

    // Validation
    const validation = validateRoundData(roundData);
    if (!validation.valid) {
      alert(validation.error || 'Données invalides');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calcul des scores via les règles du jeu
      const calculatedScores = definition.rules.calculateScore(roundData, session);
      
      // Conversion pour l'API
      const scoresArray = Object.entries(calculatedScores).map(([playerId, score]) => ({
        playerId: parseInt(playerId),
        score: score
      }));

      // Ajout de la manche avec détails
      await addRound(scoresArray, roundData);

      // Reset du formulaire après succès
      resetForm();
    } catch (error) {
      console.error('Error submitting round:', error);
      alert('Erreur lors de l\'ajout de la manche');
    } finally {
      setIsSubmitting(false);
    }
  }, [session, roundData, isSubmitting, definition, addRound, resetForm, validateRoundData]);

  // Calcul du gagnant
  const winner = useMemo((): Player | null => {
    if (!definition.rules.getWinner || !session) return null;
    return definition.rules.getWinner(session);
  }, [definition.rules, session]);

  // État de fin de partie
  const isGameFinished = useMemo((): boolean => {
    if (!definition.rules.isGameFinished || !session) return false;
    return definition.rules.isGameFinished(session);
  }, [definition.rules, session]);

  return {
    // État du formulaire
    roundData,
    setRoundData,
    isSubmitting,
    
    // Actions
    handleSubmitRound,
    resetForm,
    
    // Calculs utiles
    getTotalScore,
    getTeamScore: definition.ui.layout.type === 'teams' ? getTeamScore : undefined,
    getCurrentRound,
    
    // État de la partie
    winner,
    isGameFinished
  };
}