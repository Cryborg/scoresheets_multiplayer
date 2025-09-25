/**
 * Client-side authentication utilities
 */

/**
 * Checks if user is authenticated by validating the token
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for auth-check cookie (non-httpOnly)
    const authCheck = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-check='))
      ?.split('=')[1];
    
    return authCheck === '1';
  } catch {
    return false;
  }
}

/**
 * Redirects to login page
 */
export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/auth/login';
  }
}

/**
 * Global fetch wrapper that handles authentication errors
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Add guest ID header for consistency with session creation
  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    ...options.headers as Record<string, string>
  };

  // Add guest ID header if user is not authenticated
  if (typeof window !== 'undefined' && !isAuthenticated()) {
    // Import guest auth utilities
    const { isGuest, getGuestId } = await import('./guestAuth');
    if (isGuest()) {
      headers['X-Guest-Id'] = getGuestId().toString();
    }
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers
  });
  
  if (response.status === 401) {
    // Let AuthGuard handle the redirect
    throw new Error('Non autorisé');
  }
  
  return response;
}