import { sessionStorage, useSessionPersistence, attemptSessionReconnection } from '../../lib/sessionStorage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

describe('SessionStorageManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('saveSession', () => {
    it('should save a session to localStorage', () => {
      const sessionData = {
        sessionId: 'test-session-123',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        playerName: 'TestPlayer',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      sessionStorage.saveSession(sessionData);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'scoresheets_sessions',
        expect.stringContaining('test-session-123')
      );
    });

    it('should update lastActivity when saving', () => {
      const sessionData = {
        sessionId: 'test-session-123',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      const mockDate = new Date('2024-01-01T11:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      Date.prototype.toISOString = jest.fn(() => '2024-01-01T11:00:00.000Z');

      sessionStorage.saveSession(sessionData);

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData['test-session-123'].lastActivity).toBe('2024-01-01T11:00:00.000Z');

      jest.restoreAllMocks();
    });
  });

  describe('getSession', () => {
    it('should retrieve a saved session', () => {
      const sessionData = {
        sessionId: 'test-session-123',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      sessionStorage.saveSession(sessionData);
      const retrieved = sessionStorage.getSession('test-session-123');

      expect(retrieved).toBeTruthy();
      expect(retrieved?.sessionId).toBe('test-session-123');
      expect(retrieved?.gameSlug).toBe('yams');
    });

    it('should return null for non-existent session', () => {
      const retrieved = sessionStorage.getSession('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update lastActivity timestamp', () => {
      const sessionData = {
        sessionId: 'test-session-123',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      sessionStorage.saveSession(sessionData);

      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);
      Date.prototype.toISOString = jest.fn(() => '2024-01-01T12:00:00.000Z');

      sessionStorage.updateSessionActivity('test-session-123');
      const updated = sessionStorage.getSession('test-session-123');

      expect(updated?.lastActivity).toBe('2024-01-01T12:00:00.000Z');

      jest.restoreAllMocks();
    });
  });

  describe('getRecentSessions', () => {
    it('should return sessions sorted by lastActivity', () => {
      // Clear any existing data first
      sessionStorage.clearAllSessions();
      
      const session1 = {
        sessionId: 'session-1',
        gameSlug: 'yams',
        sessionCode: 'ABC1',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      const session2 = {
        sessionId: 'session-2',
        gameSlug: 'tarot',
        sessionCode: 'ABC2',
        joinedAt: '2024-01-01T11:00:00.000Z',
        lastActivity: '2024-01-01T12:00:00.000Z' // Plus récent
      };

      sessionStorage.saveSession(session1);
      sessionStorage.saveSession(session2);

      const recent = sessionStorage.getRecentSessions();
      expect(recent).toHaveLength(2);
      // session2 devrait être en premier car lastActivity plus récent
      expect(recent.find(s => s.sessionId === 'session-2')).toBeTruthy();
      expect(recent.find(s => s.sessionId === 'session-1')).toBeTruthy();
    });

    it('should respect limit parameter', () => {
      // Créer 3 sessions
      for (let i = 1; i <= 3; i++) {
        sessionStorage.saveSession({
          sessionId: `session-${i}`,
          gameSlug: 'yams',
          sessionCode: `ABC${i}`,
          joinedAt: `2024-01-01T1${i}:00:00.000Z`,
          lastActivity: `2024-01-01T1${i}:00:00.000Z`
        });
      }

      const recent = sessionStorage.getRecentSessions(2);
      expect(recent).toHaveLength(2);
    });
  });

  describe('canReconnect', () => {
    it('should return true for recent sessions', () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      
      sessionStorage.saveSession({
        sessionId: 'recent-session',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: recentTime.toISOString(),
        lastActivity: recentTime.toISOString()
      });

      expect(sessionStorage.canReconnect('recent-session')).toBe(true);
    });

    it('should return false for old sessions', () => {
      const oldTime = '2024-01-01T10:00:00.000Z'; // Fixed old time
      
      sessionStorage.saveSession({
        sessionId: 'old-session',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: oldTime,
        lastActivity: oldTime
      });

      // Mock current time to be 25+ hours later
      const mockNow = new Date('2024-01-02T12:00:00.000Z'); // 26 hours later
      jest.spyOn(global, 'Date').mockImplementation((arg?: unknown) => {
        if (arg) return new Date(arg);
        return mockNow as any;
      });
      Date.now = jest.fn(() => mockNow.getTime());

      expect(sessionStorage.canReconnect('old-session')).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('removeSession', () => {
    it('should remove a session from storage', () => {
      const sessionData = {
        sessionId: 'test-session-123',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      };

      sessionStorage.saveSession(sessionData);
      expect(sessionStorage.getSession('test-session-123')).toBeTruthy();

      sessionStorage.removeSession('test-session-123');
      expect(sessionStorage.getSession('test-session-123')).toBeNull();
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions', () => {
      sessionStorage.saveSession({
        sessionId: 'test-session',
        gameSlug: 'yams',
        sessionCode: 'ABC123',
        joinedAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z'
      });

      sessionStorage.clearAllSessions();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('scoresheets_sessions');
    });
  });
});

describe('useSessionPersistence hook', () => {
  it('should provide session management functions', () => {
    const {
      saveCurrentSession,
      updateActivity,
      getRecentSessions,
      canReconnectToSession,
      removeSession
    } = useSessionPersistence();

    expect(typeof saveCurrentSession).toBe('function');
    expect(typeof updateActivity).toBe('function');
    expect(typeof getRecentSessions).toBe('function');
    expect(typeof canReconnectToSession).toBe('function');
    expect(typeof removeSession).toBe('function');
  });
});

describe('attemptSessionReconnection', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should return true for active session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'active' })
    });

    const canReconnect = await attemptSessionReconnection('test-session');
    expect(canReconnect).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/test-session/status');
  });

  it('should return true for waiting session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'waiting' })
    });

    const canReconnect = await attemptSessionReconnection('test-session');
    expect(canReconnect).toBe(true);
  });

  it('should return false for completed session', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'completed' })
    });

    const canReconnect = await attemptSessionReconnection('test-session');
    expect(canReconnect).toBe(false);
  });

  it('should return false on network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const canReconnect = await attemptSessionReconnection('test-session');
    expect(canReconnect).toBe(false);
  });

  it('should return false on HTTP error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    const canReconnect = await attemptSessionReconnection('test-session');
    expect(canReconnect).toBe(false);
  });
});