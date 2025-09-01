/**
 * Cookie consent management for GDPR compliance
 */

export type ConsentLevel = 'essential' | 'preferences' | 'all';

export interface ConsentSettings {
  essential: boolean;      // Always true - required for app to function
  preferences: boolean;    // Dashboard filters, last played game, etc.
  analytics: boolean;      // Future: Google Analytics, etc.
}

const CONSENT_STORAGE_KEY = 'cookie-consent';
const CONSENT_VERSION = '1.0';

// Default consent (essential only)
const DEFAULT_CONSENT: ConsentSettings = {
  essential: true,
  preferences: false,
  analytics: false
};

export interface StoredConsent extends ConsentSettings {
  version: string;
  timestamp: string;
}

/**
 * Get current consent settings from localStorage
 */
export function getConsent(): ConsentSettings {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      const parsed: StoredConsent = JSON.parse(stored);
      // Check if version matches (for future consent updates)
      if (parsed.version === CONSENT_VERSION) {
        return {
          essential: parsed.essential,
          preferences: parsed.preferences,
          analytics: parsed.analytics
        };
      }
    }
  } catch (error) {
    console.warn('Error reading consent settings:', error);
  }
  
  return DEFAULT_CONSENT;
}

/**
 * Save consent settings to localStorage
 */
export function saveConsent(settings: ConsentSettings): void {
  try {
    const toStore: StoredConsent = {
      ...settings,
      essential: true, // Always true
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.warn('Error saving consent settings:', error);
  }
}

/**
 * Check if user has given consent for a specific category
 */
export function hasConsent(category: keyof ConsentSettings): boolean {
  const consent = getConsent();
  return consent[category];
}

/**
 * Check if consent banner should be shown
 */
export function shouldShowConsentBanner(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return !stored; // Show if no consent stored
  } catch (error) {
    return true; // Show if can't read localStorage
  }
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): ConsentSettings {
  const settings: ConsentSettings = {
    essential: true,
    preferences: true,
    analytics: true
  };
  saveConsent(settings);
  return settings;
}

/**
 * Accept only essential cookies
 */
export function acceptEssentialOnly(): ConsentSettings {
  const settings: ConsentSettings = {
    essential: true,
    preferences: false,
    analytics: false
  };
  saveConsent(settings);
  return settings;
}

/**
 * Safe localStorage wrapper that respects consent
 */
export const safeStorage = {
  getItem: (key: string, category: keyof ConsentSettings = 'preferences') => {
    if (!hasConsent(category)) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  setItem: (key: string, value: string, category: keyof ConsentSettings = 'preferences') => {
    if (!hasConsent(category)) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  removeItem: (key: string, category: keyof ConsentSettings = 'preferences') => {
    if (!hasConsent(category)) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};