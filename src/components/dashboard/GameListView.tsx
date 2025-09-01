'use client';

import Link from 'next/link';
import { Clock, Users, Star } from 'lucide-react';
import { Game } from '@/types/dashboard';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';

interface GameListViewProps {
  games: Game[];
  isAuthenticated: boolean;
  showingUserGames?: boolean;
}

const difficultyStars = {
  'facile': 1,
  'intermédiaire': 2,
  'expert': 3
} as const;

export default function GameListView({ games, isAuthenticated, showingUserGames = false }: GameListViewProps) {
  const { setLastPlayedGame } = useLastPlayedGame();

  const handleGameClick = (gameSlug: string) => {
    setLastPlayedGame(gameSlug);
  };

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🎮</div>
          {isAuthenticated ? (
            <>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Vos jeux apparaîtront ici
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Commencez une partie via le menu latéral pour voir vos jeux récents s&apos;afficher ici automatiquement.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun jeu disponible
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ajustez vos filtres pour voir les jeux disponibles.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {games.map((game, index) => {
        const isLastPlayed = isAuthenticated && showingUserGames && index === 0 && games.length > 0;
        const stars = difficultyStars[game.difficulty as keyof typeof difficultyStars] || 2;
        
        return (
          <Link
            key={game.id}
            href={`/games/${game.slug}/new`}
            onClick={() => handleGameClick(game.slug)}
            className={`group block p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              isLastPlayed 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              {/* Left section: Icon + Name */}
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl">{game.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className={`font-semibold ${
                      isLastPlayed 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {game.name}
                    </h3>
                    {isLastPlayed && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                        Récent
                      </span>
                    )}
                    {game.multiplayer && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full">
                        Multi
                      </span>
                    )}
                  </div>
                  
                  {/* Metadata line */}
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {game.min_players === game.max_players 
                          ? `${game.min_players} joueur${game.min_players > 1 ? 's' : ''}` 
                          : `${game.min_players}-${game.max_players} joueurs`
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{game.duration}</span>
                    </div>
                    
                    <div className="text-gray-500 dark:text-gray-500">
                      {game.category_name}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: stars }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right section: Times played (for authenticated users) */}
              {isAuthenticated && game.times_opened && (
                <div className="text-right text-xs text-gray-500 dark:text-gray-500">
                  <div>{game.times_opened} partie{game.times_opened > 1 ? 's' : ''}</div>
                </div>
              )}
            </div>

            {/* Description on hover */}
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {game.rules}
            </div>
          </Link>
        );
      })}
    </div>
  );
}