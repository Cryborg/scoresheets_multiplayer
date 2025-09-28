'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, X, Cloud } from 'lucide-react';
import { useSyncService } from '@/lib/sync-service';

/**
 * Notification de synchronisation qui s'affiche quand les données offline
 * ont été synchronisées avec succès vers le serveur
 */
export default function SyncNotification() {
  const { lastSyncSuccess, clearSyncNotification } = useSyncService();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastSyncSuccess) {
      setIsVisible(true);

      // Auto-fermeture après 5 secondes
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => clearSyncNotification(), 300); // Attend la fin de l'animation
      }, 5000);

      return () => clearTimeout(timeout);
    }
  }, [lastSyncSuccess, clearSyncNotification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => clearSyncNotification(), 300);
  };

  if (!lastSyncSuccess) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-lg shadow-xl p-4 min-w-[320px] max-w-md">
        <div className="flex items-start gap-3">
          {/* Icône de succès */}
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Synchronisation réussie
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {lastSyncSuccess.count} {lastSyncSuccess.count === 1 ? 'action synchronisée' : 'actions synchronisées'} avec le serveur
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <Cloud className="h-3 w-3" />
              <span>Vos données offline sont maintenant sauvegardées</span>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}