'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: AlertCircle,
};

const TOAST_STYLES = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  const IconComponent = TOAST_ICONS[toast.type];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Animation d'entrée
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto-dismiss
    let dismissTimer: NodeJS.Timeout;
    if (duration > 0) {
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200); // Durée de l'animation de sortie
  };

  return (
    <div
      className={`
        transform transition-all duration-200 ease-out
        ${isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
        flex items-start p-4 border-l-4 rounded-lg shadow-md
        ${TOAST_STYLES[toast.type]}
        max-w-md w-full
      `}
    >
      <IconComponent className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm opacity-90 mt-1">{toast.message}</p>
        )}
      </div>

      {toast.dismissible !== false && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Fermer la notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem 
            key={toast.id} 
            toast={toast} 
            onDismiss={onDismiss} 
          />
        ))}
      </div>
    </div>
  );
}

// Hook pour gérer les toasts
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Raccourcis pour les types courants
  const success = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'success', title, message, ...options });
  
  const error = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'error', title, message, ...options });
  
  const warning = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'warning', title, message, ...options });
  
  const info = (title: string, message?: string, options?: Partial<Toast>) =>
    addToast({ type: 'info', title, message, ...options });

  return {
    toasts,
    addToast,
    dismissToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
  };
}