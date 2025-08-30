'use client';

import React from 'react';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';

interface TestMinimalScoreSheetProps {
  sessionId: string;
}

export default function TestMinimalScoreSheet({ sessionId }: TestMinimalScoreSheetProps) {
  console.log('[TestMinimal] Rendering with sessionId:', sessionId);
  
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds> sessionId={sessionId} gameSlug="test-minimal">
      {({ session, gameState }) => {
        console.log('[TestMinimal] BaseScoreSheet callback:', { 
          hasSession: !!session, 
          sessionStatus: session?.status,
          playersCount: session?.players?.length,
          gameStateKeys: Object.keys(gameState || {})
        });
        
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Test Minimal</h1>
            <div className="bg-gray-100 p-4 rounded">
              <pre>{JSON.stringify(session, null, 2)}</pre>
            </div>
          </div>
        );
      }}
    </BaseScoreSheetMultiplayer>
  );
}