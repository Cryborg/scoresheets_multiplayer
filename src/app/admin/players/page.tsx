'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, Trophy, Clock, Users } from 'lucide-react';

interface PlayerStats {
  id: number;
  user_id: number | null;
  player_name: string;
  username?: string;
  email?: string;
  games_played: number;
  last_played: string;
  favorite_game: string | null;
  total_score: number;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'games_played' | 'last_played' | 'total_score'>('games_played');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/players?sortBy=${sortBy}&sortOrder=${sortOrder}`);
      if (response.ok) {
        const data = await response.json();
        setPlayers(data.players);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const filteredPlayers = players.filter(player =>
    player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalGamesPlayed = players.reduce((sum, player) => sum + player.games_played, 0);
  const totalPlayers = players.length;
  const activePlayers = players.filter(p => {
    const lastPlayed = new Date(p.last_played);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastPlayed > thirtyDaysAgo;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Statistiques des joueurs
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Analyse des données de jeu et des performances des joueurs
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total joueurs
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalPlayers}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Joueurs actifs (30j)
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {activePlayers}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Parties totales
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalGamesPlayed}
              </p>
            </div>
            <Trophy className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Moyenne/joueur
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {totalPlayers > 0 ? Math.round(totalGamesPlayed / totalPlayers) : 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Trier par :
            </label>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_') as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="games_played_desc">Parties jouées (↓)</option>
              <option value="games_played_asc">Parties jouées (↑)</option>
              <option value="last_played_desc">Dernière partie (↓)</option>
              <option value="last_played_asc">Dernière partie (↑)</option>
              <option value="total_score_desc">Score total (↓)</option>
              <option value="total_score_asc">Score total (↑)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          {filteredPlayers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joueur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Compte
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort('games_played')}
                    >
                      Parties jouées {sortBy === 'games_played' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Jeu préféré
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => handleSort('last_played')}
                    >
                      Dernière partie {sortBy === 'last_played' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {player.player_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {player.id}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {player.user_id ? (
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">
                              {player.username}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {player.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                            Joueur invité
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {player.games_played}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {player.favorite_game || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(player.last_played).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Aucun joueur trouvé
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Aucun joueur ne correspond à votre recherche.' : 'Aucune donnée de joueur disponible.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}