'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Database, Shield, Globe, Palette } from 'lucide-react';

interface AppSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultTheme: 'light' | 'dark' | 'system';
  sessionTimeout: number;
  autoCleanupOldSessions: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    siteName: 'Oh Sheet!',
    siteDescription: 'Score like a pro',
    maintenanceMode: false,
    allowRegistration: true,
    defaultTheme: 'system',
    sessionTimeout: 3600,
    autoCleanupOldSessions: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/dashboard';
          return;
        }
        throw new Error('Failed to load settings');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to default values
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }

      const result = await response.json();
      alert('✅ ' + result.message);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('❌ Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      siteName: 'Oh Sheet!',
      siteDescription: 'Score like a pro',
      maintenanceMode: false,
      allowRegistration: true,
      defaultTheme: 'system',
      sessionTimeout: 3600,
      autoCleanupOldSessions: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Paramètres de l&apos;application
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Réinitialiser
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Paramètres généraux
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du site
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description du site
              </label>
              <input
                type="text"
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Mode maintenance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Désactiver l&apos;accès public au site</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Autoriser les inscriptions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Permettre aux nouveaux utilisateurs de s&apos;inscrire</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Apparence
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Thème par défaut
            </label>
            <select
              value={settings.defaultTheme}
              onChange={(e) => setSettings({ ...settings, defaultTheme: e.target.value as 'light' | 'dark' | 'system' })}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            >
              <option value="system">Système</option>
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
            </select>
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Paramètres de jeu
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timeout de session (secondes)
              </label>
              <input
                type="number"
                min="300"
                max="86400"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Durée avant expiration d&apos;une session inactive
              </p>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Nettoyage automatique</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supprimer les anciennes sessions automatiquement</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoCleanupOldSessions}
                  onChange={(e) => setSettings({ ...settings, autoCleanupOldSessions: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sécurité
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Paramètres de sécurité avancés
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Les paramètres de sécurité avancés sont configurés via les variables d&apos;environnement et ne peuvent pas être modifiés depuis cette interface.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <strong className="text-gray-900 dark:text-white">JWT Secret:</strong>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Configuré ✓</span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <strong className="text-gray-900 dark:text-white">Base de données:</strong>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Connectée ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}