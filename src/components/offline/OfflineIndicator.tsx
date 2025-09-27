'use client';

import { useState } from 'react';
import { Wifi, WifiOff, RotateCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncService } from '@/lib/sync-service';
import { usePWA } from '@/lib/pwa';

/**
 * Indicateur de statut réseau et synchronisation
 * Affiche l'état de connexion et les actions en attente
 */
export default function OfflineIndicator() {
  const { isOnline, connectionQuality, latency } = useNetworkStatus();
  const { pendingCount, forceSync } = useSyncService();
  const { canInstall, isInstalled, promptInstall } = usePWA();
  const [showDetails, setShowDetails] = useState(false);

  // Ne s'affiche que si pertinent
  if (isOnline && pendingCount === 0 && !canInstall) {
    return null;
  }

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4 text-orange-500" />;
    if (pendingCount > 0) return <RotateCw className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Wifi className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Mode hors ligne';
    if (pendingCount > 0) return `${pendingCount} en attente`;
    return 'En ligne';
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-orange-100 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
    if (pendingCount > 0) return 'bg-blue-100 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    return 'bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-800';
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Indicateur principal */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg cursor-pointer transition-all duration-200 ${getStatusColor()}`}
        onClick={() => setShowDetails(!showDetails)}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {getStatusText()}
        </span>
        {!isOnline && (
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        )}
      </div>

      {/* Panel de détails */}
      {showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4">
          <div className="space-y-3">
            {/* Statut de connexion */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Connexion
              </span>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Connecté
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      Hors ligne
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Qualité de connexion */}
            {isOnline && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Qualité</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionQuality === 'excellent' ? 'bg-green-500' :
                    connectionQuality === 'good' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {connectionQuality}
                  </span>
                  {latency && (
                    <span className="text-gray-500 ml-1">({latency}ms)</span>
                  )}
                </div>
              </div>
            )}

            {/* Actions en attente */}
            {pendingCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Synchronisation
                  </span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {pendingCount} action{pendingCount > 1 ? 's' : ''} en attente
                    </span>
                  </div>
                </div>

                {isOnline && (
                  <button
                    onClick={forceSync}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    Forcer la synchronisation
                  </button>
                )}

                {!isOnline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Les actions seront synchronisées automatiquement dès la reconnexion
                  </p>
                )}
              </div>
            )}

            {/* Installation PWA */}
            {canInstall && !isInstalled && (
              <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    App installable
                  </span>
                </div>
                <button
                  onClick={promptInstall}
                  className="w-full text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Installer l&apos;application
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Utilisez l&apos;app même sans connexion internet
                </p>
              </div>
            )}

            {/* Statut PWA installée */}
            {isInstalled && (
              <div className="flex items-center gap-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Application installée
                </span>
              </div>
            )}

            {/* Conseils offline */}
            {!isOnline && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2 text-xs">
                <strong className="text-orange-800 dark:text-orange-200">Mode hors ligne actif</strong>
                <ul className="mt-1 text-orange-700 dark:text-orange-300 space-y-1">
                  <li>• Toutes vos parties sont sauvegardées localement</li>
                  <li>• Les scores seront synchronisés à la reconnexion</li>
                  <li>• Impossible de rejoindre des parties en ligne</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}