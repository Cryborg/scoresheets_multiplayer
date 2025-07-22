'use client';

import { ReactNode } from 'react';
import BackButton from '@/components/ui/BackButton';
import { ArrowLeft } from 'lucide-react';

// Interface pour le mode classique
interface ClassicLayoutProps {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  rightContent?: ReactNode;
  children: ReactNode;
  // Props multiplayer non utilisées en mode classique
  session?: never;
  onLeaveSession?: never;
  showRanking?: never;
  rankingComponent?: never;
}

// Interface pour le mode multiplayer
interface MultiplayerLayoutProps {
  session: {
    id: number;
    session_name: string;
    game_name?: string;
    status: string;
  };
  onLeaveSession: () => void;
  showRanking?: boolean;
  rankingComponent?: ReactNode;
  children: ReactNode;
  // Props classiques non utilisées en mode multiplayer
  title?: never;
  subtitle?: never;
  onBack?: never;
  rightContent?: never;
}

type GameLayoutProps = ClassicLayoutProps | MultiplayerLayoutProps;

export default function GameLayout(props: GameLayoutProps) {
  // Détecter le mode en vérifiant la présence de session
  const isMultiplayer = 'session' in props && props.session;
  
  if (isMultiplayer) {
    // Mode multiplayer
    const { session, onLeaveSession, showRanking, rankingComponent, children } = props;
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button 
                  onClick={onLeaveSession}
                  className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-4 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {session.session_name}
                  </h1>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {session.game_name && `${session.game_name} • `}Session {session.status}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className={`grid gap-6 ${showRanking ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'}`}>
            <div className={showRanking ? 'lg:col-span-3' : 'col-span-1'}>
              {children}
            </div>
            
            {showRanking && rankingComponent && (
              <div className="lg:col-span-1">
                {rankingComponent}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  } else {
    // Mode classique
    const { title, subtitle, onBack, rightContent, children } = props;
    
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
}