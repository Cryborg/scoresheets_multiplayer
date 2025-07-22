'use client';

import React, { useCallback, useMemo } from 'react';
import { Share2, X } from 'lucide-react';
import ScoreInput from '@/components/ui/ScoreInput';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import RankingSidebar from '@/components/layout/RankingSidebar';
import { useOptimisticScores } from '@/hooks/useOptimisticScores';
import { useScoreActions } from '@/hooks/useScoreActions';
import { GameSessionWithCategories, Player } from '@/types/multiplayer';

interface YamsCategory {
  id: string;
  name: string;
  description: string;
  fixedScore?: number;
  validValues?: number[];
}

const YAMS_CATEGORIES: YamsCategory[] = [
  { id: 'ones', name: '1', description: 'Somme des 1', validValues: [0, 1, 2, 3, 4, 5] },
  { id: 'twos', name: '2', description: 'Somme des 2', validValues: [0, 2, 4, 6, 8, 10] },
  { id: 'threes', name: '3', description: 'Somme des 3', validValues: [0, 3, 6, 9, 12, 15] },
  { id: 'fours', name: '4', description: 'Somme des 4', validValues: [0, 4, 8, 12, 16, 20] },
  { id: 'fives', name: '5', description: 'Somme des 5', validValues: [0, 5, 10, 15, 20, 25] },
  { id: 'sixes', name: '6', description: 'Somme des 6', validValues: [0, 6, 12, 18, 24, 30] },
  { id: 'three_of_kind', name: 'Brelan', description: 'Somme des dés (3 identiques)' },
  { id: 'four_of_kind', name: 'Carré', description: 'Somme des dés (4 identiques)' },
  { id: 'full_house', name: 'Full', description: '25 points (3+2 identiques)', fixedScore: 25 },
  { id: 'small_straight', name: 'Petite suite', description: '30 points (4 consécutifs)', fixedScore: 30 },
  { id: 'large_straight', name: 'Grande suite', description: '40 points (5 consécutifs)', fixedScore: 40 },
  { id: 'yams', name: 'Yams', description: '50 points (5 identiques)', fixedScore: 50 },
  { id: 'chance', name: 'Chance', description: 'Somme de tous les dés' },
];


interface YamsScoreSheetMultiplayerProps {
  sessionId: string;
}

