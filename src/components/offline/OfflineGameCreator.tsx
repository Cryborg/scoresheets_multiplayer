'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Wifi, WifiOff, Plus, Minus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineGameSessions } from '@/hooks/useOfflineGameSessions';
import { Game } from '@/types/dashboard';

interface OfflineGameCreatorProps {
  game: Game;
  onClose: () => void;
}

/**
 * Composant de création de partie avec gestion intelligente online/offline
 * En mode offline : force la saisie de TOUS les joueurs
 * En mode online : permet le flow normal (rejoin possible)
 */
export default function OfflineGameCreator({ game, onClose }: OfflineGameCreatorProps) {
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { createOfflineSession } = useOfflineGameSessions();

  const [sessionName, setSessionName] = useState('');
  const [players, setPlayers] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  // Contraintes selon le mode
  const minPlayers = isOnline ? 1 : game.min_players; // Online: 1 joueur suffit, Offline: min requis
  const maxPlayers = game.max_players;

  const handleAddPlayer = () => {
    if (players.length < maxPlayers) {
      setPlayers([...players, '']);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (players.length > minPlayers) {
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
    }
  };

  const handlePlayerChange = (index: number, value: string) => {
    const newPlayers = [...players];
    newPlayers[index] = value;
    setPlayers(newPlayers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filtre les noms vides et valide
      const validPlayers = players.filter(name => name.trim() !== '');

      if (validPlayers.length < minPlayers) {
        alert(`${isOnline ? 'Au moins 1 joueur' : `Au moins ${minPlayers} joueurs`} requis`);
        return;
      }

      if (validPlayers.length > maxPlayers) {
        alert(`Maximum ${maxPlayers} joueurs autorisés`);
        return;
      }

      // Vérifie les doublons
      const uniqueNames = new Set(validPlayers.map(name => name.trim().toLowerCase()));
      if (uniqueNames.size !== validPlayers.length) {
        alert('Les noms des joueurs doivent être uniques');
        return;
      }

      if (isOnline) {
        // Mode online : utilise l'API normale
        const response = await fetch(`/api/games/${game.slug}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_name: sessionName || `Partie de ${game.name}`,
            players: validPlayers
          })
        });

        if (response.ok) {
          const result = await response.json();
          router.push(`/games/${game.slug}/${result.sessionId}`);
        } else {
          const error = await response.json();
          alert(error.error || 'Erreur lors de la création');
        }
      } else {
        // Mode offline : stockage local
        const sessionId = await createOfflineSession({
          session_name: sessionName || `Partie de ${game.name}`,
          game_slug: game.slug,
          game_name: game.name,
          players: validPlayers,
          team_based: game.team_based === 1
        });

        router.push(`/games/${game.slug}/${sessionId}`);
      }
    } catch (error) {
      console.error('Error creating game session:', error);
      alert('Erreur lors de la création de la partie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header avec statut réseau */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Nouvelle partie - {game.name}
          </h2>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Wifi className="h-4 w-4" />
                Online
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600 text-sm">
                <WifiOff className="h-4 w-4" />
                Offline
              </div>
            )}
          </div>
        </div>

        {/* Alerte mode offline */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start gap-2">
              <WifiOff className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Mode hors ligne</strong><br />
                Tous les joueurs doivent être saisis maintenant. Personne ne pourra rejoindre la partie en cours.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom de la partie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom de la partie (optionnel)
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder={`Partie de ${game.name}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Liste des joueurs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Joueurs ({players.filter(p => p.trim()).length}/{maxPlayers})
              </label>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                {isOnline ? `Min: 1` : `Min: ${minPlayers}`} - Max: {maxPlayers}
              </div>
            </div>

            <div className="space-y-2">
              {players.map((player, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={player}
                    onChange={(e) => handlePlayerChange(index, e.target.value)}
                    placeholder={`Joueur ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    required={index < minPlayers}
                  />
                  {players.length > minPlayers && (
                    <Button
                      type="button"
                      onClick={() => handleRemovePlayer(index)}
                      variant="danger"
                      size="sm"
                      className="px-2"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Bouton ajouter joueur */}
            {players.length < maxPlayers && (
              <Button
                type="button"
                onClick={handleAddPlayer}
                variant="secondary"
                size="sm"
                className="mt-2 w-full"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Ajouter un joueur
              </Button>
            )}
          </div>

          {/* Informations du jeu */}
          <div className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <strong>{game.name}</strong> - {game.duration}<br />
            {game.team_based ? 'Jeu en équipes' : 'Jeu individuel'}
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={loading || players.filter(p => p.trim()).length < minPlayers}
            >
              {loading ? 'Création...' : (isOnline ? 'Créer partie' : 'Créer (offline)')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}