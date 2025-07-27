'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/authClient';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        if (!isAuthenticated()) {
          router.push('/auth/login');
          return;
        }

        // Check admin status via API
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          router.push('/dashboard');
          return;
        }

        const user = await response.json();
        if (!user.is_admin) {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
        setIsChecking(false);
      } catch (error) {
        console.error('Admin check failed:', error);
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