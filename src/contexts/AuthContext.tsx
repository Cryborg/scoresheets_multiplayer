'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useApiCall } from '@/hooks/useApiCall';

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

  const checkAuthStatus = async () => {
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
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

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