'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Zap, Users, Clock, Gamepad2, Share2, RotateCcw, Save, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import AuthStatus from '@/components/AuthStatus';
import Sidebar from '@/components/Sidebar';
import { loadMultipleGameMetadata, defaultGameMetadata } from '@/lib/gameMetadata';
import { Game, GamesAPIResponse } from '@/types/dashboard';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';
import GameCard from '@/components/dashboard/GameCard';
import { BRANDING } from '@/lib/branding';
import { authenticatedFetch } from '@/lib/authClient';

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

  // Filter states with localStorage persistence
  const {
    categoryFilter,
    multiplayerFilter,
    playerCountFilter,
    setCategoryFilter,
    setMultiplayerFilter,
    setPlayerCountFilter,
    resetFilters,
    initialized: filtersInitialized
  } = useDashboardFilters();

  // Keep the hook for tracking in other parts of the app but don't use sort logic here
  const { setLastPlayedGame } = useLastPlayedGame();

  // Chargement des jeux depuis l'API avec métadonnées
  useEffect(() => {
    const fetchUserGames = async () => {
      if (!isAuthenticated) {
        return; // Skip user games for guests
      }
      
      try {
        const response = await authenticatedFetch('/api/games');
        const data: GamesAPIResponse = await response.json();
        
        const slugs = data.games.map(game => game.slug);
        const metadataMap = await loadMultipleGameMetadata(slugs);
        
        const formattedGames: Game[] = data.games.map(game => {
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
        const response = await fetch('/api/games/available');
        const data: GamesAPIResponse = await response.json();
        
        const slugs = data.games.map(game => game.slug);
        const metadataMap = await loadMultipleGameMetadata(slugs);
        
        const formattedGames: Game[] = data.games.map(game => {
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

  const filteredGames = useMemo(() => {
    // Pour les invités, on utilise les jeux disponibles
    let games = isAuthenticated ? [...allGames] : [...availableGames];

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

    // Pour les utilisateurs connectés, les jeux sont triés par date de dernière ouverture
    // Pour les invités, on garde l'ordre par défaut (par catégorie et nom)

    return games;
  }, [allGames, availableGames, isAuthenticated, categoryFilter, multiplayerFilter, playerCountFilter]);

  const gameCategories = useMemo(() => {
    const games = isAuthenticated ? allGames : availableGames;
    return ['all', ...Array.from(new Set(games.map(g => g.category_name)))];
  }, [allGames, availableGames, isAuthenticated]);

  const playerCounts = useMemo(() => {
    const games = isAuthenticated ? allGames : availableGames;
    const counts = new Set<number>();
    games.forEach(game => {
      for (let i = game.min_players; i <= game.max_players; i++) {
        counts.add(i);
      }
    });
    return ['all', ...Array.from(counts).sort((a, b) => a - b)];
  }, [allGames, availableGames, isAuthenticated]);

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
            
            {/* Quick join form in header */}
            <div className="hidden sm:flex items-center gap-2">
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
        {/* Guest notice */}
        {!isAuthenticated && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              💡 Vous jouez en tant qu&apos;invité. <Link href="/auth/register" className="underline hover:no-underline">Créez un compte</Link> pour sauvegarder vos scores et retrouver vos parties.
            </p>
          </div>
        )}
        {/* Mobile quick join - shown on small screens */}
        <div className="sm:hidden mb-6">
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
            
            {/* Filtres - Responsive stack */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border dark:border-gray-700 animate-pulse"><div className="p-6"><div className="flex items-center justify-between mb-4"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div><div className="w-16 h-5 bg-gray-200 dark:bg-gray-600 rounded-full"></div></div><div className="w-32 h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div><div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-full h-10 bg-gray-200 dark:bg-gray-600 rounded"></div></div></div>
              ))
            ) : filteredGames.length === 0 ? (
              // Message quand aucun jeu n'est affiché
              <div className="col-span-full text-center py-12">
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
            ) : (
              filteredGames.map((game, index) => {
                // Le premier jeu dans la liste est le dernier joué (seulement pour les utilisateurs connectés)
                const isLastPlayed = isAuthenticated && index === 0 && filteredGames.length > 0;
                return (
                  <GameCard
                    key={game.id}
                    game={game}
                    isLastPlayed={isLastPlayed}
                    index={index}
                  />
                );
              })
            )}
          </div>
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