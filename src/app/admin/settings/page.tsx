'use client';

import { useState, useEffect } from 'react';
import { Save, Database, Shield, Globe, Palette } from 'lucide-react';
import Toggle from '@/components/ui/Toggle';
import { FormField, TextInput, Select } from '@/components/ui/FormField';
import { notify } from '@/lib/toast';

interface AppSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultTheme: 'light' | 'dark' | 'system';
  autoCleanupOldSessions: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    siteName: 'Oh Sheet!',
    siteDescription: 'Score like a pro',
    maintenanceMode: false,
    allowRegistration: true,
    defaultTheme: 'system',
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
      notify.success(result.message);
    } catch (error) {
      console.error('Error saving settings:', error);
      notify.error('Erreur lors de la sauvegarde: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSaving(false);
    }
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
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Paramètres généraux
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Nom du site">
              <TextInput
                value={settings.siteName}
                onChange={(value) => setSettings({ ...settings, siteName: value })}
                placeholder="Oh Sheet!"
              />
            </FormField>

            <FormField label="Description du site">
              <TextInput
                value={settings.siteDescription}
                onChange={(value) => setSettings({ ...settings, siteDescription: value })}
                placeholder="Score like a pro"
              />
            </FormField>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Toggle
              checked={settings.maintenanceMode}
              onChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              label="Mode maintenance"
              description="Désactiver l'accès public au site"
              variant="warning"
            />

            <Toggle
              checked={settings.allowRegistration}
              onChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
              label="Autoriser les inscriptions"
              description="Permettre aux nouveaux utilisateurs de s'inscrire"
            />
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
          
          <FormField label="Thème par défaut">
            <Select
              value={settings.defaultTheme}
              onChange={(value) => setSettings({ ...settings, defaultTheme: value as 'light' | 'dark' | 'system' })}
              options={[
                { value: 'system', label: 'Système' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' }
              ]}
            />
          </FormField>
        </div>
      </div>

      {/* Game Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Paramètres de jeu
          </h2>
          
          <Toggle
            checked={settings.autoCleanupOldSessions}
            onChange={(checked) => setSettings({ ...settings, autoCleanupOldSessions: checked })}
            label="Nettoyage automatique"
            description="Supprimer automatiquement les anciennes sessions et les comptes invités inactifs (+24h)"
          />
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