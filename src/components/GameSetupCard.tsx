'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface GameSetupCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  multiplayer?: boolean;
}

export default function GameSetupCard({
  title,
  description,
  icon: Icon,
  children,
  className = '',
  multiplayer = false
}: GameSetupCardProps) {
  return (
    <div className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="relative overflow-hidden rounded-2xl">
        {multiplayer && (
          <div className="absolute top-0 left-0 transform -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-yellow-400 text-black text-xs font-bold px-8 py-1 shadow-lg">
            Multi
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}