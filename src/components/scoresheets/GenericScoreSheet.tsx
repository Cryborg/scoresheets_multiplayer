'use client';

import BaseScoreSheetMultiplayer from './BaseScoreSheetMultiplayer';
import { GameSessionWithRounds } from '@/types/multiplayer';
import { useState } from 'react';
import ScoreInput from '@/components/ui/ScoreInput';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import { useErrorHandler } from '@/contexts/ErrorContext';
import { Trophy, TrendingDown, Edit3, Dice6, Trash2 } from 'lucide-react';
import { THEME } from '@/lib/theme';

interface GenericScoreSheetProps {
  sessionId: string;
  gameSlug: string;
}

export default function GenericScoreSheet({ sessionId, gameSlug }: GenericScoreSheetProps) {
  const { showError } = useErrorHandler();
  const [roundScores, setRoundScores] = useState<Record<number, number>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // État de la modale de confirmation de suppression
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleScoreChange = (playerId: number, score: number) => {
    setRoundScores(prev => ({
      ...prev,
      [playerId]: score
    }));
  };

  const handleAddRound = async (addRound: (scores: Array<{ playerId: number; score: number }>, details?: Record<string, unknown>) => Promise<void>, players: Array<{ id: number; player_name: string }>) => {
    // Vérifier qu'au moins un joueur a un score non nul
    const hasAnyScore = Object.values(roundScores).some(score => score !== 0);
    if (!hasAnyScore) {
      setErrorMessage("Veuillez entrer au moins un score");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const scores = players.map(player => ({
        playerId: player.id,
        score: roundScores[player.id] || 0
      }));

      await addRound(scores);
      setRoundScores({});
    } catch {
      setErrorMessage("Impossible d'ajouter la manche");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotal = (rounds: Array<{ scores: Record<number, number> }>, playerId: number) => {
    return rounds.reduce((sum, round) => sum + (round.scores[playerId] || 0), 0);
  };

  const handleDeleteRound = (roundNumber: number) => {
    setRoundToDelete(roundNumber);
    setShowDeleteModal(true);
  };

  const confirmDeleteRound = async (deleteRound: (roundNumber: number) => Promise<void>) => {
    if (!roundToDelete) return;

    setIsDeleting(true);
    try {
      await deleteRound(roundToDelete);
      setShowDeleteModal(false);
      setRoundToDelete(null);
    } catch (error) {
      showError('Erreur lors de la suppression de la manche', 'scoreSheet', {
        sessionId,
        gameSlug,
        roundNumber: roundToDelete,
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteRound = () => {
    setShowDeleteModal(false);
    setRoundToDelete(null);
  };

  try {
    return (
      <BaseScoreSheetMultiplayer<GameSessionWithRounds>
        sessionId={sessionId}
        gameSlug={gameSlug}
      >
      {({ session, gameState }) => {
        const scoreDirection = session?.game?.score_direction || 'higher';
        const gameTitle = session?.game?.name || "Jeu de points";

        return (
          <div className="space-y-6">
            {/* Titre du jeu */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h2 className="flex items-center gap-3 text-2xl font-bold">
                <Dice6 className="h-8 w-8 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {gameTitle}
                </span>
              </h2>
            </div>

            {/* Formulaire d'ajout de manche */}
            <div className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="p-6 pb-4">
                <h3 className="flex items-center gap-3 text-xl font-semibold text-blue-800 dark:text-blue-200">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  Nouvelle manche
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                  Saisissez les points de chaque joueur pour cette manche
                </p>
              </div>
              <div className="px-6 pb-6">
                <div className="space-y-3">
                  {/* Inputs pour chaque joueur */}
                  <div className="grid gap-3">
                    {session.players.map((player) => (
                      <div key={player.id} className="group">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
                          {/* Nom du joueur */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                              {player.player_name}
                            </h3>
                          </div>
                          
                          {/* Input score avec boutons +/- */}
                          <div className="flex-shrink-0">
                            <ScoreInput
                              value={roundScores[player.id] || 0}
                              onChange={(value) => handleScoreChange(player.id, parseInt(value) || 0)}
                              placeholder="0"
                              min={-999}
                              max={9999}
                              size="md"
                              showButtons={true}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Message d'erreur */}
                  {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                    </div>
                  )}
                  
                  {/* Bouton de validation */}
                  <button 
                    onClick={() => handleAddRound(gameState.addRound, session.players)}
                    disabled={isSubmitting || !Object.values(roundScores).some(score => score !== 0)}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
                  >
                    {isSubmitting ? 'Ajout en cours...' : 'Valider la manche'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tableau des scores */}
            <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                <h3 className="flex items-center justify-between font-semibold">
                  <span className="text-xl">Tableau des scores</span>
                  <span className="text-sm font-normal bg-white/20 px-3 py-1 rounded-full">
                    Manche {session.rounds?.length || 0}
                  </span>
                </h3>
              </div>
              <div className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Manche
                        </th>
                        {session.players.map(player => (
                          <th key={player.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {player.player_name}
                          </th>
                        ))}
                        {/* Colonne Actions pour l'hôte */}
                        {gameState.isHost && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {session.rounds?.map((round, index) => {
                        const roundNumber = index + 1;
                        const isLastRound = index === (session.rounds?.length || 0) - 1;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {roundNumber}
                            </td>
                            {session.players.map(player => (
                              <td key={player.id} className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 dark:text-white">
                                {round.scores[player.id] || 0}
                              </td>
                            ))}
                            {/* Bouton de suppression pour l'hôte (seulement dernière manche) */}
                            {gameState.isHost && (
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {isLastRound ? (
                                  <button
                                    onClick={() => handleDeleteRound(roundNumber)}
                                    className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Supprimer cette manche"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <div className="w-8 h-8"></div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {/* Ligne des totaux */}
                      <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 font-bold">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-yellow-500" />
                          Total
                        </td>
                        {session.players.map(player => {
                          const total = calculateTotal(session.rounds || [], player.id);
                          const isLeader = scoreDirection === 'higher' 
                            ? total === Math.max(...session.players.map(p => calculateTotal(session.rounds || [], p.id)))
                            : total === Math.min(...session.players.map(p => calculateTotal(session.rounds || [], p.id)));
                          
                          return (
                            <td key={player.id} className={`px-4 py-3 whitespace-nowrap text-center ${
                              isLeader ? 'text-lg text-yellow-600 dark:text-yellow-400' : 'text-sm text-gray-900 dark:text-white'
                            }`}>
                              {total}
                              {isLeader && <Trophy className="inline-block ml-1 h-4 w-4" />}
                            </td>
                          );
                        })}
                        {/* Cellule vide pour la colonne Actions */}
                        {gameState.isHost && (
                          <td className="px-4 py-3"></td>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            {scoreDirection === 'lower' && session.rounds && session.rounds.length > 0 && (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6">
                <div className="flex items-center justify-center gap-3">
                  <TrendingDown className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Plus bas score de la partie</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.min(...session.players.map(p => calculateTotal(session.rounds || [], p.id)))}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Modale de confirmation de suppression */}
            <ConfirmationModal
              isOpen={showDeleteModal}
              onClose={cancelDeleteRound}
              onConfirm={() => confirmDeleteRound(gameState.deleteRound)}
              title="Supprimer la manche"
              message={`Êtes-vous sûr de vouloir supprimer la manche ${roundToDelete} ? Cette action est irréversible.`}
              confirmLabel="Supprimer"
              cancelLabel="Annuler"
              isDangerous={true}
              isLoading={isDeleting}
            />
          </div>
        );
      }}
    </BaseScoreSheetMultiplayer>
  );
  } catch (error) {
    showError('Erreur lors du chargement du jeu', 'GenericScoreSheet', {
      sessionId,
      gameSlug,
      error: error instanceof Error ? error.message : String(error)
    });
    return (
      <div className={`min-h-screen ${THEME.classes.pageBackground} flex items-center justify-center`}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de chargement</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Le jeu n&apos;a pas pu être chargé.</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }
}