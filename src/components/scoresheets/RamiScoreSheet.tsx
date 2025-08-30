'use client';

import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trophy, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function RamiScoreSheet({ sessionId }: { sessionId: string }) {
  const [roundScores, setRoundScores] = useState<Record<number, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleScoreChange = (playerId: number, score: number) => {
    setRoundScores(prev => ({
      ...prev,
      [playerId]: score
    }));
  };

  const handleSubmitRound = async (session: GameSessionWithRounds) => {
    // Include all players, treating empty/missing scores as 0
    const scores = session.players.map(player => ({
      playerId: player.id,
      score: roundScores[player.id] || 0
    }));

    // Vérifier qu'au moins un score n'est pas vide/zéro
    const hasAtLeastOneScore = scores.some(score => score.score !== 0);
    if (!hasAtLeastOneScore) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer au moins un score non nul",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/games/rami/sessions/${sessionId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'ajout de la manche');

      setRoundScores({});
      toast({
        title: "Manche ajoutée",
        description: "Les scores ont été enregistrés"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter la manche",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalScore = (playerScores: GameSessionWithRounds['scores'][0]['scores']) => {
    return playerScores.reduce((total, score) => total + score.score, 0);
  };

  const calculateTotalFromRounds = (playerId: number, rounds: any[]) => {
    if (!rounds) return 0;
    return rounds.reduce((total, round) => {
      const roundScore = round.scores ? round.scores[playerId] : 0;
      return total + (roundScore || 0);
    }, 0);
  };

  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds>
      sessionId={sessionId} 
      gameSlug="rami"
    >
      {({ session, gameState }) => (
        <div className="space-y-6">
          <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-green-800 dark:text-green-200">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <Trophy className="h-5 w-5" />
                </div>
                Scores actuels
              </CardTitle>
              <p className="text-sm text-green-600 dark:text-green-300 mt-2">
                Classement en temps réel des joueurs
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {session.players
                  .map(player => {
                    const totalScore = calculateTotalFromRounds(player.id, session.rounds);
                    return { ...player, totalScore };
                  })
                  .sort((a, b) => a.totalScore - b.totalScore) // Tri par score croissant (meilleur = moins de points)
                  .map((player, index) => (
                    <div key={player.id} className="group">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200">
                        {/* Position & Avatar */}
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                            index === 2 ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white' :
                            'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            index === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                            index === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                            index === 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            index === 3 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                            index === 4 ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
                            'bg-gradient-to-br from-gray-500 to-slate-500'
                          }`}>
                            {player.player_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        
                        {/* Nom du joueur */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {player.player_name}
                            {index === 0 && (
                              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-1 rounded-full">
                                🏆 En tête
                              </span>
                            )}
                          </h3>
                        </div>
                        
                        {/* Score */}
                        <div className="flex items-center gap-2">
                          {player.totalScore > 0 && <TrendingDown className="h-4 w-4 text-orange-500" />}
                          <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {player.totalScore}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">pts</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {session.status === 'active' && gameState.isHost && (
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-blue-800 dark:text-blue-200">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Plus className="h-5 w-5" />
                  </div>
                  Nouvelle manche
                </CardTitle>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                  Saisissez les points de chaque joueur pour cette manche
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {session.players.map((player, index) => (
                    <div key={player.id} className="group">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                            index === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                            index === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                            index === 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                            index === 3 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                            index === 4 ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
                            'bg-gradient-to-br from-gray-500 to-slate-500'
                          }`}>
                            {player.player_name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        
                        {/* Nom du joueur */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {player.player_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Points de cette manche
                          </p>
                        </div>
                        
                        {/* Input score */}
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="0"
                              value={roundScores[player.id] || ''}
                              onChange={(e) => handleScoreChange(player.id, parseInt(e.target.value) || 0)}
                              className="w-20 h-12 text-center text-lg font-semibold border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-lg transition-colors"
                            />
                            <div className="absolute -bottom-1 -right-1 text-xs text-gray-400 dark:text-gray-500">
                              pts
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Bouton de validation */}
                <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                  <Button 
                    onClick={() => handleSubmitRound(session)} 
                    disabled={isSubmitting}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Enregistrement...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Valider la manche
                      </div>
                    )}
                  </Button>
                  
                  {Object.keys(roundScores).length !== session.players.length && (
                    <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-2">
                      Veuillez saisir les scores pour tous les joueurs
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {session.rounds && session.rounds.length > 0 && (
            <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-purple-800 dark:text-purple-200">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Trophy className="h-5 w-5" />
                  </div>
                  Historique des manches
                </CardTitle>
                <p className="text-sm text-purple-600 dark:text-purple-300 mt-2">
                  Détail des {session.rounds.length} manche{session.rounds.length > 1 ? 's' : ''} jouée{session.rounds.length > 1 ? 's' : ''}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    {/* Header du tableau */}
                    <thead>
                      <tr className="border-b-2 border-purple-200 dark:border-purple-700">
                        <th className="text-left p-3 font-semibold text-purple-800 dark:text-purple-200">
                          Joueurs
                        </th>
                        {session.rounds.map((_, roundIndex) => (
                          <th key={roundIndex} className="text-center p-3 font-semibold text-purple-800 dark:text-purple-200">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold">
                                {roundIndex + 1}
                              </div>
                              <span className="text-xs">Manche {roundIndex + 1}</span>
                            </div>
                          </th>
                        ))}
                        <th className="text-center p-3 font-semibold text-purple-800 dark:text-purple-200">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                              Σ
                            </div>
                            <span className="text-xs">Total</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Corps du tableau */}
                    <tbody>
                      {(() => {
                        // Calculer les totaux et trouver le meilleur score
                        const playersWithTotals = session.players.map(player => ({
                          ...player,
                          totalScore: calculateTotalFromRounds(player.id, session.rounds)
                        }));
                        const bestScore = Math.min(...playersWithTotals.map(p => p.totalScore));
                        
                        return playersWithTotals.map((player, playerIndex) => {
                          const isLeader = player.totalScore === bestScore;
                        
                        return (
                          <tr key={player.id} className="border-b border-purple-100 dark:border-purple-800 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors">
                            {/* Colonne joueur */}
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                                  playerIndex === 0 ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                                  playerIndex === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                                  playerIndex === 2 ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                                  playerIndex === 3 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                                  playerIndex === 4 ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
                                  'bg-gradient-to-br from-gray-500 to-slate-500'
                                }`}>
                                  {player.player_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {player.player_name}
                                </span>
                              </div>
                            </td>
                            
                            {/* Colonnes scores par manche */}
                            {session.rounds.map((round, roundIndex) => {
                              const roundScore = round.scores ? round.scores[player.id] : undefined;
                              const isLowestInRound = round.scores && roundScore !== undefined && 
                                roundScore === Math.min(...Object.values(round.scores));
                              
                              return (
                                <td key={roundIndex} className="p-3 text-center">
                                  {roundScore !== undefined ? (
                                    <div className={`inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm ${
                                      isLowestInRound 
                                        ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 text-green-800 dark:text-green-200 border-2 border-green-300 dark:border-green-700' 
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                    }`}>
                                      {roundScore}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-600">-</span>
                                  )}
                                </td>
                              );
                            })}
                            
                            {/* Colonne total */}
                            <td className="p-3 text-center">
                              <div className={`inline-flex items-center justify-center w-20 h-10 rounded-lg ${
                                isLeader 
                                  ? 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 border-2 border-green-300 dark:border-green-700'
                                  : 'bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 border-2 border-yellow-300 dark:border-yellow-700'
                              }`}>
                                <span className={`font-bold text-lg ${
                                  isLeader 
                                    ? 'text-green-800 dark:text-green-200'
                                    : 'text-yellow-800 dark:text-yellow-200'
                                }`}>
                                  {player.totalScore}
                                </span>
                                {isLeader && <span className="ml-1">🏆</span>}
                              </div>
                            </td>
                          </tr>
                        );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </BaseScoreSheetMultiplayer>
  );
}