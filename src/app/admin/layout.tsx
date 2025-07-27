'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import AdminGuard from '@/components/AdminGuard';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Gamepad2, 
  Tags, 
  Shield,
  Menu,
  X
} from 'lucide-react';

const adminSections = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
    description: 'Vue d\'ensemble et statistiques'
  },
  {
    name: 'Utilisateurs',
    href: '/admin/users',
    icon: Users,
    description: 'Gestion des comptes utilisateurs'
  },
  {
    name: 'Joueurs',
    href: '/admin/players',
    icon: Shield,
    description: 'Statistiques et données des joueurs'
  },
  {
    name: 'Jeux',
    href: '/admin/games',
    icon: Gamepad2,
    description: 'Gestion des jeux disponibles'
  },
  {
    name: 'Catégories',
    href: '/admin/categories',
    icon: Tags,
    description: 'Gestion des catégories de jeux'
  },
  {
    name: 'Configuration',
    href: '/admin/settings',
    icon: Settings,
    description: 'Paramètres de l\'application'
  }
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <AuthGuard>
      <AdminGuard>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            {/* Sidebar header */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Administration
              </h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="mt-6 px-3 space-y-1">
              {adminSections.map((section) => {
                const isActive = pathname === section.href;
                const Icon = section.icon;
                
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                    }`} />
                    <div>
                      <div className="font-medium">{section.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {section.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Back to app link */}
            <div className="absolute bottom-6 left-0 right-0 px-3">
              <Link
                href="/dashboard"
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Settings className="mr-3 h-5 w-5 text-gray-400" />
                Retour à l&apos;application
              </Link>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:pl-64">
            {/* Mobile header */}
            <div className="lg:hidden flex items-center justify-between h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Administration
              </h1>
              <div className="w-8" /> {/* Spacer */}
            </div>

            {/* Page content */}
            <main className="p-6">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </AuthGuard>
  );
}