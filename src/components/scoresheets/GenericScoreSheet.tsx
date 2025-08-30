'use client';

import RoundBasedScoreSheet from './RoundBasedScoreSheet';
import { Dice6 } from 'lucide-react';

interface GenericScoreSheetProps {
  sessionId: string;
  gameSlug: string;
}

export default function GenericScoreSheet({ sessionId, gameSlug }: GenericScoreSheetProps) {
  return (
    <RoundBasedScoreSheet
      sessionId={sessionId}
      gameSlug={gameSlug}
      gameTitle="Jeu de points"
      gameIcon={<Dice6 className="h-8 w-8 text-blue-600" />}
      scoreDirection="higher"
      showLowestScore={true}
    />
  );
}