'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Zap, Users, Clock, Gamepad2, Share2, RotateCcw, Save, Plus, Grid, List, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import AuthStatus from '@/components/AuthStatus';
import Sidebar from '@/components/Sidebar';
import { loadMultipleGameMetadata, defaultGameMetadata } from '@/lib/gameMetadata';
import { Game, GamesAPIResponse } from '@/types/dashboard';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';
import GameCard from '@/components/dashboard/GameCard';
import GameListView from '@/components/dashboard/GameListView';
import { BRANDING } from '@/lib/branding';
import { authenticatedFetch } from '@/lib/authClient';
import { shouldShowGuestBanner, dismissGuestBanner } from '@/lib/guestBannerDismiss';

export default function DashboardPage() {
  return (
    <AuthStatus>
      {(isAuthenticated) => (
        <DashboardContent isAuthenticated={isAuthenticated} />
      )}
    </AuthStatus>
  );
}

function DashboardContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]); // Pour le Sidebar
  const [loading, setLoading] = useState(true);
  const [showGuestBanner, setShowGuestBanner] = useState(false);

  // Filter states and view mode with localStorage persistence
  const {
    categoryFilter,
    multiplayerFilter,
    playerCountFilter,
    viewMode,
    setCategoryFilter,
    setMultiplayerFilter,
    setPlayerCountFilter,
    setViewMode,
    resetFilters,
    initialized: filtersInitialized
  } = useDashboardFilters();

  // Keep the hook for tracking in other parts of the app but don't use sort logic here
  const { setLastPlayedGame } = useLastPlayedGame();

  // Check if guest banner should be shown
  useEffect(() => {
    if (!isAuthenticated) {
      setShowGuestBanner(shouldShowGuestBanner());
    }
  }, [isAuthenticated]);

  // Chargement des jeux depuis l'API avec métadonnées
  useEffect(() => {
    const fetchUserGames = async () => {
      if (!isAuthenticated) {
        return; // Skip user games for guests
      }
      
      try {
        const response = await authenticatedFetch('/api/games');
        const data: GamesAPIResponse = await response.json();
        
        // Filter out "jeu-libre" from the games list
        const filteredGames = data.games.filter(game => game.slug !== 'jeu-libre');
        
        const slugs = filteredGames.map(game => game.slug);
        const metadataMap = await loadMultipleGameMetadata(slugs);
        
        const formattedGames: Game[] = filteredGames.map(game => {
          const metadata = metadataMap[game.slug] || defaultGameMetadata;
          return {
            id: game.id,
            name: game.name,
            slug: game.slug,
            category_name: game.category_name,
            rules: metadata.shortDescription,
            min_players: game.min_players,
            max_players: game.max_players,
            duration: metadata.duration,
            icon: metadata.icon,
            is_implemented: game.is_implemented,
            difficulty: metadata.difficulty,
            variant: metadata.variant,
            multiplayer: metadata.multiplayer,
            last_opened_at: game.last_opened_at,
            times_opened: game.times_opened
          };
        });
        
        setAllGames(formattedGames);
      } catch (error) {
        console.error('Erreur lors du chargement des jeux utilisateur:', error);
      }
    };

    const fetchAvailableGames = async () => {
      try {
        const response = await fetch('/api/games/available', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        const data: GamesAPIResponse = await response.json();
        
        // Filter out "jeu-libre" from the available games list
        const filteredGames = data.games.filter(game => game.slug !== 'jeu-libre');
        
        const slugs = filteredGames.map(game => game.slug);
        const metadataMap = await loadMultipleGameMetadata(slugs);
        
        const formattedGames: Game[] = filteredGames.map(game => {
          const metadata = metadataMap[game.slug] || defaultGameMetadata;
          return {
            id: game.id,
            name: game.name,
            slug: game.slug,
            category_name: game.category_name,
            rules: metadata.shortDescription,
            min_players: game.min_players,
            max_players: game.max_players,
            duration: metadata.duration,
            icon: metadata.icon,
            is_implemented: game.is_implemented,
            difficulty: metadata.difficulty,
            variant: metadata.variant,
            multiplayer: metadata.multiplayer
          };
        });
        
        setAvailableGames(formattedGames);
      } catch (error) {
        console.error('Erreur lors du chargement des jeux disponibles:', error);
      }
    };


    const fetchData = async () => {
      if (isAuthenticated) {
        await Promise.all([fetchUserGames(), fetchAvailableGames()]);
      } else {
        // Pour les invités, on charge seulement les jeux disponibles
        await fetchAvailableGames();
        setAllGames([]); // Pas de jeux utilisateur pour les invités
      }
      setLoading(false);
    };

    fetchData();
  }, [isAuthenticated]);

  const { playedGames, otherGames } = useMemo(() => {
    // Appliquer les filtres à tous les jeux disponibles
    let games = [...availableGames];

    if (categoryFilter !== 'all') {
      games = games.filter(game => game.category_name === categoryFilter);
    }

    if (multiplayerFilter === 'multi') {
      games = games.filter(game => game.multiplayer);
    } else if (multiplayerFilter === 'solo') {
      games = games.filter(game => !game.multiplayer);
    }

    if (playerCountFilter !== 'all') {
      const count = parseInt(playerCountFilter, 10);
      if (!isNaN(count)) {
        games = games.filter(game => game.min_players <= count && game.max_players >= count);
      }
    }

    // Séparer les jeux joués des autres
    if (isAuthenticated && allGames.length > 0) {
      const playedGamesMap = new Map(allGames.map(game => [game.slug, game]));
      
      const played = games
        .filter(game => playedGamesMap.has(game.slug))
        .sort((a, b) => {
          const aData = playedGamesMap.get(a.slug)!;
          const bData = playedGamesMap.get(b.slug)!;
          return new Date(bData.last_opened_at || 0).getTime() - new Date(aData.last_opened_at || 0).getTime();
        });
      
      const other = games
        .filter(game => !playedGamesMap.has(game.slug))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      return { playedGames: played, otherGames: other };
    }

    // Pour les invités, tous les jeux dans "otherGames"
    return { 
      playedGames: [], 
      otherGames: games.sort((a, b) => a.name.localeCompare(b.name))
    };
  }, [allGames, availableGames, isAuthenticated, categoryFilter, multiplayerFilter, playerCountFilter]);

  const gameCategories = useMemo(() => {
    return ['all', ...Array.from(new Set(availableGames.map(g => g.category_name)))];
  }, [availableGames]);

  const playerCounts = useMemo(() => {
    const counts = new Set<number>();
    availableGames.forEach(game => {
      for (let i = game.min_players; i <= game.max_players; i++) {
        counts.add(i);
      }
    });
    return ['all', ...Array.from(counts).sort((a, b) => a - b)];
  }, [availableGames]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/'); // Redirection vers la page principale
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGuestReturn = () => {
    router.push('/'); // Pour les invités, retour direct à la page principale
  };

  const handleDismissGuestBanner = () => {
    dismissGuestBanner();
    setShowGuestBanner(false);
  };

  return (
    <div>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 mr-4">
                <Menu className="h-6 w-6 text-gray-900 dark:text-gray-300" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{BRANDING.ui.dashboard.title}</h1>
            </div>
            
            {/* Quick join form + Custom game button in header */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Custom game button for authenticated users */}
              {isAuthenticated && (
                <Link
                  href="/games/jeu-libre/configure"
                  className="px-3 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  Fiche personnalisée
                </Link>
              )}
              
              <input 
                type="text" 
                placeholder="Code partie" 
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value.toUpperCase())} 
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 w-32" 
              />
              <Link 
                href={sessionId.trim() ? `/sessions/find?code=${sessionId.trim()}` : '#'} 
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  sessionId.trim() 
                    ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Share2 className="h-4 w-4" />
                Rejoindre
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Guest notice with features showcase - dismissible with daily reset */}
        {!isAuthenticated && showGuestBanner && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="text-2xl">🎮</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-blue-900 dark:text-blue-100 font-semibold">
                    Découvrez tout le potentiel d&apos;Oh Sheet!
                  </h3>
                  <button
                    onClick={handleDismissGuestBanner}
                    className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors text-blue-600 dark:text-blue-400"
                    title="Masquer jusqu'à demain"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
                  En créant un compte, vous débloquez des fonctionnalités exclusives :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Sauvegarde automatique de vos scores</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Historique de toutes vos parties</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Fiches de scores personnalisées</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Reprendre vos parties interrompues</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Accès aux parties multijoueurs</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-sm">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span>Synchronisation entre appareils</span>
                  </div>
                </div>
                <Link 
                  href="/auth/register" 
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Créer mon compte gratuitement
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Mobile quick join - shown on small screens */}
        <div className="sm:hidden mb-6 space-y-4">
          {/* Custom game button for authenticated users */}
          {isAuthenticated && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <Link
                href="/games/jeu-libre/configure"
                className="w-full px-4 py-3 text-sm rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <Plus className="h-4 w-4" />
                Créer une fiche personnalisée
              </Link>
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Rejoindre une partie</h3>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Code de partie" 
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value.toUpperCase())} 
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
              />
              <Link 
                href={sessionId.trim() ? `/sessions/find?code=${sessionId.trim()}` : '#'} 
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  sessionId.trim() 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <Share2 className="h-4 w-4" />
                Rejoindre
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            {/* Suppression du titre pour utilisateurs connectés, conservé pour invités */}
            {!isAuthenticated && (
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Jeux disponibles</h3>
            )}
            
            {/* View toggle + Filtres - Responsive stack */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
              {/* Vue toggle */}
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-2 rounded-l-md transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="Vue grille"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-r-md transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title="Vue liste"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Ligne 1 mobile : Catégorie + Multi/Solo */}
              <div className="flex items-center gap-2">
                <select 
                  value={categoryFilter} 
                  onChange={e => setCategoryFilter(e.target.value)} 
                  className="flex-1 sm:flex-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm min-w-0"
                >
                  {gameCategories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Catégories' : cat}</option>)}
                </select>
                
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                  <button 
                    onClick={() => setMultiplayerFilter('all')} 
                    className={`px-2 py-1 rounded-l-md text-xs sm:text-sm ${multiplayerFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                  >
                    Tous
                  </button>
                  <button 
                    onClick={() => setMultiplayerFilter('multi')} 
                    className={`px-2 py-1 border-l border-r dark:border-gray-600 text-xs sm:text-sm ${multiplayerFilter === 'multi' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                  >
                    Multi
                  </button>
                  <button 
                    onClick={() => setMultiplayerFilter('solo')} 
                    className={`px-2 py-1 rounded-r-md text-xs sm:text-sm ${multiplayerFilter === 'solo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}
                  >
                    Solo
                  </button>
                </div>
              </div>
              
              {/* Ligne 2 mobile : Nombre de joueurs */}
              <div className="flex items-center gap-2">
                <select 
                  value={playerCountFilter} 
                  onChange={e => setPlayerCountFilter(e.target.value)} 
                  className="flex-1 sm:flex-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm"
                >
                  {playerCounts.map(count => <option key={count} value={count}>{count === 'all' ? 'Joueurs' : `${count} joueurs`}</option>)}
                </select>
                
                {/* Indicateur de sauvegarde + bouton reset */}
                <div className="flex items-center gap-1">
                  {filtersInitialized && (categoryFilter !== 'all' || multiplayerFilter !== 'all' || playerCountFilter !== 'all') && (
                    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Save className="h-3 w-3" />
                      <span className="hidden sm:inline">Sauvé</span>
                    </div>
                  )}
                  
                  {filtersInitialized && (categoryFilter !== 'all' || multiplayerFilter !== 'all' || playerCountFilter !== 'all') && (
                    <button
                      onClick={resetFilters}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Réinitialiser les filtres"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {viewMode === 'grid' ? (
            <div className="space-y-8">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 animate-pulse"><div className="p-6"><div className="flex items-center justify-between mb-4"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div><div className="w-16 h-5 bg-gray-200 dark:bg-gray-600 rounded-full"></div></div><div className="w-32 h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div><div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-full h-10 bg-gray-200 dark:bg-gray-600 rounded"></div></div></div>
                  ))}
                </div>
              ) : (playedGames.length === 0 && otherGames.length === 0) ? (
                // Message quand aucun jeu n'est affiché
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-4">🎮</div>
                    {isAuthenticated ? (
                      <>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          Aucun jeu ne correspond aux filtres
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Ajustez vos filtres pour voir les jeux disponibles.
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
              ) : (
                <>
                  {/* Section Jeux récents */}
                  {isAuthenticated && playedGames.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Vos jeux récents
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {playedGames.map((game, index) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            isLastPlayed={index === 0}
                            index={index}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Tous les jeux */}
                  {otherGames.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {isAuthenticated && playedGames.length > 0 ? 'Tous les jeux disponibles' : 'Jeux disponibles'}
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {otherGames.map((game, index) => (
                          <GameCard
                            key={game.id}
                            game={game}
                            isLastPlayed={false}
                            index={index + playedGames.length}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 animate-pulse p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        <div className="flex-1">
                          <div className="w-32 h-5 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                          <div className="w-48 h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (playedGames.length === 0 && otherGames.length === 0) ? (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Aucun jeu ne correspond aux filtres
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Ajustez vos filtres pour voir les jeux disponibles.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section Jeux récents - Vue liste */}
                  {isAuthenticated && playedGames.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Vos jeux récents
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                      <GameListView games={playedGames} isAuthenticated={isAuthenticated} showingUserGames={true} />
                    </div>
                  )}

                  {/* Section Tous les jeux - Vue liste */}
                  {otherGames.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {isAuthenticated && playedGames.length > 0 ? 'Tous les jeux disponibles' : 'Jeux disponibles'}
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                      </div>
                      <GameListView games={otherGames} isAuthenticated={isAuthenticated} showingUserGames={false} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 text-center border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{BRANDING.tagline}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">{BRANDING.tech.subtitle}</p>
        </div>
      </main>

      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        games={availableGames} 
        onLogout={isAuthenticated ? handleLogout : handleGuestReturn}
        isAuthenticated={isAuthenticated}
      />
      </div>
    </div>
  );
}