export default function YamsScoreSheetMultiplayer({ sessionId }: YamsScoreSheetMultiplayerProps) {
  const optimisticScores = useOptimisticScores();
  const scoreActions = useScoreActions({ 
    sessionId,
    onScoreUpdate: optimisticScores.clearOptimisticScore
  });

  // Handle score submission with error handling
  const handleScoreSubmit = useCallback(async (categoryId: string, playerId: number, score: string) => {
    try {
      await scoreActions.submitScore(categoryId, playerId, score);
    } catch (error) {
      console.error('Score submission failed:', error);
      // Revert optimistic update handled by scoreActions
    }
  }, [scoreActions]);

  // Memoized calculations to prevent re-renders
  const calculateUpperSectionTotal = useCallback((session: GameSessionWithCategories, playerId: number): number => {
    let total = 0;
    ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'].forEach(categoryId => {
      const score = session.scores[categoryId]?.[playerId];
      if (score !== undefined) {
        total += score;
      }
    });
    return total;
  }, []);

  const calculatePlayerTotal = useCallback((session: GameSessionWithCategories, playerId: number): number => {
    let total = 0;
    
    // Calculate base total
    YAMS_CATEGORIES.forEach(category => {
      const score = session.scores[category.id]?.[playerId];
      if (score !== undefined) {
        total += score;
      }
    });
    
    // Add bonus if upper section >= 63
    const upperTotal = calculateUpperSectionTotal(session, playerId);
    if (upperTotal >= 63) {
      total += 35; // Bonus
    }
    
    return total;
  }, [calculateUpperSectionTotal]);

  const createRankingComponent = useCallback((session: GameSessionWithCategories) => {
    const playersWithTotals = session.players.map(player => ({
      ...player,
      total_score: calculatePlayerTotal(session, player.id)
    })).sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    return <RankingSidebar session={{ ...session, players: playersWithTotals }} />;
  }, [calculatePlayerTotal]);


  return (
    <BaseScoreSheetMultiplayer<GameSessionWithCategories>
      sessionId={sessionId}
      gameSlug="yams"
      rankingComponent={({ session }) => createRankingComponent(session)}
    >
      {({ session, gameState }) => (
        <>
          {/* Session info header */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {session.session_name}
                </h2>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Code de partie: <span className="font-mono font-bold">{session.session_code}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  Manche {session.current_round || 1}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  {session.players.length} joueur{session.players.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Score grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Catégorie
                </th>
                {session.players.map(player => {
                  const canEdit = gameState.canEditPlayerScores?.(player) ?? false;
                  return (
                    <th key={player.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-2">
                          <span>{player.player_name}</span>
                          {player.is_connected ? (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title="Connecté" />
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-full" title="Déconnecté" />
                          )}
                        </div>
                        {canEdit && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">(vous)</span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Upper section (1-6) */}
              {YAMS_CATEGORIES.slice(0, 6).map(category => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.description}
                      </div>
                    </div>
                  </td>
                  {session.players.map(player => {
                    const saveKey = `${category.id}-${player.id}`;
                    const isSaving = scoreActions.isSaving(saveKey);
                    const existingScore = session.scores[category.id]?.[player.id];
                    const canEdit = gameState.canEditPlayerScores?.(player) ?? false;
                    
                    return (
                      <td key={`${category.id}-${player.id}`} className="px-4 py-4 text-center">
                        {existingScore !== undefined ? (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {existingScore}
                          </span>
                        ) : canEdit ? (
                          <div className="relative">
                            <ScoreInput
                              value={currentScores[category.id]?.[player.id] || sessionScores[category.id]?.[player.id] || ''}
                              onChange={(value) => handleScoreChange(category.id, player.id, value)}
                              onSave={(value) => handleScoreSubmit(category.id, player.id, value || '')}
                              onFocus={() => handleScoreFocus(category.id, player.id)}
                              onBlur={() => handleScoreBlur(category.id, player.id)}
                              validValues={category.validValues}
                              disabled={!player.is_connected}
                              className="w-16"
                            />
                            {isSaving && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              
              {/* Subtotal row */}
              <tr className="bg-gray-100 dark:bg-gray-700 font-medium">
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    Sous-total
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(1-6)</span>
                  </div>
                </td>
                {session.players.map(player => (
                  <td key={`subtotal-${player.id}`} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                    {calculateUpperSectionTotal(player.id)}
                  </td>
                ))}
              </tr>
              
              {/* Bonus row */}
              <tr className="bg-gray-100 dark:bg-gray-700 font-medium">
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    Bonus
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(≥63: +35)</span>
                  </div>
                </td>
                {session.players.map(player => (
                  <td key={`bonus-${player.id}`} className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                    {calculateUpperSectionTotal(player.id) >= 63 ? 35 : 0}
                  </td>
                ))}
              </tr>
              
              {/* Lower section */}
              {YAMS_CATEGORIES.slice(6).map(category => (
                <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {category.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category.description}
                      </div>
                    </div>
                  </td>
                  {session.players.map(player => {
                    const saveKey = `${category.id}-${player.id}`;
                    const isSaving = scoreActions.isSaving(saveKey);
                    const existingScore = session.scores[category.id]?.[player.id];
                    const canEdit = gameState.canEditPlayerScores?.(player) ?? false;
                    
                    return (
                      <td key={`${category.id}-${player.id}`} className="px-4 py-4 text-center">
                        {existingScore !== undefined ? (
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {existingScore}
                          </span>
                        ) : canEdit ? (
                          <div className="relative">
                            {category.fixedScore ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="checkbox"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleScoreSubmit(category.id, player.id, category.fixedScore.toString());
                                    }
                                  }}
                                  disabled={!player.is_connected || isSaving}
                                  className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                />
                                <button
                                  onClick={() => handleScoreSubmit(category.id, player.id, '0')}
                                  disabled={!player.is_connected || isSaving}
                                  className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                                  title="Rayer (0 points)"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <ScoreInput
                                  value={currentScores[category.id]?.[player.id] || sessionScores[category.id]?.[player.id] || ''}
                                  onChange={(value) => handleScoreChange(category.id, player.id, value)}
                                  onSave={(value) => handleScoreSubmit(category.id, player.id, value || '')}
                                  onFocus={() => handleScoreFocus(category.id, player.id)}
                                  onBlur={() => handleScoreBlur(category.id, player.id)}
                                  validValues={category.validValues}
                                  disabled={!player.is_connected}
                                  className="w-16"
                                />
                                {isSaving && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Total row */}
              <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                <td className="px-4 py-4 text-gray-900 dark:text-gray-100">
                  Total
                </td>
                {session.players.map(player => (
                  <td key={`total-${player.id}`} className="px-4 py-4 text-center text-gray-900 dark:text-gray-100">
                    {calculatePlayerTotal(session, player.id)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </BaseScoreSheetMultiplayer>
  );
}