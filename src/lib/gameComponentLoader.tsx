import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

export interface ScoreSheetProps {
  sessionId: string;
  gameSlug?: string;
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
 * Détecte si un slug correspond à un jeu personnalisé
 * Format: nom-slug-userId-timestamp
 */
function isCustomGameSlug(slug: string): boolean {
  // Custom games have format: name-userId-timestamp
  const parts = slug.split('-');
  if (parts.length < 3) return false;
  
  const lastTwoParts = parts.slice(-2);
  const userId = lastTwoParts[0];
  const timestamp = lastTwoParts[1];
  
  // Check if userId is numeric and timestamp looks like a timestamp
  return !isNaN(Number(userId)) && !isNaN(Number(timestamp)) && timestamp.length >= 10;
}

/**
 * Détermine quel composant utiliser pour un jeu donné
 * Utilise un composant spécifique si disponible
 */
export function getGameComponent(gameInfo: GameInfo | string): ComponentType<ScoreSheetProps> | null {
  const slug = typeof gameInfo === 'string' ? gameInfo : gameInfo.slug;
  
  // Check if it's a custom game first
  if (isCustomGameSlug(slug)) {
    return specificComponents['jeu-libre']; // Use GenericScoreSheet for custom games
  }
  
  // Otherwise look for specific component
  return specificComponents[slug] || null;
}