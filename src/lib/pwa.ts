'use client';

// Gestion de l'enregistrement et des mises à jour du Service Worker

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export class PWAManager {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    // Écoute l'événement d'installation PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as PWAInstallPrompt;
      console.log('💾 PWA: Install prompt ready');
    });

    // Écoute l'installation réussie
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA: App installed successfully');
      this.deferredPrompt = null;
    });

    // Enregistre le Service Worker
    await this.registerServiceWorker();
  }

  async registerServiceWorker(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      // Désactive le Service Worker en développement pour éviter les conflits
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 PWA: Skipping Service Worker registration in development mode');

        // Nettoie les service workers existants en dev
        await this.unregisterAllServiceWorkers();
        return false;
      }

      try {
        console.log('🔧 PWA: Registering Service Worker...');

        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('✅ PWA: Service Worker registered:', this.registration.scope);

        // Gestion des mises à jour
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            console.log('🔄 PWA: New Service Worker found, installing...');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✅ PWA: New Service Worker installed, update available');
                this.notifyUpdate();
              }
            });
          }
        });

        // Force la prise de contrôle par le nouveau SW
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 PWA: Service Worker updated, reloading...');
          window.location.reload();
        });

        return true;
      } catch (error) {
        console.error('❌ PWA: Service Worker registration failed:', error);
        return false;
      }
    } else {
      console.log('❌ PWA: Service Workers not supported');
      return false;
    }
  }

  async unregisterAllServiceWorkers(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`🧹 PWA: Found ${registrations.length} service workers to unregister`);

        for (const registration of registrations) {
          await registration.unregister();
          console.log('✅ PWA: Unregistered service worker:', registration.scope);
        }
      } catch (error) {
        console.error('❌ PWA: Failed to unregister service workers:', error);
      }
    }
  }

  // Demande l'installation de l'app
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('❌ PWA: No install prompt available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const choiceResult = await this.deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('✅ PWA: User accepted install prompt');
        return true;
      } else {
        console.log('❌ PWA: User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('❌ PWA: Install prompt failed:', error);
      return false;
    } finally {
      this.deferredPrompt = null;
    }
  }

  // Vérifie si l'app peut être installée
  get canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  // Vérifie si l'app est installée
  get isInstalled(): boolean {
    if (typeof window === 'undefined') return false;

    // Détection PWA installée
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://');
  }

  // Force la mise à jour du Service Worker
  async updateServiceWorker(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
      console.log('🔄 PWA: Service Worker update check completed');
    } catch (error) {
      console.error('❌ PWA: Service Worker update failed:', error);
    }
  }

  // Active le nouveau Service Worker immédiatement
  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  // Cache des URLs supplémentaires
  async cacheUrls(urls: string[]): Promise<void> {
    if (!this.registration?.active) return;

    this.registration.active.postMessage({
      type: 'CACHE_URLS',
      urls
    } as { type: string; urls: string[] });
  }

  private notifyUpdate(): void {
    // Affiche une notification de mise à jour
    // Tu peux personnaliser cette fonction selon ton UI
    if (confirm('Une nouvelle version de l\'app est disponible. Recharger maintenant ?')) {
      this.skipWaiting();
    }
  }
}

// Instance globale
export const pwaManager = new PWAManager();

// Hook React pour utiliser PWA
import { useState, useEffect } from 'react';

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    const checkPWAStatus = () => {
      setCanInstall(pwaManager.canInstall);
      setIsInstalled(pwaManager.isInstalled);
      setIsRegistered(!!navigator.serviceWorker?.controller);
    };

    // Check initial
    checkPWAStatus();

    // Check périodique
    const interval = setInterval(checkPWAStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    canInstall,
    isInstalled,
    isRegistered,
    promptInstall: () => pwaManager.promptInstall(),
    updateApp: () => pwaManager.updateServiceWorker(),
    cacheUrls: (urls: string[]) => pwaManager.cacheUrls(urls)
  };
}