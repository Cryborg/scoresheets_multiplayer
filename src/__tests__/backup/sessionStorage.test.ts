/**
 * Tests pour le gestionnaire de persistance des sessions
 */

import { sessionStorage, useSessionPersistence, attemptSessionReconnection } from '@/lib/sessionStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch pour attemptSessionReconnection
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('SessionStorageManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Basic session operations', () => {
    it('should save and retrieve session data', () => {
      const sessionData = {
        sessionId: 'test-123',
        gameSlug: 'yams',
        sessionCode: 'ABCD12',
        playerName: 'Test Player',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      sessionStorage.saveSession(sessionData);
      const retrieved = sessionStorage.getSession('test-123');

      expect(retrieved).toEqual(expect.objectContaining({
        sessionId: 'test-123',
        gameSlug: 'yams',
        sessionCode: 'ABCD12',
        playerName: 'Test Player'
      }));
      expect(retrieved?.lastActivity).toBeDefined();
    });

    it('should return null for non-existent session', () => {
      const result = sessionStorage.getSession('non-existent');
      expect(result).toBeNull();
    });

    it('should update session activity', () => {
      const sessionData = {
        sessionId: 'test-123',
        gameSlug: 'yams',
        sessionCode: 'ABCD12',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date('2023-01-01').toISOString()
      };

      sessionStorage.saveSession(sessionData);
      
      const beforeUpdate = sessionStorage.getSession('test-123');
      
      // Attendre un peu pour s'assurer que le timestamp change
      const futureTime = new Date(Date.now() + 1000).toISOString();
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(futureTime);
      
      sessionStorage.updateSessionActivity('test-123');
      
      const afterUpdate = sessionStorage.getSession('test-123');
      
      expect(afterUpdate?.lastActivity).not.toBe(beforeUpdate?.lastActivity);
      expect(afterUpdate?.lastActivity).toBe(futureTime);
    });

    it('should remove session', () => {
      const sessionData = {
        sessionId: 'test-123',
        gameSlug: 'yams',
        sessionCode: 'ABCD12',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      sessionStorage.saveSession(sessionData);
      expect(sessionStorage.getSession('test-123')).not.toBeNull();

      sessionStorage.removeSession('test-123');
      expect(sessionStorage.getSession('test-123')).toBeNull();
    });
  });

  describe('Session management', () => {
    it('should get recent sessions ordered by last activity', () => {
      const now = Date.now();
      
      const sessions = [
        {
          sessionId: 'old-session',
          gameSlug: 'yams',
          sessionCode: 'OLD123',
          joinedAt: new Date(now - 3600000).toISOString(), // 1 hour ago
          lastActivity: new Date(now - 3600000).toISOString()
        },
        {
          sessionId: 'recent-session',
          gameSlug: 'tarot',
          sessionCode: 'NEW456',
          joinedAt: new Date(now - 1800000).toISOString(), // 30 min ago
          lastActivity: new Date(now - 1800000).toISOString()
        },
        {
          sessionId: 'newest-session',
          gameSlug: 'bridge',
          sessionCode: 'NEW789',
          joinedAt: new Date(now).toISOString(), // now
          lastActivity: new Date(now).toISOString()
        }
      ];

      sessions.forEach(session => sessionStorage.saveSession(session));

      const recent = sessionStorage.getRecentSessions(3);
      
      expect(recent).toHaveLength(3);
      expect(recent[0].sessionId).toBe('newest-session');
      expect(recent[1].sessionId).toBe('recent-session');
      expect(recent[2].sessionId).toBe('old-session');
    });

    it('should limit the number of recent sessions returned', () => {
      // Créer 5 sessions
      for (let i = 0; i < 5; i++) {
        sessionStorage.saveSession({
          sessionId: `session-${i}`,
          gameSlug: 'yams',
          sessionCode: `CODE${i}`,
          joinedAt: new Date(Date.now() - i * 1000).toISOString(),
          lastActivity: new Date(Date.now() - i * 1000).toISOString()
        });
      }

      const recent = sessionStorage.getRecentSessions(3);
      expect(recent).toHaveLength(3);
    });

    it('should clean expired sessions when loading', () => {
      const now = Date.now();
      const expiredTime = now - (8 * 24 * 60 * 60 * 1000); // 8 days ago (> 7 days expiry)
      const validTime = now - (6 * 24 * 60 * 60 * 1000); // 6 days ago (< 7 days expiry)

      const expiredSession = {
        sessionId: 'expired-session',
        gameSlug: 'yams',
        sessionCode: 'EXP123',
        joinedAt: new Date(expiredTime).toISOString(),
        lastActivity: new Date(expiredTime).toISOString()
      };

      const validSession = {
        sessionId: 'valid-session',
        gameSlug: 'tarot',
        sessionCode: 'VAL456',
        joinedAt: new Date(validTime).toISOString(),
        lastActivity: new Date(validTime).toISOString()
      };

      // Sauvegarder directement dans localStorage pour simuler des anciennes données
      const sessions = {
        'expired-session': expiredSession,
        'valid-session': validSession
      };
      localStorageMock.setItem('scoresheets_sessions', JSON.stringify(sessions));

      // Récupérer les sessions récentes devrait déclencher le nettoyage
      const recent = sessionStorage.getRecentSessions();

      expect(recent).toHaveLength(1);
      expect(recent[0].sessionId).toBe('valid-session');
      expect(sessionStorage.getSession('expired-session')).toBeNull();
    });
  });

  describe('Reconnection logic', () => {
    it('should allow reconnection for recent sessions', () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      const sessionData = {
        sessionId: 'recent-session',
        gameSlug: 'yams',
        sessionCode: 'REC123',
        joinedAt: recentTime.toISOString(),
        lastActivity: recentTime.toISOString()
      };

      sessionStorage.saveSession(sessionData);
      expect(sessionStorage.canReconnect('recent-session')).toBe(true);
    });

    it('should not allow reconnection for old sessions', () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      
      const sessionData = {
        sessionId: 'old-session',
        gameSlug: 'yams',
        sessionCode: 'OLD123',
        joinedAt: oldTime.toISOString(),
        lastActivity: oldTime.toISOString()
      };

      sessionStorage.saveSession(sessionData);
      expect(sessionStorage.canReconnect('old-session')).toBe(false);
    });

    it('should not allow reconnection for non-existent sessions', () => {
      expect(sessionStorage.canReconnect('non-existent')).toBe(false);
    });
  });

  describe('Storage limits', () => {
    it('should limit stored sessions to maximum count', () => {
      // Créer plus de sessions que la limite (MAX_STORED_SESSIONS = 10)
      for (let i = 0; i < 15; i++) {
        const time = new Date(Date.now() - i * 1000).toISOString();
        sessionStorage.saveSession({
          sessionId: `session-${i}`,
          gameSlug: 'yams',
          sessionCode: `CODE${i}`,
          joinedAt: time,
          lastActivity: time
        });
      }

      const allSessions = sessionStorage.getRecentSessions(20); // Demander plus que stocké
      expect(allSessions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem pour throw une erreur
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const sessionData = {
        sessionId: 'test-session',
        gameSlug: 'yams',
        sessionCode: 'TEST123',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };

      // Ne devrait pas throw d'erreur
      expect(() => sessionStorage.saveSession(sessionData)).not.toThrow();

      // Restaurer la méthode originale
      localStorageMock.setItem = originalSetItem;
    });

    it('should handle corrupted localStorage data', () => {
      // Corrompre les données localStorage
      localStorageMock.setItem('scoresheets_sessions', 'invalid json');

      // Ne devrait pas throw d'erreur et retourner des données par défaut
      expect(() => sessionStorage.getRecentSessions()).not.toThrow();
      expect(sessionStorage.getRecentSessions()).toEqual([]);
    });
  });
});

