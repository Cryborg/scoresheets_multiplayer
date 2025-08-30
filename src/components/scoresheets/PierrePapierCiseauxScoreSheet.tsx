'use client';

import React from 'react';
import { GameFramework } from '@/lib/gameFramework';
import { pierrePapierCiseauxDefinition } from '@/games/pierre-papier-ciseaux/definition';

interface PierrePapierCiseauxScoreSheetProps {
  sessionId: string;
}

/**
 * Composant Pierre-Papier-Ciseaux utilisant le Game Framework
 * Démontre la simplicité de création d'un nouveau jeu avec le framework
 */
export default function PierrePapierCiseauxScoreSheet({ sessionId }: PierrePapierCiseauxScoreSheetProps) {
  return (
    <GameFramework 
      sessionId={sessionId} 
      definition={pierrePapierCiseauxDefinition} 
    />
  );
}