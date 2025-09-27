'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useApiCall } from '@/hooks/useApiCall';
import { syncService } from '@/lib/sync-service';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface User {
  id: number;
  username: string;
  email: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { get } = useApiCall();
  const { isOnline } = useNetworkStatus();

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await get<{user: User}>('/api/auth/me', {
        context: 'auth',
        suppressToast: true // Ne pas afficher de toast pour la vérification auth
      });
      setUser(response.data.user);
    } catch {
      // Silent fail pour l'auth check - l'utilisateur n'est juste pas connecté
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [get]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Gestion du service de synchronisation
  useEffect(() => {
    if (isOnline && user) {
      // Démarre la sync seulement si l'utilisateur est connecté et en ligne
      syncService.start();
    } else {
      // Arrête la sync si hors ligne ou non connecté
      syncService.stop();
    }

    // Cleanup à la destruction du contexte
    return () => {
      syncService.stop();
    };
  }, [isOnline, user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}