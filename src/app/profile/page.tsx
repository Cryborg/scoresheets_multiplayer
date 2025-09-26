'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { THEME } from '@/lib/theme';

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    // Récupérer l'ID de l'utilisateur connecté et rediriger vers son profil
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');

        if (response.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.user?.id) {
            router.replace(`/profile/${data.user.id}`);
          } else {
            router.push('/auth/login');
          }
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        router.push('/auth/login');
      }
    };

    fetchCurrentUser();
  }, [router]);

  // Afficher un loader pendant la redirection
  return (
    <div className={`min-h-screen flex items-center justify-center ${THEME.classes.pageBackground}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}