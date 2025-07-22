'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { Users, Wifi, WifiOff, Clock, Trophy } from 'lucide-react';

interface StatusBarProps {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  playersCount: number;
  isEditing: boolean;
  lastUpdate: Date | null;
  gameStatus: string;
}

// Memoized status bar component to prevent flickering
export const StatusBar = memo(function StatusBar({ 
  connectionStatus, 
  playersCount, 
  isEditing, 
  lastUpdate,
  gameStatus 
}: StatusBarProps) {
  const [stableStatus, setStableStatus] = useState(connectionStatus);
  const [hasBeenConnected, setHasBeenConnected] = useState(false);

  // Debounce connection status changes to prevent blinking
  useEffect(() => {
    // Mark that we've been connected at least once
    if (connectionStatus === 'connected') {
      setHasBeenConnected(true);
    }

    // For the first connection, update immediately
    if (!hasBeenConnected && connectionStatus === 'connected') {
      setStableStatus(connectionStatus);
      return;
    }

    // For subsequent changes, debounce to prevent blinking
    const timer = setTimeout(() => {
      setStableStatus(connectionStatus);
    }, hasBeenConnected ? 1000 : 100); // Longer delay after first connection

    return () => clearTimeout(timer);
  }, [connectionStatus, hasBeenConnected]);

  // Memoize the last update time string to avoid constant re-renders
  const lastUpdateDisplay = useMemo(() => {
    if (!lastUpdate) return 'En attente...';
    return `MAJ: ${lastUpdate.toLocaleTimeString()}`;
  }, [lastUpdate]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {stableStatus === 'connected' ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : stableStatus === 'connecting' ? (
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${
              stableStatus === 'connected' ? 'text-green-600 dark:text-green-400' : 
              stableStatus === 'connecting' ? 'text-blue-600 dark:text-blue-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {stableStatus === 'connected' ? 'Connecté' :
               stableStatus === 'connecting' ? 'Connexion...' :
               stableStatus === 'error' ? 'Reconnexion...' : 
               stableStatus}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {playersCount} joueur{playersCount > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isEditing ? '✏️ Édition (pause sync)' : lastUpdateDisplay}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {gameStatus === 'active' ? 'Partie en cours' : gameStatus}
          </span>
        </div>
      </div>
    </div>
  );
});