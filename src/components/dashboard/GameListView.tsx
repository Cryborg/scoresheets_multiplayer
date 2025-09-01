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
      {/* Optional column headers for desktop only */}
      {games.length > 3 && (
        <div className="hidden lg:grid grid-cols-12 gap-4 items-center px-4 py-2 mb-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
          <div className="col-span-1 text-center"></div>
          <div className="col-span-4">Jeu</div>
          <div className="col-span-2 text-left">Joueurs</div>
          <div className="col-span-2 text-left">Durée</div>
          <div className="col-span-1 text-center">Diff.</div>
          <div className="col-span-1 text-center">Catégorie</div>
          <div className="col-span-1 text-right">Parties</div>
        </div>
      )}
      
      {games.map((game, index) => {
        const isLastPlayed = isAuthenticated && showingUserGames && index === 0 && games.length > 0;
        const stars = difficultyStars[game.difficulty as keyof typeof difficultyStars] || 2;
        
        return (
          <Link
            key={game.id}
            href={`/games/${game.slug}/new`}
            onClick={() => handleGameClick(game.slug)}
            className={`group block py-2 px-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              isLastPlayed 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {/* Desktop: Grid layout for aligned columns */}
            <div className="hidden lg:grid grid-cols-12 gap-4 items-center w-full h-8">
              {/* Column 1: Icon */}
              <div className="col-span-1 text-base flex-shrink-0 flex items-center justify-center">
                {game.icon}
              </div>

              {/* Column 2-4: Game name + badges */}
              <div className="col-span-4 min-w-0 pr-2 flex items-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-medium text-sm truncate ${
                    isLastPlayed 
                      ? 'text-blue-900 dark:text-blue-100' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {game.name}
                  </h3>
                  {isLastPlayed && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full whitespace-nowrap">
                      Récent
                    </span>
                  )}
                  {game.multiplayer && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full whitespace-nowrap">
                      Multi
                    </span>
                  )}
                </div>
              </div>

              {/* Column 5-6: Players */}
              <div className="col-span-2 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-start">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {game.min_players === game.max_players 
                      ? `${game.min_players}j` 
                      : `${game.min_players}-${game.max_players}j`
                    }
                  </span>
                </div>
              </div>

              {/* Column 7-8: Duration */}
              <div className="col-span-2 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-start">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">{game.duration}</span>
                </div>
              </div>

              {/* Column 9: Difficulty stars */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              {/* Column 10: Category */}
              <div className="col-span-1 flex text-xs text-gray-500 dark:text-gray-500 items-center justify-center">
                <span className="truncate">{game.category_name}</span>
              </div>

              {/* Column 11: Times played */}
              <div className="col-span-1 text-right flex items-center justify-end">
                {isAuthenticated && game.times_opened ? (
                  <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                    {game.times_opened}×
                  </div>
                ) : (
                  <div className="text-xs text-transparent">0</div>
                )}
              </div>
            </div>

            {/* Mobile: Stack layout with two rows */}
            <div className="lg:hidden w-full">
              {/* Row 1: Icon + Name/badges + Times played */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Icon */}
                  <div className="text-base flex-shrink-0">
                    {game.icon}
                  </div>
                  
                  {/* Name + badges */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className={`font-medium text-sm truncate ${
                      isLastPlayed 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {game.name}
                    </h3>
                    {isLastPlayed && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full whitespace-nowrap">
                        Récent
                      </span>
                    )}
                    {game.multiplayer && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full whitespace-nowrap">
                        Multi
                      </span>
                    )}
                  </div>
                </div>

                {/* Times played */}
                <div className="flex-shrink-0 ml-2">
                  {isAuthenticated && game.times_opened ? (
                    <div className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">
                      {game.times_opened}×
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Row 2: Players + Duration (indented to align with name) */}
              <div className="flex items-center gap-4 ml-7 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {game.min_players === game.max_players 
                      ? `${game.min_players} joueur${game.min_players > 1 ? 's' : ''}` 
                      : `${game.min_players}-${game.max_players} joueurs`
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">{game.duration}</span>
                </div>
              </div>
            </div>

          </Link>
        );
      })}
    </div>
  );
}