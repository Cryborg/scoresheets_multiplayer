'use client';

import { Plus, RotateCcw, Trophy, Users } from 'lucide-react';
import GameCard from '@/components/layout/GameCard';
import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';

export default function PierrePapierCiseauxScoreSheet({ sessionId }: { sessionId: string }) {
  return (
    <BaseScoreSheetMultiplayer<GameSessionWithRounds> 
      sessionId={sessionId} 
      gameSlug="pierre-papier-ciseaux"
    >
      {({ session, gameState }) => (
        <GameInterface session={session} gameState={gameState} />
      )}
    </BaseScoreSheetMultiplayer>
  );
}

function GameInterface({ 
  session, 
  gameState 
}: { 
  session: GameSessionWithRounds; 
  gameState: any;
}) {
  const { addRound, isHost } = gameState;

  // Calculer les scores totaux depuis les rounds
  const getTotalScore = (playerId: number): number => {
    if (!session.rounds) return 0;
    
    const total = session.rounds.reduce((sum, round) => {
      return sum + (round.scores[playerId] || 0);
    }, 0);
    
    return total;
  };

  // Ajouter un point à un joueur
  const addPoint = async (playerId: number) => {
    if (!isHost) return;

    // Créer un nouveau round avec les scores
    const scores = session.players.map(player => ({
      playerId: player.id,
      score: player.id === playerId ? 1 : 0
    }));

    try {
      await addRound(scores);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du point:', error);
    }
  };

  // Réinitialiser la partie
  const resetGame = async () => {
    if (!isHost || !confirm('Voulez-vous vraiment réinitialiser les scores ?')) return;
    
    // Pour réinitialiser, on devrait avoir une fonction dans gameState
    // Pour l'instant on peut juste recharger la page
    window.location.reload();
  };

  // Déterminer le leader
  const getLeader = () => {
    if (!session.players || session.players.length === 0) return null;
    
    let maxScore = -1;
    let leader = null;
    let isTie = false;

    session.players.forEach(player => {
      const score = getTotalScore(player.id);
      if (score > maxScore) {
        maxScore = score;
        leader = player;
        isTie = false;
      } else if (score === maxScore && maxScore > 0) {
        isTie = true;
      }
    });

    return isTie ? null : leader;
  };

  const leader = getLeader();

  return (
    <div className="space-y-6">
      {/* Carte de scores avec boutons */}
      <GameCard 
        title="Scores" 
        icon={<Users className="h-5 w-5" />}
        action={
          isHost && (
            <button
              onClick={resetGame}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
              title="Réinitialiser les scores"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )
        }
      >
        <div className="space-y-4">

          {/* Boutons pour chaque joueur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {session.players.map((player, index) => {
              const score = getTotalScore(player.id);
              const isLeading = leader?.id === player.id && score > 0;
              
              return (
                <div 
                  key={player.id} 
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    isLeading 
                      ? 'border-yellow-500 dark:border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10' 
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  {/* Badge Joueur X */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                    index === 0 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                  }`}>
                    Joueur {index + 1}
                  </div>

                  <div className="p-6 pt-10">
                    {/* Nom du joueur */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {player.player_name}
                    </h3>

                    {/* Score actuel */}
                    <div className="text-center mb-4">
                      <div className="text-4xl font-bold text-gray-900 dark:text-white">
                        {score}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        point{score !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Bouton pour ajouter un point */}
                    {isHost && (
                      <button
                        onClick={() => addPoint(player.id)}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${
                          index === 0
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                        }`}
                      >
                        <Plus className="h-5 w-5" />
                        Point pour {player.player_name}
                      </button>
                    )}

                    {!isHost && (
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Seul l&apos;hôte peut modifier les scores
                      </div>
                    )}
                  </div>

                  {/* Indicateur visuel de leader */}
                  {isLeading && (
                    <div className="absolute -top-1 -right-8 rotate-45 bg-yellow-500 text-white text-xs font-bold py-1 px-8">
                      Leader
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Message si pas assez de joueurs */}
          {session.players.length < 2 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              En attente d&apos;un second joueur...
            </div>
          )}
        </div>
      </GameCard>

    </div>
  );
}