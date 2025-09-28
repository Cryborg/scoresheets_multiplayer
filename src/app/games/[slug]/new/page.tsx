'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useGameSessionCreator, Game } from '@/hooks/useGameSessionCreator';
import { useLastPlayedGame } from '@/hooks/useLastPlayedGame';
import { useOfflineGameSessions } from '@/hooks/useOfflineGameSessions';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import GameSessionForm from '@/components/GameSessionForm';
import { authenticatedFetch } from '@/lib/authClient';
import { getGuestId } from '@/lib/guestAuth';
import { GamePageLayout } from '@/components/layout/PageLayout';

export default function NewGamePage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  
  const {
    state,
    updateState,
    updatePlayer,
    updateTeamPlayer,
    addPlayer,
    removePlayer,
    createSession,
    clearFocus
  } = useGameSessionCreator(game);

  const { setLastPlayedGame } = useLastPlayedGame();
  const { createOfflineSession } = useOfflineGameSessions();
  const { isOnline } = useNetworkStatus();

  const fetchGame = useCallback(async () => {
    try {
      // Use available games API to allow access to all games
      const response = await fetch('/api/games/available');
      if (response.ok) {
        const data = await response.json();
        const foundGame = data.games.find((g: Game) => g.slug === slug);
        
        if (!foundGame) {
          // Game not found in available games, redirect to dashboard
          router.push('/dashboard');
          return;
        }

        setGame(foundGame);
        // Save this game as the last played
        setLastPlayedGame(slug);
        
        // Track game activity (game opening)
        try {
          await authenticatedFetch('/api/games/activity', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ gameSlug: slug, guestId: getGuestId() }),
          });
        } catch (activityError) {
          // Don't fail if activity tracking fails
          console.warn('Failed to track game activity:', activityError);
        }
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching game data:', err);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [slug, router, setLastPlayedGame]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;

    if (isOnline) {
      // Mode online : utiliser l'API normale
      const result = await createSession(`/api/games/${slug}/sessions`);

      if (result) {
        // Redirect directly to the game session (salon/lobby)
        router.push(`/games/${slug}/${result.sessionId}`);
      }
    } else {
      // Mode offline : créer une session locale
      try {
        const players = state.players.map(p => p.name).filter(p => p.trim());

        if (players.length < 2) {
          console.error('Au moins 2 joueurs sont requis');
          return;
        }

        const sessionId = await createOfflineSession({
          session_name: state.sessionName.trim() || `Partie de ${game.name}`,
          game_slug: game.slug,
          game_name: game.name,
          players: players,
          team_based: game.team_based
        });

        // Redirection vers la session offline
        router.push(`/games/${slug}/${sessionId}`);
      } catch (error) {
        console.error('Erreur lors de la création de la session offline:', error);
      }
    }
  };


  if (loading) {
    return (
      <GamePageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement du jeu...</p>
          </div>
        </div>
      </GamePageLayout>
    );
  }

  if (!game) {
    return null;
  }


  return (
    <GamePageLayout>
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 -mx-4 -mt-8 mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
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
                    Nouvelle partie de {game.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {game.team_based ? 'Jeu en équipes' : 'Jeu individuel'} • {game.min_players}-{game.max_players} joueurs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <GameSessionForm
            state={state}
            game={game}
            onUpdateState={updateState}
            onUpdatePlayer={updatePlayer}
            onUpdateTeamPlayer={updateTeamPlayer}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onSubmit={handleSubmit}
            onClearFocus={clearFocus}
            submitButtonText={`Commencer la partie de ${game.name}`}
          />
        </div>
    </GamePageLayout>
  );
}