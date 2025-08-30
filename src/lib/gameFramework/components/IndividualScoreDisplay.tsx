import React from 'react';
import { Crown, Target, Trophy } from 'lucide-react';
import GameCard from '@/components/layout/GameCard';
import { Player } from '@/types/multiplayer';

interface IndividualScoreDisplayProps {
  session: any;
  getTotalScore: (playerId: number) => number;
  targetScore?: number;
  showRankings?: boolean;
  theme: {
    primary: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'yellow';
  };
}

const THEME_COLORS = {
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
  yellow: 'text-yellow-600 dark:text-yellow-400'
};

export default function IndividualScoreDisplay({
  session,
  getTotalScore,
  targetScore,
  showRankings = true,
  theme
}: IndividualScoreDisplayProps) {
  // Tri des joueurs par score pour le classement
  const sortedPlayers = React.useMemo(() => {
    if (!session?.players) return [];
    
    return [...session.players]
      .map(player => ({
        ...player,
        totalScore: getTotalScore(player.id)
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [session?.players, getTotalScore]);

  const primaryColor = THEME_COLORS[theme.primary];

  return (
    <>
      {/* Score Target Display */}
      {targetScore && (
        <GameCard title="Objectif">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold">
                Premier à {targetScore} points
              </span>
            </div>
          </div>
        </GameCard>
      )}

      {/* Individual Scores Display */}
      <GameCard title="Scores des joueurs">
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-3 rounded-lg ${
                index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 
                'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {showRankings && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {index === 0 ? <Trophy className="h-4 w-4" /> : index + 1}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {session.host_user_id === player.user_id && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="font-medium">{player.player_name}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-xl font-bold ${primaryColor}`}>
                  {player.totalScore}
                </div>
                {targetScore && (
                  <div className="text-xs text-gray-500">
                    {Math.round((player.totalScore / targetScore) * 100)}% de l'objectif
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </GameCard>
    </>
  );
}