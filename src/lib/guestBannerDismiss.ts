/**
 * Guest banner dismiss management - respects GDPR
 * Stores dismissal with daily reset to encourage sign-ups
 */

const DISMISS_STORAGE_KEY = 'guest-banner-dismissed';

export interface BannerDismissal {
  date: string; // YYYY-MM-DD format
  dismissed: boolean;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if guest banner should be shown
 * Returns true if never dismissed or dismissed on a different day
 * Returns false during SSR to avoid hydration mismatch
 */
export function shouldShowGuestBanner(): boolean {
  // Avoid hydration mismatch by returning false on server
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!stored) {
      return true; // Never dismissed
    }

    const dismissal: BannerDismissal = JSON.parse(stored);
    const today = getTodayDate();

    // Show banner if dismissed on a different day
    return dismissal.date !== today;
  } catch (error) {
    console.warn('Error reading guest banner dismissal:', error);
    return true; // Show on error
  }
}

/**
 * Mark guest banner as dismissed for today
 */
export function dismissGuestBanner(): void {
  if (typeof window === 'undefined') {
    return; // Skip on server
  }

  try {
    const dismissal: BannerDismissal = {
      date: getTodayDate(),
      dismissed: true
    };

    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(dismissal));
  } catch (error) {
    console.warn('Error saving guest banner dismissal:', error);
    // Fail silently - banner will keep showing
  }
}

/**
 * Force show guest banner (for testing or admin purposes)
 */
export function resetGuestBannerDismissal(): void {
  if (typeof window === 'undefined') {
    return; // Skip on server
  }

  try {
    localStorage.removeItem(DISMISS_STORAGE_KEY);
  } catch (error) {
    console.warn('Error resetting guest banner dismissal:', error);
  }
}