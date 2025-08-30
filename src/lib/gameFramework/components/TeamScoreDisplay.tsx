import React from 'react';
import { Crown, Shield, Target } from 'lucide-react';
import GameCard from '@/components/layout/GameCard';
import { Player } from '@/types/multiplayer';
import { TeamDefinition } from '../types';

interface TeamScoreDisplayProps {
  teams: TeamDefinition[];
  session: any;
  getTotalScore: (playerId: number) => number;
  getTeamScore: (teamId: string) => number;
  targetScore?: number;
  showVulnerability?: boolean;
  vulnerabilityStatus?: { [teamId: string]: boolean };
}

const TEAM_COLOR_CLASSES = {
  blue: {
    card: 'border-blue-200 dark:border-blue-800',
    score: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20'
  },
  red: {
    card: 'border-red-200 dark:border-red-800',
    score: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20'
  },
  green: {
    card: 'border-green-200 dark:border-green-800',
    score: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20'
  },
  purple: {
    card: 'border-purple-200 dark:border-purple-800',
    score: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20'
  },
  orange: {
    card: 'border-orange-200 dark:border-orange-800',
    score: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20'
  },
  yellow: {
    card: 'border-yellow-200 dark:border-yellow-800',
    score: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20'
  }
};

export default function TeamScoreDisplay({
  teams,
  session,
  getTotalScore,
  getTeamScore,
  targetScore,
  showVulnerability = false,
  vulnerabilityStatus = {}
}: TeamScoreDisplayProps) {
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

      {/* Teams Score Display */}
      <div className={`grid grid-cols-1 md:grid-cols-${Math.min(teams.length, 3)} gap-4`}>
        {teams.map((team) => {
          const teamPlayers = team.players(session);
          const teamScore = getTeamScore(team.id);
          const colorClasses = TEAM_COLOR_CLASSES[team.color];
          const isVulnerable = vulnerabilityStatus[team.id];

          return (
            <GameCard 
              key={team.id}
              title={team.name} 
              className={colorClasses.card}
            >
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${colorClasses.score}`}>
                    {teamScore}
                  </div>
                  <div className="text-sm text-gray-500">Total équipe</div>
                  {showVulnerability && isVulnerable && (
                    <div className="text-xs text-red-600 font-semibold flex items-center justify-center gap-1 mt-1">
                      <Shield className="h-3 w-3" />
                      Vulnérable
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {teamPlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {session.host_user_id === player.user_id && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="font-medium">{player.player_name}</span>
                        {player.position !== undefined && (
                          <span className="text-xs text-gray-500">
                            (Position {player.position + 1})
                          </span>
                        )}
                      </div>
                      <span className={`${colorClasses.score} font-semibold`}>
                        {getTotalScore(player.id)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GameCard>
          );
        })}
      </div>
    </>
  );
}