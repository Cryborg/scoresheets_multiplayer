// Game Framework - Mini-framework pour créer facilement de nouveaux jeux
// Exportations principales

import React from 'react';
import { GameSessionWithRounds, GameSessionWithCategories } from '@/types/multiplayer';

// Types
export type {
  GameDefinition,
  GameFrameworkProps,
  FormField,
  GameTheme,
  UILayout,
  TeamDefinition,
  ScoreCalculationRules,
  PlayerScores,
  UseGameLogicOptions,
  UseGameLogicResult
} from './types';

// Hook principal
export { useGameLogic } from './useGameLogic';

// Composants
export { default as GameFramework } from './components/GameFramework';
export { default as TeamScoreDisplay } from './components/TeamScoreDisplay';
export { default as IndividualScoreDisplay } from './components/IndividualScoreDisplay';
export { default as RoundHistory } from './components/RoundHistory';
export { default as DynamicForm } from './components/DynamicForm';

// Helpers pour créer rapidement des définitions de jeux
export const createIndividualGameDefinition = <TRoundData = Record<string, unknown>>(
  slug: string,
  name: string,
  options: {
    players: { min: number; max: number };
    fields: FormField[];
    calculateScore: (roundData: TRoundData, session: GameSessionWithRounds | GameSessionWithCategories) => PlayerScores;
    targetScore?: number;
    theme?: GameTheme;
    roundLabel?: string;
    customColumns?: Array<{ key: string; label: string; render?: (round: Record<string, unknown>) => React.ReactNode }>;
  }
): GameDefinition<TRoundData> => ({
  slug,
  name,
  players: options.players,
  scoreType: 'rounds',
  rules: {
    calculateScore: options.calculateScore
  },
  ui: {
    theme: options.theme || { primary: 'blue' },
    layout: {
      type: 'individual',
      scoreDisplay: {
        showIndividualScores: true,
        showTeamScores: false,
        showRankings: true,
        targetScore: options.targetScore
      },
      roundHistory: {
        show: true,
        columns: [
          { key: 'round', label: options.roundLabel || 'Manche' },
          ...(options.customColumns || []),
          { key: 'scores', label: 'Scores' }
        ]
      }
    },
    roundForm: {
      fields: options.fields
    },
    texts: {
      roundLabel: options.roundLabel
    }
  }
});

export const createTeamGameDefinition = <TRoundData = Record<string, unknown>>(
  slug: string,
  name: string,
  options: {
    players: { min: number; max: number; exactCount?: number };
    teams: TeamDefinition[];
    fields: FormField[];
    calculateScore: (roundData: TRoundData, session: GameSessionWithRounds | GameSessionWithCategories) => PlayerScores;
    targetScore?: number;
    theme?: GameTheme;
    roundLabel?: string;
    customColumns?: Array<{ key: string; label: string; render?: (round: Record<string, unknown>) => React.ReactNode }>;
  }
): GameDefinition<TRoundData> => ({
  slug,
  name,
  players: options.players,
  scoreType: 'rounds',
  rules: {
    calculateScore: options.calculateScore
  },
  ui: {
    theme: options.theme || { primary: 'blue' },
    layout: {
      type: 'teams',
      teams: options.teams,
      scoreDisplay: {
        showIndividualScores: true,
        showTeamScores: true,
        showRankings: false,
        targetScore: options.targetScore
      },
      roundHistory: {
        show: true,
        columns: [
          { key: 'round', label: options.roundLabel || 'Manche' },
          ...(options.customColumns || [])
        ]
      }
    },
    roundForm: {
      fields: options.fields
    },
    texts: {
      roundLabel: options.roundLabel
    }
  }
});