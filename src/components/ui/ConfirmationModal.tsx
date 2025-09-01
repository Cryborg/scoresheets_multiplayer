'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  isDangerous = true,
  isLoading = false
}: ConfirmationModalProps) {
  // Gérer l'escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Empêcher le scroll du body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-lg w-full mx-4 transform transition-all animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header avec bouton fermer */}
        <div className="absolute right-4 top-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Icône */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              isDangerous 
                ? 'bg-red-100 dark:bg-red-900/20' 
                : 'bg-blue-100 dark:bg-blue-900/20'
            }`}>
              <AlertTriangle className={`h-6 w-6 ${
                isDangerous 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
            </div>

            {/* Texte */}
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 sm:order-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all duration-200 ${
                isDangerous
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400'
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed`}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              {isLoading ? 'Suppression...' : confirmLabel}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:order-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}