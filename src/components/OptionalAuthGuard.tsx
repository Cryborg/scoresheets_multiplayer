'use client';

import { useEffect, useState } from 'react';
import { isAuthenticated } from '@/lib/authClient';

interface OptionalAuthGuardProps {
  children: (isAuthenticated: boolean) => React.ReactNode;
}

export default function OptionalAuthGuard({ children }: OptionalAuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuth(authenticated);
      setIsChecking(false);
    };

    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    );
  }

  return <>{children(isAuth)}</>;
}