'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, Play, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, ArrowLeft, Info
} from 'lucide-react';
import { THEME } from '@/lib/theme';

interface MigrationStatus {
  databaseExists: boolean;
  missingTables: string[];
  existingTables: string[];
  needsInit: boolean;
  error?: string;
}

export default function MigrationsPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const checkDatabaseStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/migrate');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        console.error('Failed to check database status');
      }
    } catch (error) {
      console.error('Error checking database status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (force = false) => {
    setMigrating(true);
    setResult(null);
    try {
      const response = await fetch('/api/admin/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Migration réussie: ${data.message}`);
        await checkDatabaseStatus(); // Refresh status
      } else {
        setResult(`❌ Migration échouée: ${data.error || data.details}`);
      }
    } catch (error) {
      setResult(`❌ Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen ${THEME.classes.pageBackground} flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Vérification de l&apos;état de la base de données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400 cursor-pointer"
            title="Retour au tableau de bord"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Migrations de base de données
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Gestion et initialisation de la base de données
            </p>
          </div>
        </div>
        <button
          onClick={checkDatabaseStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Database Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="h-5 w-5" />
            État de la base de données
          </h2>

          {status && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center gap-3">
                {status.databaseExists ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <span className="text-green-700 dark:text-green-400 font-medium">
                      Base de données initialisée
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    <span className="text-red-700 dark:text-red-400 font-medium">
                      Base de données non initialisée
                    </span>
                  </>
                )}
              </div>

              {/* Tables Status */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Missing Tables */}
                {status.missingTables.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Tables manquantes ({status.missingTables.length})
                    </h3>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                      {status.missingTables.map(table => (
                        <li key={table} className="font-mono">• {table}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Existing Tables */}
                {status.existingTables.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Tables existantes ({status.existingTables.length})
                    </h3>
                    <div className="text-sm text-green-600 dark:text-green-400 max-h-32 overflow-y-auto">
                      <ul className="space-y-1">
                        {status.existingTables.map(table => (
                          <li key={table} className="font-mono">• {table}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Play className="h-5 w-5" />
            Actions
          </h2>

          <div className="space-y-4">
            {/* Migration Button */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Initialiser la base de données
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Crée les tables et initialise les données de base
                </p>
              </div>
              <button
                onClick={() => runMigration(false)}
                disabled={migrating || (!status?.needsInit && status?.databaseExists)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                    Migration...
                  </>
                ) : (
                  'Lancer migration'
                )}
              </button>
            </div>

            {/* Force Migration */}
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Migration forcée
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Réinitialise complètement la base de données (⚠️ Danger)
                </p>
              </div>
              <button
                onClick={() => runMigration(true)}
                disabled={migrating}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {migrating ? 'Migration...' : 'Forcer migration'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Résultat
            </h2>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <pre className="text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {result}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">
              À propos des migrations
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Les migrations sont automatiquement exécutées au premier démarrage. 
              Utilisez cette page uniquement si vous rencontrez des problèmes ou 
              pour une réinitialisation complète en développement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}