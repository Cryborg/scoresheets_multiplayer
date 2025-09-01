'use client';

import { useState, useEffect } from 'react';
import { Cookie, Settings, Check, X } from 'lucide-react';
import { 
  shouldShowConsentBanner, 
  acceptAllCookies, 
  acceptEssentialOnly,
  saveConsent,
  getConsent,
  type ConsentSettings 
} from '@/lib/cookieConsent';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [customSettings, setCustomSettings] = useState<ConsentSettings>({
    essential: true,
    preferences: false,
    analytics: false
  });

  useEffect(() => {
    // Only show on client side and if consent not given
    setShowBanner(shouldShowConsentBanner());
    setCustomSettings(getConsent());
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setShowBanner(false);
  };

  const handleEssentialOnly = () => {
    acceptEssentialOnly();
    setShowBanner(false);
  };

  const handleCustomSave = () => {
    saveConsent(customSettings);
    setShowBanner(false);
  };

  const toggleCustomSetting = (key: keyof ConsentSettings) => {
    if (key === 'essential') return; // Can't toggle essential
    setCustomSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="max-w-7xl mx-auto p-4">
        {!showDetails ? (
          // Simple banner
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Cookie className="h-6 w-6 text-orange-500 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Nous utilisons des cookies
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Pour améliorer votre expérience : sauvegarde de vos préférences, 
                  fonctionnement de l&apos;authentification et optimisation du site.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                Paramètres
              </button>
              
              <button
                onClick={handleEssentialOnly}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Essentiel uniquement
              </button>
              
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
              >
                <Check className="h-4 w-4" />
                Accepter tout
              </button>
            </div>
          </div>
        ) : (
          // Detailed settings
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Paramètres des cookies
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              {/* Essential cookies */}
              <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Cookies essentiels
                    </h4>
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded-full">
                      Requis
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nécessaires au fonctionnement de base : authentification, 
                    sessions invité et sécurité.
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-5 h-5 bg-green-500 rounded border-2 border-green-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Preference cookies */}
              <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Cookies de préférences
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sauvegardent vos filtres du dashboard, dernier jeu joué 
                    et autres préférences d&apos;interface.
                  </p>
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => toggleCustomSetting('preferences')}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      customSettings.preferences 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      customSettings.preferences ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
              
              {/* Analytics cookies (future) */}
              <div className="flex items-start justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg opacity-50">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Cookies d&apos;analyse
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nous aident à comprendre comment améliorer le site.
                    <span className="text-blue-600 dark:text-blue-400 ml-1">(Bientôt disponible)</span>
                  </p>
                </div>
                <div className="ml-4">
                  <div className="w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="w-5 h-5 bg-gray-400 rounded-full translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={handleEssentialOnly}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Essentiel uniquement
              </button>
              
              <button
                onClick={handleCustomSave}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Sauvegarder mes choix
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}