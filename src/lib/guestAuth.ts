/**
 * Guest authentication system - manages temporary guest IDs and session tracking
 */

const GUEST_ID_KEY = 'guest_user_id';
const GUEST_SESSIONS_KEY = 'guest_sessions';
const GUEST_ID_PREFIX = 9000000; // Guest IDs start from 9 million to avoid conflicts

export interface GuestSession {
  sessionId: number;
  sessionCode: string;
  gameSlug: string;
  gameName: string;
  sessionName: string;
  createdAt: string;
  role: 'host' | 'player';
}

/**
 * Get or create a unique guest ID for this browser
 */
export function getGuestId(): number {
  if (typeof window === 'undefined') return 0;
  
  const guestId = localStorage.getItem(GUEST_ID_KEY);
  
  if (!guestId) {
    // Generate a random guest ID
    const newGuestId = GUEST_ID_PREFIX + Math.floor(Math.random() * 1000000);
    localStorage.setItem(GUEST_ID_KEY, newGuestId.toString());
    return newGuestId;
  }
  
  return parseInt(guestId, 10);
}

/**
 * Track a session created or joined by a guest
 */
export function trackGuestSession(session: GuestSession): void {
  if (typeof window === 'undefined') return;
  
  const existingSessions = getGuestSessions();
  
  // Check if session already tracked
  const exists = existingSessions.some(s => s.sessionId === session.sessionId);
  if (!exists) {
    existingSessions.push(session);
    localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(existingSessions));
  }
}

/**
 * Get all sessions for the current guest
 */
export function getGuestSessions(): GuestSession[] {
  if (typeof window === 'undefined') return [];
  
  const sessionsJson = localStorage.getItem(GUEST_SESSIONS_KEY);
  if (!sessionsJson) return [];
  
  try {
    return JSON.parse(sessionsJson);
  } catch {
    return [];
  }
}

/**
 * Clear guest data (used after account creation to migrate sessions)
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(GUEST_ID_KEY);
  localStorage.removeItem(GUEST_SESSIONS_KEY);
}

/**
 * Check if current user is a guest
 */
export function isGuest(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if there's an auth token (real user) or not (guest)
  const cookies = document.cookie.split(';');
  const hasAuthToken = cookies.some(cookie => 
    cookie.trim().startsWith('auth-token=')
  );
  
  return !hasAuthToken;
}

/**
 * Get effective user ID (real user ID or guest ID)
 */
export function getEffectiveUserId(): number | null {
  if (typeof window === 'undefined') return null;
  
  if (isGuest()) {
    return getGuestId();
  }
  
  // For authenticated users, the ID will be retrieved from JWT on server side
  return null;
}