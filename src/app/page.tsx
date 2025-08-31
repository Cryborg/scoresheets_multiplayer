'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BRANDING } from '@/lib/branding';
import { ArrowRight, Users, Trophy, Zap, LogIn, UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is already authenticated
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='));
    
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePlayAsGuest = () => {
    router.push('/dashboard');
  };

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {BRANDING.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {BRANDING.loading.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Title */}
          <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in">
            {BRANDING.name}
          </h1>
          <p className="text-2xl text-gray-600 dark:text-gray-300 mb-12">
            {BRANDING.tagline}
          </p>

          {/* Main CTA - Play as Guest */}
          <div className="mb-8">
            <Button
              onClick={handlePlayAsGuest}
              variant="primary"
              size="lg"
              leftIcon={<Zap className="w-6 h-6" />}
              rightIcon={<ArrowRight className="w-6 h-6" />}
              className="text-xl font-semibold shadow-2xl hover:shadow-3xl"
            >
              Jouer maintenant
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Sans inscription • Sans compte • Gratuit
            </p>
          </div>

          {/* Secondary Options */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors"
              >
                <Trophy className="w-5 h-5" />
                Accéder à mes parties
              </Link>
            ) : (
              <>
                <Button
                  href="/auth/login"
                  variant="secondary"
                  leftIcon={<LogIn className="w-5 h-5" />}
                  className="hover:shadow-md"
                >
                  Se connecter
                </Button>
                <Button
                  href="/auth/register"
                  variant="secondary"
                  leftIcon={<UserPlus className="w-5 h-5" />}
                  className="hover:shadow-md"
                >
                  Créer un compte
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Instantané
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Commence à jouer immédiatement, sans inscription
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Multijoueur
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Joue avec tes amis en temps réel, partage un simple lien
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              5+ Jeux
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Yams, Mille Bornes, Tarot, Belote et plus encore
            </p>
          </div>
        </div>

        {/* Optional account benefits */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            💡 Astuce : Crée un compte pour sauvegarder tes scores et retrouver tes parties
          </p>
        </div>
      </div>
    </div>
  );
}