'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Zap, Users, Clock, Gamepad2, Share2 } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import { loadMultipleGameMetadata, defaultGameMetadata } from '@/lib/gameMetadata';
import { Game, GamesAPIResponse } from '@/types/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [multiplayerFilter, setMultiplayerFilter] = useState('all'); // 'all', 'multi', 'solo'
  const [playerCountFilter, setPlayerCountFilter] = useState('all');

  // Chargement des jeux depuis l'API avec métadonnées
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games');
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
        
        setAllGames(formattedGames);
        setLoading(false);
      } catch (error) {
        console.error('Erreur lors du chargement des jeux:', error);
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const filteredGames = useMemo(() => {
    let games = [...allGames];

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

    return games;
  }, [allGames, categoryFilter, multiplayerFilter, playerCountFilter]);

  const gameCategories = useMemo(() => 
    ['all', ...Array.from(new Set(allGames.map(g => g.category_name)))]
  , [allGames]);

  const playerCounts = useMemo(() => {
    const counts = new Set<number>();
    allGames.forEach(game => {
      for (let i = game.min_players; i <= game.max_players; i++) {
        counts.add(i);
      }
    });
    return ['all', ...Array.from(counts).sort((a, b) => a - b)];
  }, [allGames]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 mr-4">
                <Menu className="h-6 w-6 text-gray-900 dark:text-gray-300" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Fiches de score</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Fiches de score</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Créez des parties et invitez vos amis à jouer ensemble</p>
          <div className="mt-6">
            <div className="max-w-md mx-auto">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Code de partie (ex: YAMS-123456)" value={sessionId} onChange={(e) => setSessionId(e.target.value.toUpperCase())} className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
                <Link href={sessionId.trim() ? `/sessions/find?code=${sessionId.trim()}` : '#'} className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${sessionId.trim() ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'}`}>
                  <Share2 className="h-5 w-5" />
                  Rejoindre
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Jeux Disponibles</h3>
            <div className="flex items-center gap-2">
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm">
                {gameCategories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Catégories' : cat}</option>)}
              </select>
              <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                <button onClick={() => setMultiplayerFilter('all')} className={`px-2 py-1 rounded-l-md ${multiplayerFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>Tous</button>
                <button onClick={() => setMultiplayerFilter('multi')} className={`px-2 py-1 border-l border-r dark:border-gray-600 ${multiplayerFilter === 'multi' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>Multi</button>
                <button onClick={() => setMultiplayerFilter('solo')} className={`px-2 py-1 rounded-r-md ${multiplayerFilter === 'solo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}>Solo</button>
              </div>
              <select value={playerCountFilter} onChange={e => setPlayerCountFilter(e.target.value)} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm">
                {playerCounts.map(count => <option key={count} value={count}>{count === 'all' ? 'Joueurs' : `${count} joueurs`}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 animate-pulse"><div className="p-6"><div className="flex items-center justify-between mb-4"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded"></div><div className="w-16 h-5 bg-gray-200 dark:bg-gray-600 rounded-full"></div></div><div className="w-32 h-6 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div><div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded mb-4"></div><div className="w-full h-10 bg-gray-200 dark:bg-gray-600 rounded"></div></div></div>
              ))
            ) : (
              filteredGames.map((game) => {
                console.log(`[DEBUG DashboardPage] Rendering game: ${game.name}, Slug: ${game.slug}, is_implemented: ${game.is_implemented}, Link Href: /games/${game.slug}/new`);
                return (
                  <div key={game.id} className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 hover:shadow-lg transition-shadow flex flex-col">
                    {game.multiplayer && (
                      <div className="absolute top-0 left-0 transform -translate-x-1/4 translate-y-4 -rotate-45 bg-yellow-400 text-black text-xs font-bold px-8 py-1 shadow-lg">
                        Multi
                      </div>
                    )}
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-3xl">{game.icon}</div>
                        <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full">{game.category_name}</div>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{game.name}</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm flex-1">{game.rules}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                        <div className="flex items-center gap-1"><Users className="h-3 w-3" />{game.min_players === game.max_players ? `${game.min_players} joueurs` : `${game.min_players}-${game.max_players} joueurs`}</div>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{game.duration}</div>
                      </div>
                      <Link href={`/games/${game.slug}/new`} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-auto">
                        <Zap className="h-4 w-4" />
                        Nouvelle Partie
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-12 text-center border-t dark:border-gray-700 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gamepad2 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Multiplayer Edition</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">Next.js 15 + Turso SQLite + Polling temps réel • 🚧 Version de développement</p>
        </div>
      </main>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} games={allGames} onLogout={handleLogout} />
      </div>
    </AuthGuard>
  );
}