'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Eye, EyeOff } from 'lucide-react';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category_id: '',
    rules: '',
    is_implemented: 1,
    score_type: 'rounds' as 'rounds' | 'categories',
    team_based: 0,
    min_players: 2,
    max_players: 6,
    score_direction: 'higher' as 'higher' | 'lower',
    estimated_duration_minutes: 30,
    supports_realtime: 1
  });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const isEditing = !!editingGame;
      const url = isEditing 
        ? `/api/admin/games/${editingGame.id}`
        : '/api/admin/games';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchGames();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving game:', error);
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
    setFormData({
      name: game.name,
      slug: game.slug,
      category_id: game.category_id.toString(),
      rules: game.rules,
      is_implemented: game.is_implemented,
      score_type: game.score_type,
      team_based: game.team_based,
      min_players: game.min_players,
      max_players: game.max_players,
      score_direction: game.score_direction,
      estimated_duration_minutes: game.estimated_duration_minutes,
      supports_realtime: game.supports_realtime
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingGame(null);
    setFormData({
      name: '',
      slug: '',
      category_id: '',
      rules: '',
      is_implemented: 1,
      score_type: 'rounds',
      team_based: 0,
      min_players: 2,
      max_players: 6,
      score_direction: 'higher',
      estimated_duration_minutes: 30,
      supports_realtime: 1
    });
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }));
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
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau jeu
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingGame ? 'Modifier le jeu' : 'Nouveau jeu'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Tarot"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tarot"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catégorie *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de score
                </label>
                <select
                  value={formData.score_type}
                  onChange={(e) => setFormData({ ...formData, score_type: e.target.value as 'rounds' | 'categories' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="rounds">Par manches</option>
                  <option value="categories">Par catégories</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Joueurs min
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.min_players}
                  onChange={(e) => setFormData({ ...formData, min_players: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Joueurs max
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_players}
                  onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Durée estimée (min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={formData.estimated_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Direction du score
                </label>
                <select
                  value={formData.score_direction}
                  onChange={(e) => setFormData({ ...formData, score_direction: e.target.value as 'higher' | 'lower' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="higher">Plus haut gagne</option>
                  <option value="lower">Plus bas gagne</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Règles
              </label>
              <textarea
                rows={4}
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description des règles du jeu..."
              />
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.team_based === 1}
                  onChange={(e) => setFormData({ ...formData, team_based: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Jeu en équipes</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_implemented === 1}
                  onChange={(e) => setFormData({ ...formData, is_implemented: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Implémenté</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.supports_realtime === 1}
                  onChange={(e) => setFormData({ ...formData, supports_realtime: e.target.checked ? 1 : 0 })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Temps réel</span>
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Save className="h-4 w-4" />
                {editingGame ? 'Sauvegarder' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <X className="h-4 w-4" />
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

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
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
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
                            className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(game.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
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