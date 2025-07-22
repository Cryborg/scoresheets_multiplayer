'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import { useGameSessionCreator, Game } from '@/hooks/useGameSessionCreator';
import GameSessionForm from '@/components/GameSessionForm';
import AuthGuard from '@/components/AuthGuard';

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
    createSession
  } = useGameSessionCreator(game);

  const fetchGame = useCallback(async () => {
    console.log('[DEBUG NewGamePage] Starting fetchGame for slug:', slug);
    try {
      const response = await authenticatedFetch('/api/games');
      console.log('[DEBUG NewGamePage] API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG NewGamePage] All games data:', data.games);
        const foundGame = data.games.find((g: Game) => g.slug === slug);
        console.log('[DEBUG NewGamePage] Found game object:', foundGame);
        
        if (!foundGame) {
          console.warn('[DEBUG NewGamePage] Game not found with slug:', slug, 'Redirecting...');
          router.push('/dashboard');
          return;
        }

        console.log('[DEBUG NewGamePage] Setting game state with:', foundGame);
        setGame(foundGame);
      } else {
        console.error('[DEBUG NewGamePage] API response not OK:', response);
      }
    } catch (err) {
      console.error('Error fetching game data:', err);
      router.push('/dashboard');
    } finally {
      console.log('[DEBUG NewGamePage] Setting loading to false.');
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!game) return;
    
    const result = await createSession(`/api/games/${slug}/sessions`);
    
    if (result) {
      // Redirect directly to the game session (salon/lobby)
      router.push(`/games/${slug}/${result.sessionId}`);
    }
  };


  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Chargement du jeu...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!game) {
    return null;
  }


  return (
    <AuthGuard>
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
        <div className="max-w-4xl mx-auto px-6 py-8">
          <GameSessionForm
            state={state}
            game={game}
            onUpdateState={updateState}
            onUpdatePlayer={updatePlayer}
            onUpdateTeamPlayer={updateTeamPlayer}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onSubmit={handleSubmit}
            submitButtonText={`Commencer la partie de ${game.name}`}
          />
        </div>
      </div>
    </AuthGuard>
  );
}