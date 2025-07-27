'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface MaintenanceStatus {
  maintenanceMode: boolean;
  isAdmin: boolean;
}

export default function MaintenanceCheck({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkMaintenance() {
      try {
        const response = await fetch('/api/admin/maintenance-check');
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          
          // Handle redirects based on maintenance status
          // Allow access to login/register pages even in maintenance mode
          const allowedPaths = ['/maintenance', '/login', '/register', '/api/auth'];
          const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));
          
          if (data.maintenanceMode && !data.isAdmin && !isAllowedPath) {
            router.push('/maintenance');
            return;
          }
          
          if (!data.maintenanceMode && pathname === '/maintenance') {
            router.push('/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking maintenance mode:', error);
        // On error, assume not in maintenance mode
        setStatus({ maintenanceMode: false, isAdmin: false });
      } finally {
        setLoading(false);
      }
    }

    checkMaintenance();
  }, [pathname, router]);

  // Show loading or maintenance page while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If in maintenance mode and not admin, don't render children (except for allowed paths)
  const allowedPaths = ['/maintenance', '/login', '/register'];
  const isAllowedPath = allowedPaths.some(path => pathname.startsWith(path));
  
  if (status?.maintenanceMode && !status?.isAdmin && !isAllowedPath) {
    return null; // Router will handle the redirect
  }

  return <>{children}</>;
}