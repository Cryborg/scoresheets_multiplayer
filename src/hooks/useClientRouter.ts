'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook pour gérer la navigation client de manière robuste
 * Résout les problèmes de navigation SSR/hydratation
 */
export function useClientRouter() {
  const router = useRouter();

  const push = useCallback((href: string) => {
    // Utiliser une navigation côté client pure si possible
    if (typeof window !== 'undefined') {
      // Forcer une navigation complète si on détecte des problèmes d'hydratation
      const isHydrated = document.querySelector('[data-hydrated="true"]');
      
      if (!isHydrated) {
        // Navigation forcée côté serveur
        window.location.href = href;
        return;
      }
      
      // Délai minimal pour s'assurer que l'hydratation est complète
      setTimeout(() => {
        router.push(href);
      }, 0);
    } else {
      // Côté serveur, utiliser le router normal
      router.push(href);
    }
  }, [router]);

  const replace = useCallback((href: string) => {
    if (typeof window !== 'undefined') {
      const isHydrated = document.querySelector('[data-hydrated="true"]');
      
      if (!isHydrated) {
        window.location.replace(href);
        return;
      }
      
      setTimeout(() => {
        router.replace(href);
      }, 0);
    } else {
      router.replace(href);
    }
  }, [router]);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    } else {
      router.back();
    }
  }, [router]);

  return {
    push,
    replace,
    back,
    prefetch: router.prefetch,
    refresh: router.refresh
  };
}