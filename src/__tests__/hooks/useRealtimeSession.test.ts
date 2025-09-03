import { renderHook } from '@testing-library/react';
import { useRealtimeSession } from '../../hooks/useRealtimeSession';

// Mock usePollingService
jest.mock('../../hooks/usePollingService', () => ({
  usePollingService: jest.fn()
}));

// Mock useVisibilityOptimization
jest.mock('../../hooks/useVisibilityOptimization', () => ({
  useVisibilityOptimization: jest.fn()
}));

// Mock authHelper
jest.mock('../../lib/authHelper', () => ({
  getUserId: jest.fn()
}));

import { usePollingService } from '../../hooks/usePollingService';
import { useVisibilityOptimization } from '../../hooks/useVisibilityOptimization';
import { getUserId } from '../../lib/authHelper';

const mockUsePollingService = usePollingService as jest.MockedFunction<typeof usePollingService>;
const mockUseVisibilityOptimization = useVisibilityOptimization as jest.MockedFunction<typeof useVisibilityOptimization>;
const mockGetUserId = getUserId as jest.MockedFunction<typeof getUserId>;

describe('useRealtimeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default returns
    mockUseVisibilityOptimization.mockReturnValue({
      isVisible: true,
      interval: 2000
    });

    mockGetUserId.mockResolvedValue(123);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with loading state', () => {
    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      lastFetch: null
    });

    const { result } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStatus).toBe('Connexion à la partie...');
    expect(result.current.error).toBeNull();
  });

  it('should handle successful session data', () => {
    const mockSessionData = {
      session: {
        id: 1,
        session_name: 'Test Game',
        status: 'active' as const,
        players: [
          { id: 1, player_name: 'Alice', position: 0 }
        ]
      },
      events: [
        { id: 1, event_type: 'player_joined', event_data: '{}', created_at: new Date().toISOString() }
      ]
    };

    mockUsePollingService.mockReturnValue({
      data: mockSessionData,
      isLoading: false,
      error: null,
      lastFetch: new Date().toISOString()
    });

    const { result } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.session).toBe(mockSessionData.session);
    expect(result.current.events).toBe(mockSessionData.events);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe('Connecté');
  });

  it('should handle error states', () => {
    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Failed to fetch',
      lastFetch: null
    });

    const { result } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBe('Failed to fetch');
    expect(result.current.connectionStatus).toContain('Erreur');
  });

  it('should set up polling with correct URL', () => {
    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      lastFetch: null
    });

    renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(mockUsePollingService).toHaveBeenCalledWith({
      url: '/api/sessions/123/realtime',
      interval: 2000,
      enabled: true,
      headers: expect.any(Object)
    });
  });

  it('should adjust interval based on visibility', () => {
    mockUseVisibilityOptimization.mockReturnValue({
      isVisible: false,
      interval: 10000 // Background interval
    });

    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      lastFetch: null
    });

    renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(mockUsePollingService).toHaveBeenCalledWith({
      url: '/api/sessions/123/realtime',
      interval: 10000, // Should use background interval
      enabled: true,
      headers: expect.any(Object)
    });
  });

  it('should handle session status changes', () => {
    const { result, rerender } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    // Initially waiting
    mockUsePollingService.mockReturnValue({
      data: {
        session: { id: 1, status: 'waiting' as const, players: [] },
        events: []
      },
      isLoading: false,
      error: null,
      lastFetch: new Date().toISOString()
    });

    rerender();

    expect(result.current.connectionStatus).toContain('En attente');

    // Then active
    mockUsePollingService.mockReturnValue({
      data: {
        session: { id: 1, status: 'active' as const, players: [{ id: 1, player_name: 'Alice', position: 0 }] },
        events: []
      },
      isLoading: false,
      error: null,
      lastFetch: new Date().toISOString()
    });

    rerender();

    expect(result.current.connectionStatus).toBe('Connecté');
  });

  it('should handle network errors gracefully', () => {
    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'NetworkError: Failed to fetch',
      lastFetch: null
    });

    const { result } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionStatus).toContain('Erreur');
    expect(result.current.error).toContain('NetworkError');
  });

  it('should return last update timestamp', () => {
    const lastFetch = new Date().toISOString();
    
    mockUsePollingService.mockReturnValue({
      data: {
        session: { id: 1, status: 'active' as const, players: [] },
        events: []
      },
      isLoading: false,
      error: null,
      lastFetch
    });

    const { result } = renderHook(() => 
      useRealtimeSession({ sessionId: '123', gameSlug: 'test-game' })
    );

    expect(result.current.lastUpdate).toBe(lastFetch);
  });

  it('should disable polling when sessionId is not provided', () => {
    mockUsePollingService.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      lastFetch: null
    });

    renderHook(() => 
      useRealtimeSession({ sessionId: '', gameSlug: 'test-game' })
    );

    expect(mockUsePollingService).toHaveBeenCalledWith({
      url: '/api/sessions//realtime',
      interval: 2000,
      enabled: false, // Should be disabled
      headers: expect.any(Object)
    });
  });
});