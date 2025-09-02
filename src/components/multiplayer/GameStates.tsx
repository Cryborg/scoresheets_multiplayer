'use client';

import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';
import GameCard from '@/components/layout/GameCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PlayerInput from '@/components/PlayerInput';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Connexion à la partie..." }: LoadingStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <LoadingSpinner message={message} />
    </div>
  );
}

interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

export function ErrorState({ error, onBack }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <GameCard title="Erreur de connexion">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </GameCard>
    </div>
  );
}

interface SessionNotFoundProps {
  onBack: () => void;
}

export function SessionNotFound({ onBack }: SessionNotFoundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <GameCard title="Session introuvable">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            La session demandée n&apos;existe pas ou n&apos;est plus accessible.
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </GameCard>
    </div>
  );
}

interface JoinSessionFormProps {
  sessionName: string;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onJoin: () => void;
  onCancel: () => void;
  isJoining: boolean;
  gameSlug?: string;
  player2Name?: string;
  onPlayer2NameChange?: (name: string) => void;
}

export function JoinSessionForm({ 
  sessionName, 
  playerName, 
  onPlayerNameChange, 
  onJoin, 
  onCancel, 
  isJoining,
  gameSlug,
  player2Name = '',
  onPlayer2NameChange
}: JoinSessionFormProps) {
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const isTeamGame = gameSlug === 'mille-bornes-equipes';
  const canJoin = playerName.trim() && (!isTeamGame || (player2Name && player2Name.trim()));

  // Load player suggestions from API
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const response = await fetch('/api/players/suggestions', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setPlayerSuggestions(data.players || []);
        }
      } catch {
        // Silently fail, suggestions are optional
      }
    }
    loadSuggestions();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <GameCard title="Rejoindre la partie">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isTeamGame 
              ? `Entrez les noms de votre équipe pour rejoindre `
              : `Entrez votre nom pour rejoindre `
            }
            <strong>{sessionName}</strong>
          </p>
          <div className="space-y-4 mb-4">
            <PlayerInput
              placeholder={isTeamGame ? "Joueur 1" : "Votre nom"}
              value={playerName}
              onChange={onPlayerNameChange}
              suggestions={playerSuggestions}
              autoFocus
            />
            {isTeamGame && onPlayer2NameChange && (
              <PlayerInput
                placeholder="Joueur 2"
                value={player2Name}
                onChange={onPlayer2NameChange}
                suggestions={playerSuggestions}
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white px-4 py-2 rounded-lg transition-colors"
              disabled={isJoining}
            >
              Annuler
            </button>
            <button
              onClick={onJoin}
              disabled={!canJoin || isJoining}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isJoining ? 'Connexion...' : 'Rejoindre'}
            </button>
          </div>
        </div>
      </GameCard>
    </div>
  );
}

interface LeaveSessionButtonProps {
  onLeave: () => void;
  disabled?: boolean;
  className?: string;
}

export function LeaveSessionButton({ onLeave, disabled = false, className = "" }: LeaveSessionButtonProps) {
  const { confirm, ConfirmDialog } = useConfirmDialog();
  
  const handleClick = async () => {
    const confirmed = await confirm({
      title: 'Quitter la partie',
      message: 'Êtes-vous sûr de vouloir quitter cette partie ? Vous pourrez la rejoindre à nouveau plus tard.',
      confirmLabel: 'Quitter',
      cancelLabel: 'Rester',
      isDangerous: true
    });
    
    if (confirmed) {
      onLeave();
    }
  };

  return (
    <>
      <ConfirmDialog />
      <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <LogOut className="w-4 h-4" />
      Quitter
    </button>
    </>
  );
}