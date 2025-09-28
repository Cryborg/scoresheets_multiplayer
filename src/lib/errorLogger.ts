/**
 * Logger d'erreurs simple pour les hooks et fonctions qui ne peuvent pas utiliser React Context
 */

import { notify } from '@/lib/toast';

export type ErrorLevel = 'error' | 'warning' | 'info';

interface LogError {
  message: string;
  context?: string;
  details?: Record<string, unknown>;
  level?: ErrorLevel;
  showToast?: boolean;
}

/**
 * Log une erreur avec notification toast optionnelle
 */
export function logError({
  message,
  context = 'app',
  details,
  level = 'error',
  showToast = true
}: LogError): void {

  // Log dans la console en development
  if (process.env.NODE_ENV === 'development') {
    const logMethod = level === 'error' ? console.error :
                      level === 'warning' ? console.warn : console.info;

    logMethod(`[${context}] ${message}`, details || '');
  }

  // Toast notification si demandé
  if (showToast) {
    switch (level) {
      case 'error':
        notify.error(message);
        break;
      case 'warning':
        // Utiliser success avec un emoji warning car notify.warning n'existe pas
        notify.success(`⚠️ ${message}`);
        break;
      case 'info':
        // Utiliser success pour les infos car notify.info n'existe pas
        notify.success(message);
        break;
    }
  }

  // TODO: Ici on pourrait ajouter l'envoi vers un service de logging externe
  // comme Sentry, LogRocket, etc. en production
}

/**
 * Helpers pour les types d'erreurs courants
 */
export const errorLogger = {
  error: (message: string, context?: string, details?: Record<string, unknown>) =>
    logError({ message, context, details, level: 'error' }),

  warning: (message: string, context?: string, details?: Record<string, unknown>) =>
    logError({ message, context, details, level: 'warning' }),

  info: (message: string, context?: string, details?: Record<string, unknown>) =>
    logError({ message, context, details, level: 'info' }),

  // Pour les erreurs silencieuses (dev only)
  silent: (message: string, context?: string, details?: Record<string, unknown>) =>
    logError({ message, context, details, showToast: false }),
};

/**
 * Helper pour wrapper les fonctions async avec gestion d'erreur automatique
 */
export function withErrorHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  context: string,
  errorMessage?: string
): (...args: T) => Promise<R | null> {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const message = errorMessage || `Erreur dans ${context}`;
      logError({
        message,
        context,
        details: {
          error: error instanceof Error ? error.message : String(error),
          args: args.length > 0 ? args : undefined
        }
      });
      return null;
    }
  };
}