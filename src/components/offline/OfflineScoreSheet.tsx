'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Play, UserPlus } from 'lucide-react';
import { useOfflineSession } from '@/hooks/useOfflineSession';
import GameLayout from '@/components/layout/GameLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import GameCard from '@/components/layout/GameCard';

import { OfflineGameSession, OfflinePlayer, OfflineScore } from '@/lib/offline-storage';

interface OfflineSessionData extends OfflineGameSession {
  players: OfflinePlayer[];
  scores: OfflineScore[];
}

interface OfflineScoreSheetProps {
  sessionId: string;
  gameSlug: string;
  children: (props: {
    session: OfflineSessionData;
    gameState: {
      addPlayer: (playerName: string) => Promise<string | undefined>;
      addScore: (playerId: string, score: number, details?: Record<string, unknown>) => Promise<void>;
      startGame: () => Promise<void>;
      endGame: () => Promise<void>;
      isHost: boolean;
    };
  }) => ReactNode;
}

export default function OfflineScoreSheet({ sessionId, children }: OfflineScoreSheetProps) {

  const router = useRouter();
  const { session, isLoading, error, addPlayer, addScore, startGame, endGame } = useOfflineSession(sessionId);
  const [playerName, setPlayerName] = useState('');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Pour les sessions offline, l'utilisateur est toujours "host"
  const isHost = true;

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || isAddingPlayer) return;

    try {
      setIsAddingPlayer(true);
      await addPlayer(playerName.trim());
      setPlayerName('');
    } catch (err) {
      console.error('Erreur lors de l\'ajout du joueur:', err);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const handleStartGame = async () => {
    try {
      await startGame();
    } catch (err) {
      console.error('Erreur lors du démarrage de la partie:', err);
    }
  };

  const handleBack = () => {
    router.push('/dashboard');
  };

  // État de chargement
  if (isLoading) {
    return (
      <GameLayout title="Chargement..." onBack={handleBack}>
        <LoadingSpinner text="Chargement de la partie offline..." />
      </GameLayout>
    );
  }

  // État d'erreur
  if (error || !session) {
    return (
      <GameLayout title="Erreur" onBack={handleBack}>
        <GameCard title="Session introuvable">
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'Cette session offline n\'existe pas ou a été supprimée.'}
            </p>
            <Button onClick={handleBack} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Retour au tableau de bord
            </Button>
          </div>
        </GameCard>
      </GameLayout>
    );
  }

  // État d'attente (pas assez de joueurs)
  if (session.status === 'waiting') {
    return (
      <GameLayout
        title={session.session_name}
        subtitle="🏠 Mode hors ligne"
        onBack={handleBack}
      >
        <GameCard title="Salle d'attente">
          <div className="space-y-6">
            {/* Liste des joueurs */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Joueurs ({session.current_players}/{session.max_players})
              </h3>


              {session.players && session.players.length > 0 ? (
                <div className="space-y-2">
                  {session.players.map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  Aucun joueur pour le moment
                </p>
              )}
            </div>

            {/* Formulaire d'ajout de joueur */}
            {session.current_players < session.max_players && (
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ajouter un joueur
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Nom du joueur"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isAddingPlayer}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  leftIcon={<UserPlus className="h-4 w-4" />}
                  disabled={!playerName.trim() || isAddingPlayer}
                  className="w-full"
                >
                  {isAddingPlayer ? 'Ajout...' : 'Ajouter le joueur'}
                </Button>
              </form>
            )}

            {/* Bouton de démarrage */}
            {session.current_players >= 1 && (
              <Button
                onClick={handleStartGame}
                variant="primary"
                leftIcon={<Play className="h-4 w-4" />}
                className="w-full"
              >
                Commencer la partie
              </Button>
            )}
          </div>
        </GameCard>
      </GameLayout>
    );
  }

  // État de jeu actif
  const gameState = {
    addPlayer,
    addScore,
    startGame,
    endGame,
    isHost
  };

  return (
    <GameLayout
      title={session.session_name}
      subtitle="🏠 Mode hors ligne"
      onBack={handleBack}
    >
      {children({ session, gameState })}
    </GameLayout>
  );
}