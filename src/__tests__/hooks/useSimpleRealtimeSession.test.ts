/**
 * Tests pour le hook useSimpleRealtimeSession refactorisé
 * Vérifie l'orchestration des hooks spécialisés
 */

import { renderHook, act } from '@testing-library/react';
import { useSimpleRealtimeSession } from '@/hooks/useSimpleRealtimeSession';

// Mock des hooks spécialisés
jest.mock('@/hooks/usePollingService', () => ({
  usePollingService: jest.fn(() => ({
    isPolling: true,
    startPolling: jest.fn(),
    stopPolling: jest.fn()
  }))
}));

jest.mock('@/hooks/useVisibilityOptimization', () => ({
  useVisibilityOptimization: jest.fn(() => ({
    state: {
      isVisible: true,
      isActive: true,
      shouldPause: false,
      timeSinceLastActivity: 0
    },
    updateActivity: jest.fn(),
    getAdaptiveMultiplier: jest.fn(() => 1)
  }))
}));

jest.mock('@/hooks/useConnectionManager', () => ({
  useConnectionManager: jest.fn(() => ({
    state: {
      isConnected: true,
      connectionStatus: 'connected',
      error: null,
      retryCount: 0,
      consecutiveFailures: 0,
      isCircuitOpen: false
    },
    handleSuccess: jest.fn(),
    handleError: jest.fn(),
    reset: jest.fn(),
    shouldRetry: jest.fn(() => true),
    getRetryDelay: jest.fn(() => 1000)
  }))
}));

// Mock des dépendances
jest.mock('@/lib/guestAuth', () => ({
  getGuestId: jest.fn(() => 12345)
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useSimpleRealtimeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({ sessionId: 'test-session' })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.events).toEqual([]);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.currentUserId).toBeNull();
    expect(result.current.isLocalSession).toBe(false);
  });

  it('should use specialized hooks with correct configurations', () => {
    const { usePollingService } = require('@/hooks/usePollingService');
    const { useVisibilityOptimization } = require('@/hooks/useVisibilityOptimization');
    const { useConnectionManager } = require('@/hooks/useConnectionManager');

    renderHook(() =>
      useSimpleRealtimeSession({
        sessionId: 'test-session',
        gameSlug: 'test-game',
        pollInterval: 3000
      })
    );

    // Vérifier que les hooks sont appelés avec les bonnes configurations
    expect(useVisibilityOptimization).toHaveBeenCalledWith({
      pauseOnHidden: true,
      onActivityChange: expect.any(Function)
    });

    expect(useConnectionManager).toHaveBeenCalledWith({
      maxRetries: 3,
      baseDelay: 1000,
      maxConsecutiveFailures: 5,
      onError: expect.any(Function),
      onConnectionChange: expect.any(Function)
    });

    expect(usePollingService).toHaveBeenCalledWith({
      interval: expect.any(Number),
      onUpdate: expect.any(Function),
      enabled: true,
      onError: expect.any(Function)
    });
  });

  it('should provide forceRefresh functionality', () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({ sessionId: 'test-session' })
    );

    expect(typeof result.current.forceRefresh).toBe('function');
  });

  it('should provide addRound functionality', () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({ sessionId: 'test-session' })
    );

    expect(typeof result.current.addRound).toBe('function');
  });

  it('should provide deleteRound functionality', () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({ sessionId: 'test-session' })
    );

    expect(typeof result.current.deleteRound).toBe('function');
  });

  it('should handle callbacks correctly', () => {
    const onUpdate = jest.fn();
    const onError = jest.fn();
    const onConnectionChange = jest.fn();

    renderHook(() =>
      useSimpleRealtimeSession({
        sessionId: 'test-session',
        onUpdate,
        onError,
        onConnectionChange
      })
    );

    // Les callbacks sont passés correctement aux hooks spécialisés
    const { useConnectionManager } = require('@/hooks/useConnectionManager');
    const connectionManagerCall = useConnectionManager.mock.calls[0][0];

    expect(typeof connectionManagerCall.onError).toBe('function');
    expect(typeof connectionManagerCall.onConnectionChange).toBe('function');
  });

  it('should handle sessionId="new" correctly', async () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({ sessionId: 'new' })
    );

    // Force refresh shouldn't make API calls for 'new' sessions
    await act(async () => {
      await result.current.forceRefresh();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should calculate adaptive polling interval', () => {
    const { result } = renderHook(() =>
      useSimpleRealtimeSession({
        sessionId: 'test-session',
        pollInterval: 2000
      })
    );

    const { usePollingService } = require('@/hooks/usePollingService');
    const pollingCall = usePollingService.mock.calls[0][0];

    // L'intervalle devrait être calculé de façon adaptative
    expect(typeof pollingCall.interval).toBe('number');
    expect(pollingCall.interval).toBeGreaterThanOrEqual(1000); // Minimum interval
  });
});