'use client';

import { useRealtimeSession } from '@/hooks/useRealtimeSession';
import RoundBasedScoreSheet from './RoundBasedScoreSheet';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { Dice6 } from 'lucide-react';

interface GenericScoreSheetProps {
  sessionId: string;
  gameSlug: string;
}

export default function GenericScoreSheet({ sessionId, gameSlug }: GenericScoreSheetProps) {
  // Récupérer les informations de la session pour obtenir la direction du score
  const { session } = useRealtimeSession<GameSessionWithRounds>({ sessionId, gameSlug });
  
  // Récupérer la direction du score depuis les données de la session
  const scoreDirection = session?.game?.score_direction || 'higher';
  
  return (
    <RoundBasedScoreSheet
      sessionId={sessionId}
      gameSlug={gameSlug}
      gameTitle={session?.game?.name || "Jeu de points"}
      gameIcon={<Dice6 className="h-8 w-8 text-blue-600" />}
      scoreDirection={scoreDirection as 'higher' | 'lower'}
      showLowestScore={scoreDirection === 'lower'}
    />
  );
}