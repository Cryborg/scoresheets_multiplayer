'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Share2, CheckCircle } from 'lucide-react';
import { authenticatedFetch } from '@/lib/authClient';
import { useGameSessionCreator, Game } from '@/hooks/useGameSessionCreator';
import GameSessionForm from '@/components/GameSessionForm';
import AuthGuard from '@/components/AuthGuard';

export default function NewGamePage() {
  const params = useParams();
  const slug = params.slug as string;
  
  console.log('[DEBUG NewGamePage] Slug:', slug);
  console.log('[DEBUG NewGamePage] Full params:', params);
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionCreated, setSessionCreated] = useState<{ sessionId: string; sessionCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
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
    try {
      const response = await authenticatedFetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG NewGamePage] All games:', data.games);
        const foundGame = data.games.find((g: Game) => g.slug === slug);
        console.log('[DEBUG NewGamePage] Found game:', foundGame);
        
        if (!foundGame) {
          console.log('[DEBUG NewGamePage] Game not found, redirecting to dashboard');
          router.push('/dashboard');
          return;
        }

        setGame(foundGame);
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      router.push('/dashboard');
    } finally {
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
      // Redirect directly to the session instead of showing success screen
      router.push(`/games/${slug}/${result.sessionId}`);
    }
  };

  const handleCopyCode = () => {
    if (sessionCreated) {
      navigator.clipboard.writeText(sessionCreated.sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  if (sessionCreated) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="max-w-2xl mx-auto px-6 py-16">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Partie créée avec succès !
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Partagez ce code avec les autres joueurs pour qu'ils rejoignent la partie
              </p>
              
              <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-6 mb-8">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Code de la partie</p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
                    {sessionCreated.sessionCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-3 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Copier le code"
                  >
                    {copied ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Copy className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Retour au dashboard
                </Link>
                <Link
                  href={`/games/${slug}/${sessionCreated.sessionId}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  Rejoindre la partie
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
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
        </div>

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