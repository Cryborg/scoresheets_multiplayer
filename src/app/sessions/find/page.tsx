'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

function FindSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [isSearching, setIsSearching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      router.push('/dashboard');
      return;
    }

    const findSession = async () => {
      try {
        const response = await fetch(`/api/sessions/find?code=${encodeURIComponent(code)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Session introuvable');
        }

        // Redirect directly to the session
        router.push(`/games/${data.session.game_slug}/${data.session.id}`);
      } catch (err) {
        console.error('Find session error:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la recherche');
        setIsSearching(false);
      }
    };

    findSession();
  }, [code, router]);

  if (isSearching) {
    const message = code ? `Recherche de la partie ${code}...` : 'Recherche de la partie...';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message={message} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Partie introuvable
          </h1>
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Retour au dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FindSessionPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement de la page..." />}>
      <FindSession />
    </Suspense>
  );
}
