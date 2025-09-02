'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import GameEditModal from '@/components/admin/GameEditModal';

interface Game {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  category_name: string;
  rules: string;
  is_implemented: number;
  score_type: 'rounds' | 'categories';
  team_based: number;
  min_players: number;
  max_players: number;
  score_direction: 'higher' | 'lower';
  estimated_duration_minutes: number;
  supports_realtime: number;
}

interface Category {
  id: number;
  name: string;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  useEffect(() => {
    fetchGames();
    fetchCategories();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/admin/games');
      if (response.ok) {
        const data = await response.json();
        setGames(data.games);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSaveGame = async (gameData: Omit<Game, 'id'>) => {
    try {
      const isEditing = !!editingGame;
      const url = isEditing 
        ? `/api/admin/games/${editingGame.id}`
        : '/api/admin/games';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gameData)
      });

      if (!response.ok) {
        throw new Error('Failed to save game');
      }

      await fetchGames();
    } catch (error) {
      console.error('Error saving game:', error);
      throw error;
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Supprimer le jeu',
      message: 'Êtes-vous sûr de vouloir supprimer ce jeu ? Cette action est irréversible et supprimera également toutes les parties associées.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/games/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchGames();
      }
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  const toggleImplemented = async (game: Game) => {
    try {
      const response = await fetch(`/api/admin/games/${game.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...game,
          category_id: game.category_id,
          is_implemented: game.is_implemented === 1 ? 0 : 1
        })
      });

      if (response.ok) {
        await fetchGames();
      }
    } catch (error) {
      console.error('Error toggling implementation:', error);
    }
  };

  const startEdit = (game: Game) => {
    setEditingGame(game);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setEditingGame(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGame(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog />
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion des jeux
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez les jeux disponibles dans votre application
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nouveau jeu
        </button>
      </div>

      {/* Game Edit Modal */}
      <GameEditModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={handleSaveGame}
        game={editingGame}
        categories={categories}
      />

      {/* Games List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          {games.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Jeu
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joueurs
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {games.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {game.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {game.slug} • {game.estimated_duration_minutes}min
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {game.category_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {game.min_players}-{game.max_players}
                        {game.team_based === 1 && (
                          <span className="ml-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-1 rounded">
                            équipes
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          game.score_type === 'rounds' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}>
                          {game.score_type === 'rounds' ? 'Manches' : 'Catégories'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleImplemented(game)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            game.is_implemented === 1
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/40'
                          }`}
                        >
                          {game.is_implemented === 1 ? (
                            <>
                              <Eye className="h-3 w-3 mr-1" />
                              Implémenté
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 mr-1" />
                              Non implémenté
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(game)}
                            className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(game.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun jeu
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Créez votre premier jeu pour commencer.
              </p>
              <button
                onClick={handleCreateNew}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Créer un jeu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}