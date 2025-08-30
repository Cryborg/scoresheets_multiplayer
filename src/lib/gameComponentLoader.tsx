import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export interface ScoreSheetProps {
  sessionId: string;
}

interface GameInfo {
  slug: string;
  score_type?: string;
}

const LoadingComponent = () => (
  <div className="text-center py-8">Chargement de la feuille de score...</div>
);

// Composants spécifiques multiplayer
const specificComponents: Record<string, ComponentType<ScoreSheetProps>> = {
  'yams': dynamic(() => import('@/components/scoresheets/YamsScoreSheetMultiplayer'), {
    loading: LoadingComponent
  }),
  'tarot': dynamic(() => import('@/components/scoresheets/TarotScoreSheetMultiplayer'), {
    loading: LoadingComponent
  }),
  'bridge': dynamic(() => import('@/components/scoresheets/BridgeScoreSheetMultiplayer'), {
    loading: LoadingComponent
  }),
  'belote': dynamic(() => import('@/components/scoresheets/BeloteScoreSheetMultiplayer'), {
    loading: LoadingComponent
  }),
  'pierre-papier-ciseaux': dynamic(() => import('@/components/scoresheets/PierrePapierCiseauxScoreSheet'), {
    loading: LoadingComponent
  }),
  'mille-bornes': dynamic(() => import('@/components/scoresheets/MilleBornesScoreSheetMultiplayer'), {
    loading: LoadingComponent
  }),
  'mille-bornes-equipes': dynamic(() => import('@/components/scoresheets/MilleBornesEquipesScoreSheetMultiplayerTeam'), {
    loading: LoadingComponent
  }),
  'rami': dynamic(() => import('@/components/scoresheets/RamiScoreSheet'), {
    loading: LoadingComponent
  }),
  'jeu-libre': dynamic(() => import('@/components/scoresheets/GenericScoreSheet'), {
    loading: LoadingComponent
  }),
};

/**
 * Détermine quel composant utiliser pour un jeu donné
 * Utilise un composant spécifique si disponible
 */
export function getGameComponent(gameInfo: GameInfo | string): ComponentType<ScoreSheetProps> | null {
  // Si c'est juste un slug string, on cherche d'abord dans les composants spécifiques
  if (typeof gameInfo === 'string') {
    return specificComponents[gameInfo] || null;
  }
  
  // Sinon on cherche un composant spécifique basé sur le slug
  return specificComponents[gameInfo.slug] || null;
}