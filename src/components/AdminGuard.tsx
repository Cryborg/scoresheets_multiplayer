'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/authClient';
import { useApiCall } from '@/hooks/useApiCall';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const { get } = useApiCall();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        if (!isAuthenticated()) {
          router.push('/auth/login');
          return;
        }

        // Use fast admin check API (no database initialization)
        const response = await get<{isAuthenticated: boolean, isAdmin: boolean}>('/api/admin/check', {
          context: 'admin',
          suppressToast: true // Silent admin check
        });

        if (!response.data.isAuthenticated || !response.data.isAdmin) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
        setIsChecking(false);
      } catch (error) {
        // Error already logged by useApiCall, just redirect
        router.push('/dashboard');
      }
    };

    checkAdminAccess();
  }, [router]);

  if (isChecking || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Vérification des droits administrateur...</div>
      </div>
    );
  }

  return <>{children}</>;
}