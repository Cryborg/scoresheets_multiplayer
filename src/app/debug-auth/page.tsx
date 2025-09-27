'use client';

import { useState, useEffect, useCallback } from 'react';
import { isAuthenticated } from '@/lib/authClient';
import { THEME } from '@/lib/theme';

export default function DebugAuthPage() {
  const [authState, setAuthState] = useState({
    isAuth: false,
    cookies: '',
    currentUserId: null,
    sessionData: null
  });

  const [sessionId, setSessionId] = useState('1');

  const checkAuth = useCallback(async () => {
    const isAuth = isAuthenticated();
    const cookies = typeof window !== 'undefined' ? document.cookie : '';
    
    try {
      // Test realtime API call
      const response = await fetch(`/api/sessions/${sessionId}/realtime`);
      const data = response.ok ? await response.json() : null;
      
      setAuthState({
        isAuth,
        cookies,
        currentUserId: data?.currentUserId || null,
        sessionData: data
      });
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        isAuth,
        cookies,
        currentUserId: null,
        sessionData: { error: error.message }
      });
    }
  }, [sessionId]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className={`min-h-screen ${THEME.classes.pageBackground} p-8`}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Debug Authentification
        </h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">État actuel</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session ID à tester
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={checkAuth}
                className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Vérifier
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Client-side Auth</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  isAuthenticated(): {String(authState.isAuth)}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Server-side Auth</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  currentUserId: {String(authState.currentUserId)}
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Cookies</h3>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                {authState.cookies || 'Aucun cookie'}
              </pre>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Session Data</h3>
              <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto max-h-96">
                {JSON.stringify(authState.sessionData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Comment tester le bug
          </h3>
          <ol className="list-decimal list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            <li>Ouvrir cette page dans un navigateur et se connecter</li>
            <li>Ouvrir cette page dans un autre navigateur/onglet privé et se connecter avec un autre compte</li>
            <li>Comparer les currentUserId retournés</li>
            <li>Tester les permissions d&apos;édition dans chaque navigateur</li>
          </ol>
        </div>
      </div>
    </div>
  );
}