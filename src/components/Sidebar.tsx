'use client';
import Link from 'next/link';
import { X, Home, LogOut, Shield, Calendar, User } from 'lucide-react';
import { BRANDING } from '@/lib/branding';
import { useIsAdmin } from '@/hooks/useIsAdmin';

interface Game {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  is_implemented: boolean;
  icon: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onLogout: () => void;
  isAuthenticated?: boolean;
}

export default function Sidebar({ isOpen, onClose, games, onLogout, isAuthenticated = true }: SidebarProps) {
  const { isAdmin } = useIsAdmin();

  // Find "Jeu libre" for authenticated users
  const jeuLibre = games.find(game => game.slug === 'jeu-libre');

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎲</span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{BRANDING.ui.sidebar.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5 text-gray-700 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <Link
              href="/dashboard"
              onClick={onClose}
              className="flex items-center px-4 py-2 mb-2 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <Home className="h-5 w-5 mr-3" />
              Accueil
            </Link>

            {/* Mes Parties - seulement pour les utilisateurs connectés */}
            {isAuthenticated && (
              <Link
                href="/sessions"
                onClick={onClose}
                className="flex items-center px-4 py-2 mb-2 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <Calendar className="h-5 w-5 mr-3" />
                Mes Parties
              </Link>
            )}

            {/* Mon Profil - seulement pour les utilisateurs connectés */}
            {isAuthenticated && (
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center px-4 py-2 mb-2 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <User className="h-5 w-5 mr-3" />
                Mon Profil
              </Link>
            )}

            {/* Jeu libre - seulement pour les utilisateurs connectés */}
            {isAuthenticated && jeuLibre && (
              <div className="mt-6">
                <div className="border-t dark:border-gray-700 mb-6"></div>
                <Link
                  href="/games/jeu-libre/configure"
                  onClick={onClose}
                  className="flex items-center px-4 py-3 mb-4 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                >
                  <span className="text-lg mr-3">{jeuLibre.icon}</span>
                  <div>
                    <div className="font-medium">{jeuLibre.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Créer un jeu personnalisé</div>
                  </div>
                </Link>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t dark:border-gray-700 p-4 space-y-2">
            {/* Administration link - Only for admins */}
            {isAdmin && (
              <Link
                href="/admin/users"
                onClick={onClose}
                className="flex items-center w-full px-4 py-2 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <Shield className="h-5 w-5 mr-3" />
                Administration
              </Link>
            )}
            
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center w-full px-4 py-2 text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <LogOut className="h-5 w-5 mr-3" />
              {isAuthenticated ? 'Déconnexion' : 'Retour à l’accueil'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}