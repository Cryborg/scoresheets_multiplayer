'use client';

import { ReactNode } from 'react';
import BackButton from '@/components/ui/BackButton';

interface GameLayoutProps {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  rightContent?: ReactNode;
  children: ReactNode;
}

export default function GameLayout({ 
  title, 
  subtitle, 
  onBack, 
  rightContent, 
  children 
}: GameLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {onBack && (
                <div className="mr-4">
                  <BackButton href="/dashboard" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h1>
                {subtitle && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {children}
          </div>
          
          {rightContent && (
            <div className="lg:col-span-1">
              {rightContent}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}