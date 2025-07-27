'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BRANDING } from '@/lib/branding';

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='));

    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router, mounted]);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {BRANDING.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {BRANDING.loading.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {BRANDING.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {BRANDING.loading.redirect}
        </p>
      </div>
    </div>
  );
}