describe('attemptSessionReconnection', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should return true for active sessions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'active' })
    } as Response);

    const result = await attemptSessionReconnection('test-session');
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/sessions/test-session/status');
  });

  it('should return true for waiting sessions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'waiting' })
    } as Response);

    const result = await attemptSessionReconnection('test-session');
    expect(result).toBe(true);
  });

  it('should return false for completed sessions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed' })
    } as Response);

    const result = await attemptSessionReconnection('test-session');
    expect(result).toBe(false);
  });

  it('should return false for failed requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response);

    const result = await attemptSessionReconnection('test-session');
    expect(result).toBe(false);
  });

  it('should return false for network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await attemptSessionReconnection('test-session');
    expect(result).toBe(false);
  });
});

describe('useSessionPersistence hook', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should provide session persistence functionality', () => {
    // Note: Ce test nécessiterait renderHook de @testing-library/react
    // pour tester le hook complet, mais nous testons ici la logique de base
    
    const sessionData = {
      sessionId: 'hook-test',
      gameSlug: 'yams',
      sessionCode: 'HOOK123',
      playerName: 'Hook Player',
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    sessionStorage.saveSession(sessionData);
    
    const retrieved = sessionStorage.getSession('hook-test');
    expect(retrieved?.playerName).toBe('Hook Player');
    
    const canReconnect = sessionStorage.canReconnect('hook-test');
    expect(canReconnect).toBe(true);
  });
});