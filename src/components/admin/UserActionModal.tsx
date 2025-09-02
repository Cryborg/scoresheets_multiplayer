'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, User, Shield, Key } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin: number;
  is_blocked: number;
  blocked_reason?: string;
  display_name?: string;
}

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  user?: User | null;
  actionType: 'reset' | 'block' | 'unblock' | 'delete' | null;
}

export default function UserActionModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  actionType
}: UserActionModalProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    blockReason: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData({
      newPassword: '',
      blockReason: user?.blocked_reason || ''
    });
  }, [user, actionType]);

  // Gérer l'escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen || !actionType || !user) return null;

  const getModalConfig = () => {
    switch (actionType) {
      case 'reset':
        return {
          title: 'Réinitialiser le mot de passe',
          message: `Définir un nouveau mot de passe pour ${user.username}`,
          icon: <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
          iconBg: 'bg-blue-100 dark:bg-blue-900/20',
          confirmLabel: 'Réinitialiser',
          confirmClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          isDangerous: false
        };
      case 'block':
        return {
          title: 'Bloquer l\'utilisateur',
          message: `Bloquer l'accès pour ${user.username}`,
          icon: <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          confirmLabel: 'Bloquer',
          confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          isDangerous: true
        };
      case 'unblock':
        return {
          title: 'Débloquer l\'utilisateur',
          message: `Restaurer l'accès pour ${user.username}`,
          icon: <User className="h-6 w-6 text-green-600 dark:text-green-400" />,
          iconBg: 'bg-green-100 dark:bg-green-900/20',
          confirmLabel: 'Débloquer',
          confirmClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
          isDangerous: false
        };
      case 'delete':
        return {
          title: 'Supprimer définitivement',
          message: `Cette action est irréversible. Toutes les données de ${user.username} seront supprimées.`,
          icon: <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />,
          iconBg: 'bg-red-100 dark:bg-red-900/20',
          confirmLabel: 'Supprimer définitivement',
          confirmClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          isDangerous: true
        };
      default:
        return null;
    }
  };

  const config = getModalConfig();
  if (!config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      let response;
      
      switch (actionType) {
        case 'reset':
          if (!formData.newPassword) return;
          response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: formData.newPassword })
          });
          break;
        case 'block':
          response = await fetch(`/api/admin/users/${user.id}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'block', reason: formData.blockReason })
          });
          break;
        case 'unblock':
          response = await fetch(`/api/admin/users/${user.id}/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'unblock', reason: '' })
          });
          break;
        case 'delete':
          response = await fetch(`/api/admin/users/${user.id}/delete`, {
            method: 'DELETE'
          });
          break;
      }

      if (!response || !response.ok) {
        throw new Error('Erreur lors de l\'opération');
      }

      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Fermer</span>
          </button>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start gap-4 mb-6">
            {/* Icône */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${config.iconBg}`}>
              {config.icon}
            </div>

            {/* Texte */}
            <div className="flex-1 pt-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {config.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {config.message}
              </p>
            </div>
          </div>

          {/* Form fields */}
          {actionType === 'reset' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe *
              </label>
              <input
                type="password"
                required
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Saisissez le nouveau mot de passe"
                minLength={6}
              />
            </div>
          )}

          {actionType === 'block' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Raison du blocage (optionnel)
              </label>
              <input
                type="text"
                value={formData.blockReason}
                onChange={(e) => setFormData({ ...formData, blockReason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Violation des règles d'utilisation"
              />
            </div>
          )}

          {/* Boutons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 sm:order-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all duration-200 ${config.confirmClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              )}
              <Save className="h-4 w-4" />
              {isLoading ? 'En cours...' : config.confirmLabel}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 sm:order-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}