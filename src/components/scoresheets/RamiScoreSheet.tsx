'use client';

import RoundBasedScoreSheet from './RoundBasedScoreSheet';
import { Spade } from 'lucide-react';

interface RamiScoreSheetProps {
  sessionId: string;
}

export default function RamiScoreSheet({ sessionId }: RamiScoreSheetProps) {
  return (
    <RoundBasedScoreSheet
      sessionId={sessionId}
      gameSlug="rami"
      gameTitle="Rami"
      gameIcon={<Spade className="h-8 w-8 text-blue-600" />}
      scoreDirection="lower"
      showLowestScore={true}
    />
  );
}