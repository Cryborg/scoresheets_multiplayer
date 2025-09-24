'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

export interface VisibilityOptions {
  pauseOnHidden?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
  onActivityChange?: () => void;
}

export interface VisibilityState {
  isVisible: boolean;
  isActive: boolean;
  shouldPause: boolean;
  timeSinceLastActivity: number;
}

export interface VisibilityOptimizer {
  state: VisibilityState;
  updateActivity: () => void;
  getAdaptiveMultiplier: () => number;
}

const DEFAULT_CONFIG = {
  pauseOnHidden: true,
  activityThreshold: 30000, // 30s before considering idle
};

/**
 * Hook spécialisé pour l'optimisation basée sur la visibilité de la page
 * Gère la Page Visibility API et l'état de focus/blur
 */
export function useVisibilityOptimization(options: VisibilityOptions = {}): VisibilityOptimizer {
  const {
    pauseOnHidden = DEFAULT_CONFIG.pauseOnHidden,
    onVisibilityChange,
    onActivityChange,
  } = options;

  // États de visibilité et d'activité
  const [isVisible, setIsVisible] = useState(() => {
    // Safe initialization pour SSR
    return typeof window !== 'undefined' ? !document.hidden : true;
  });
  const [isActive, setIsActive] = useState(true);

  // Tracking de l'activité utilisateur
  const lastActivityRef = useRef<Date>(new Date());
  const [timeSinceLastActivity, setTimeSinceLastActivity] = useState(0);

  // Timer pour mettre à jour le temps depuis la dernière activité
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fonction pour marquer une activité utilisateur
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    setTimeSinceLastActivity(0);
    onActivityChange?.();
  }, [onActivityChange]);

  // Ref pour garder l'état précédent de visibilité
  const wasVisibleRef = useRef(isVisible);

  // Synchroniser la ref avec l'état
  useEffect(() => {
    wasVisibleRef.current = isVisible;
  }, [isVisible]);

  // Gestionnaire de changement de visibilité
  const handleVisibilityChange = useCallback(() => {
    if (typeof window === 'undefined') return;

    const wasVisible = wasVisibleRef.current;
    const nowVisible = !document.hidden;

    wasVisibleRef.current = nowVisible;
    setIsVisible(nowVisible);
    onVisibilityChange?.(nowVisible);

    // Si on revient à la page, marquer comme activité
    if (!wasVisible && nowVisible) {
      updateActivity();
    }
  }, [updateActivity, onVisibilityChange]);

  // Gestionnaires de focus/blur
  const handleFocus = useCallback(() => {
    setIsActive(true);
    updateActivity();
  }, [updateActivity]);

  const handleBlur = useCallback(() => {
    setIsActive(false);
  }, []);

  // Calculer le multiplicateur adaptatif pour les intervalles
  const getAdaptiveMultiplier = useCallback(() => {
    if (!isVisible) return 5; // 5x plus lent en arrière-plan
    if (!isActive) return 3;  // 3x plus lent si pas de focus
    if (timeSinceLastActivity > DEFAULT_CONFIG.activityThreshold) {
      return 2.5; // 2.5x plus lent après inactivité
    }
    return 1; // Vitesse normale
  }, [isVisible, isActive, timeSinceLastActivity]);

  // Mise à jour périodique du temps depuis la dernière activité
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const lastActivity = lastActivityRef.current.getTime();
      setTimeSinceLastActivity(now - lastActivity);
    };

    // Mettre à jour toutes les 5 secondes
    activityTimerRef.current = setInterval(updateTimer, 5000);

    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
    };
  }, []);

  // Configuration des event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !pauseOnHidden) return;

    // Page Visibility API
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Focus/Blur events
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Nettoyage
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [pauseOnHidden, handleVisibilityChange, handleFocus, handleBlur]);

  // Cleanup complet au démontage
  useEffect(() => {
    return () => {
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
    };
  }, []);

  return {
    state: {
      isVisible,
      isActive,
      shouldPause: pauseOnHidden && (!isVisible || !isActive),
      timeSinceLastActivity,
    },
    updateActivity,
    getAdaptiveMultiplier,
  };
}