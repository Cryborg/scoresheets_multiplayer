'use client';

import { useState } from 'react';
import { Users, Clock, Plus, Play, RotateCw, ArrowLeft, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useGameSessions } from '@/hooks/useGameSessions';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { Game } from '@/types/dashboard';

interface GameCardProps {
  game: Game;
  isLastPlayed: boolean;
  index: number;
}

export default function GameCard({ game, isLastPlayed }: GameCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const { sessions, activeSessions, completedSessions, refetch } = useGameSessions(game.slug);
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const handleFlip = () => {
    if (activeSessions.length > 0) {
      setIsFlipped(!isFlipped);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteSession = async (sessionId: number, sessionName: string) => {
    const confirmed = await confirm({
      title: 'Supprimer la partie',
      message: `Êtes-vous sûr de vouloir supprimer la partie "${sessionName}" ? Cette action ne peut pas être annulée.`,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      isDangerous: true
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // Actualiser la liste des sessions
          refetch();
        } else {
          const data = await response.json();
          alert(data.error || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className={`relative h-80 w-full perspective-1000 ${isLastPlayed ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Face avant - Info du jeu */}
        <div className="absolute inset-0 backface-hidden overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.2)] dark:hover:drop-shadow-[0_0_14px_rgba(255,255,255,0.35)] border dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-200 flex flex-col">
          {isLastPlayed && (
            <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-2 rotate-12 bg-blue-500 text-white text-xs font-bold px-6 py-1 shadow-lg z-10">
              Dernier joué
            </div>
          )}
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
            
            {/* Boutons d'action */}
            <div className="flex gap-2 mt-auto">
              {/* Bouton Parties en cours si des sessions actives existent */}
              {activeSessions.length > 0 && (
                <Button
                  onClick={handleFlip}
                  variant="primary"
                  size="sm"
                  leftIcon={<RotateCw className="h-4 w-4" />}
                  className="flex-1"
                >
                  Parties en cours ({activeSessions.length})
                </Button>
              )}
              
              {/* Bouton Nouvelle partie */}
              <Button
                href={`/games/${game.slug}/new`}
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                className={activeSessions.length > 0 ? "flex-1" : "w-full"}
              >
                Nouvelle partie
              </Button>
            </div>
          </div>
        </div>

        {/* Face arrière - Liste des parties */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-600 flex flex-col">
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-750">
            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
              {game.icon} {game.name} - Parties en cours
            </h5>
            <button
              onClick={handleFlip}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Retour"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {/* Sessions actives */}
            {activeSessions.length > 0 && (
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  En cours ({activeSessions.length})
                </h6>
                {activeSessions.map(session => (
                  <div key={session.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h6 className="font-medium text-green-900 dark:text-green-100 text-sm truncate">
                          {session.session_name}
                        </h6>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {formatDate(session.last_activity)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {session.players.join(', ')}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex gap-1">
                        <Button
                          href={`/games/${game.slug}/${session.id}`}
                          variant="primary"
                          size="xs"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id, session.session_name);
                          }}
                          variant="danger"
                          size="xs"
                          title="Supprimer cette partie"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sessions terminées */}
            {completedSessions.length > 0 && (
              <div className="space-y-2">
                <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Terminées ({completedSessions.length})
                </h6>
                {completedSessions.slice(0, 3).map(session => (
                  <div key={session.id} className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h6 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                          {session.session_name}
                        </h6>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Finie le {formatDate(session.ended_at || session.last_activity)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {session.players.join(', ')}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex gap-1">
                        <Button
                          href={`/games/${game.slug}/${session.id}`}
                          variant="secondary"
                          size="xs"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id, session.session_name);
                          }}
                          variant="danger"
                          size="xs"
                          title="Supprimer cette partie"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {completedSessions.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    et {completedSessions.length - 3} autres...
                  </p>
                )}
              </div>
            )}

            {sessions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Aucune partie pour ce jeu
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de confirmation placée au niveau global */}
      <ConfirmDialog />
    </div>
  );
}