'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { authenticatedFetch } from '@/lib/authClient';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';

export default function JeuLibreConfigurePage() {
  const router = useRouter();
  const [customName, setCustomName] = useState('');
  const [category, setCategory] = useState('Personnalisé');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [difficulty, setDifficulty] = useState('intermédiaire');
  const [duration, setDuration] = useState(30);
  const [teamBased, setTeamBased] = useState(false);
  const [teamCount, setTeamCount] = useState(2);
  const [playersPerTeam, setPlayersPerTeam] = useState(2);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { setLastPlayedGame } = useLastPlayedGame();

  const categories = [
    'Personnalisé', 'Cartes', 'Dés', 'Stratégie', 
    'Party Games', 'Sport', 'Quiz', 'Créatif'
  ];

  const difficulties = ['facile', 'intermédiaire', 'expert'] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setLoading(true);
    
    try {
      // Create a new custom game
      const response = await authenticatedFetch('/api/games/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameName: customName.trim(),
          category,
          minPlayers,
          maxPlayers,
          difficulty,
          duration,
          teamBased,
          teamCount,
          playersPerTeam,
          description: description.trim() || undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Track as last played game using the new slug
        setLastPlayedGame(result.game.slug);
        
        // Redirect back to dashboard to see the new game
        router.push('/dashboard');
      } else {
        const error = await response.json();
        console.error('Failed to create custom game:', error);
        alert('Erreur lors de la création du jeu. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Error creating custom game:', error);
      alert('Erreur lors de la création du jeu. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🎯 Créer un Jeu personnalisé
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ajoutez un nouveau jeu avec un nom personnalisé à votre collection
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <Gamepad2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Quel est le nom de votre jeu ?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ce nouveau jeu apparaîtra dans votre collection et vous pourrez créer des parties
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nom du jeu */}
              <div>
                <label htmlFor="customName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du jeu *
                </label>
                <input
                  type="text"
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="ex: Poker entre amis, Quiz familial, Concours..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-400 transition-colors"
                  maxLength={50}
                  required
                  autoFocus
                />
              </div>

              {/* Catégorie */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Jeu en équipes */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamBased}
                    onChange={(e) => setTeamBased(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Jeu en équipes
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Les joueurs joueront par équipes plutôt qu&apos;individuellement
                </p>
              </div>

              {/* Configuration des joueurs OU des équipes selon le mode */}
              {teamBased ? (
                // Configuration des équipes
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="teamCount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nombre d&apos;équipes
                    </label>
                    <input
                      type="number"
                      id="teamCount"
                      min="2"
                      max="10"
                      value={teamCount}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        setTeamCount(count);
                        // Recalculer min/max players automatiquement
                        const newMin = count * playersPerTeam;
                        const newMax = count * playersPerTeam;
                        setMinPlayers(newMin);
                        setMaxPlayers(newMax);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="playersPerTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Joueurs par équipe
                    </label>
                    <input
                      type="number"
                      id="playersPerTeam"
                      min="1"
                      max="8"
                      value={playersPerTeam}
                      onChange={(e) => {
                        const perTeam = parseInt(e.target.value);
                        setPlayersPerTeam(perTeam);
                        // Recalculer min/max players automatiquement
                        const newMin = teamCount * perTeam;
                        const newMax = teamCount * perTeam;
                        setMinPlayers(newMin);
                        setMaxPlayers(newMax);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Total : {teamCount} équipe{teamCount > 1 ? 's' : ''} × {playersPerTeam} joueur{playersPerTeam > 1 ? 's' : ''} = {teamCount * playersPerTeam} joueurs
                    </p>
                  </div>
                </div>
              ) : (
                // Configuration nombre de joueurs
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Joueurs min
                    </label>
                    <input
                      type="number"
                      id="minPlayers"
                      min="1"
                      max="20"
                      value={minPlayers}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setMinPlayers(val);
                        if (val > maxPlayers) setMaxPlayers(val);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Joueurs max
                    </label>
                    <input
                      type="number"
                      id="maxPlayers"
                      min={minPlayers}
                      max="20"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Durée et difficulté */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    min="5"
                    max="480"
                    step="5"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulté
                  </label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white">
                    {difficulties.map(diff => (
                      <option key={diff} value={diff}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description (optionnelle) */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez brièvement les règles ou l'objectif de votre jeu..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-400 resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum 200 caractères
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                  🎯 À propos des Jeux personnalisés
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Système de scores simple par manches</li>
                  <li>• Parfait pour vos jeux maison ou règles personnalisées</li>
                  <li>• Idéal pour les concours, quiz, ou défis créatifs</li>
                  <li>• Apparaîtra dans votre collection de jeux</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 px-6 py-3 text-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </Link>
                <Button
                  type="submit"
                  disabled={!customName.trim() || loading}
                  className="flex-1"
                  loading={loading}
                >
                  {loading ? 'Création...' : 'Créer le jeu'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Une fois créé, votre jeu apparaîtra sur le tableau de bord et vous pourrez créer des parties
          </p>
        </div>
      </div>
    </div>
  );
}