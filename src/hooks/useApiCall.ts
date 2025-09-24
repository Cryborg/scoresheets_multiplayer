'use client';

import { useCallback } from 'react';
import { useErrorHandler } from '@/contexts/ErrorContext';

export interface ApiCallOptions extends RequestInit {
  context?: string;
  suppressToast?: boolean; // Pour éviter le toast automatique
  retries?: number;
}

interface ApiResponse<T = unknown> {
  data: T;
  ok: boolean;
  status: number;
  statusText: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response: Response,
    public data?: unknown
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

export function useApiCall() {
  const { showError, showSuccess } = useErrorHandler();

  const apiCall = useCallback(async <T = unknown>(
    url: string,
    options: ApiCallOptions = {}
  ): Promise<ApiResponse<T>> => {
    const {
      context = 'api',
      suppressToast = false,
      retries = 0,
      ...fetchOptions
    } = options;

    let lastError: Error;
    let attempts = 0;
    const maxAttempts = retries + 1;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers
          },
          ...fetchOptions
        });

        let data: T;
        try {
          data = await response.json() as T;
        } catch {
          // Si la réponse n'est pas du JSON, on utilise le texte
          data = (await response.text()) as unknown as T;
        }

        if (!response.ok) {
          const apiError = new ApiError(response.status, response.statusText, response, data);

          // Messages d'erreur spécifiques selon le status
          let errorMessage: string;
          switch (response.status) {
            case 401:
              errorMessage = 'Session expirée. Veuillez vous reconnecter.';
              break;
            case 403:
              errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
              break;
            case 404:
              errorMessage = 'Ressource non trouvée.';
              break;
            case 429:
              errorMessage = 'Trop de requêtes. Veuillez patienter.';
              break;
            case 500:
              errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
              break;
            default:
              errorMessage = `Erreur ${response.status}: ${response.statusText}`;
          }

          // Ajouter des détails si disponibles
          if (typeof data === 'object' && data && 'error' in data) {
            errorMessage = (data as { error: string }).error;
          }

          if (!suppressToast) {
            showError(errorMessage, context, {
              url,
              status: response.status,
              method: fetchOptions.method || 'GET'
            });
          }

          throw apiError;
        }

        return {
          data,
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        // Si c'est une ApiError, on ne retry pas (erreur HTTP)
        if (error instanceof ApiError || attempts >= maxAttempts) {
          throw lastError;
        }

        // Attendre avant de retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }, [showError, showSuccess]);

  // Helper pour les requêtes GET
  const get = useCallback(<T = unknown>(url: string, options?: Omit<ApiCallOptions, 'method' | 'body'>) => {
    return apiCall<T>(url, { ...options, method: 'GET' });
  }, [apiCall]);

  // Helper pour les requêtes POST
  const post = useCallback(<T = unknown>(url: string, data?: unknown, options?: Omit<ApiCallOptions, 'method'>) => {
    return apiCall<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [apiCall]);

  // Helper pour les requêtes PUT
  const put = useCallback(<T = unknown>(url: string, data?: unknown, options?: Omit<ApiCallOptions, 'method'>) => {
    return apiCall<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }, [apiCall]);

  // Helper pour les requêtes DELETE
  const del = useCallback(<T = unknown>(url: string, options?: Omit<ApiCallOptions, 'method' | 'body'>) => {
    return apiCall<T>(url, { ...options, method: 'DELETE' });
  }, [apiCall]);

  return {
    apiCall,
    get,
    post,
    put,
    delete: del
  };
}