'use client';

import { useEffect } from 'react';

/**
 * Composant pour initialiser PWA et Service Worker
 * À placer dans le layout racine
 */
export default function PWAInit() {
  useEffect(() => {
    // Le Service Worker est automatiquement enregistré par PWAManager
  }, []);

  // Ce composant est invisible mais nécessaire pour l'initialisation
  return null;
}